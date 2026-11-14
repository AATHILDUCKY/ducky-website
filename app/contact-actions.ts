'use server';
import { randomUUID, createHash } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { pool } from '@/lib/db';
import { contactSchema } from '@/lib/contact-validation';
import type { ContactState } from '@/lib/contact-types';

export async function submitContactRequest(_: ContactState, form: FormData): Promise<ContactState> {
  const success = { success: true, message: 'Thank you! Your message has been sent to Aathil.' };
  // Ignore extra fields: browser autofill and older tabs can include a website value.
  // Only acknowledge delivery after the request exists in the database.
  const parsed = contactSchema.safeParse(
    Object.fromEntries(['name', 'email', 'subject', 'message'].map((k) => [k, form.get(k)])),
  );
  if (!parsed.success)
    return {
      message: 'Please check the highlighted fields.',
      errors: z.flattenError(parsed.error).fieldErrors,
    };
  const suppliedId = form.get('submissionId');
  const submissionId = z.uuid().safeParse(suppliedId).success ? String(suppliedId) : randomUUID();
  const client = await pool.connect().catch(() => null);
  if (!client) return { message: 'Your message could not be saved. Please try again shortly.' };
  try {
    await client.query('BEGIN');
    // Serialize retries for a submission so duplicate clicks never create two requests.
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [submissionId]);
    const existing = await client.query('SELECT 1 FROM contact_requests WHERE submission_id=$1', [
      submissionId,
    ]);
    if (existing.rowCount) {
      await client.query('COMMIT');
      return success;
    }
    const key = createHash('sha256').update(parsed.data.email).digest('hex');
    const rate = await client.query(
      `INSERT INTO contact_rate_limits (key) VALUES ($1)
      ON CONFLICT (key) DO UPDATE SET
      attempts=CASE WHEN contact_rate_limits.window_start < now()-interval '15 minutes' THEN 1 ELSE contact_rate_limits.attempts+1 END,
      window_start=CASE WHEN contact_rate_limits.window_start < now()-interval '15 minutes' THEN now() ELSE contact_rate_limits.window_start END
      RETURNING attempts`,
      [key],
    );
    if (rate.rows[0].attempts > 5) {
      await client.query('COMMIT');
      return { message: 'Too many messages from this email. Please try again in 15 minutes.' };
    }
    const { name, email, subject, message } = parsed.data;
    await client.query(
      'INSERT INTO contact_requests (submission_id,name,email,subject,message) VALUES ($1,$2,$3,$4,$5)',
      [submissionId, name, email, subject, message],
    );
    await client.query(
      "DELETE FROM contact_rate_limits WHERE window_start < now()-interval '1 day'",
    );
    await client.query('COMMIT');
  } catch {
    await client.query('ROLLBACK');
    return { message: 'Your message could not be saved. Please try again shortly.' };
  } finally {
    client.release();
  }
  revalidatePath('/admin', 'layout');
  return success;
}
