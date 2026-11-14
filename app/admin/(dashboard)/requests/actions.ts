'use server';
import type { ContactState } from '@/lib/contact-types';
import { requireAdmin } from '@/lib/auth';
import { pool } from '@/lib/db';
import { requestUpdateSchema } from '@/lib/contact-validation';
import { revalidatePath } from 'next/cache';
export async function updateContactRequest(
  _: { message?: string; success?: boolean },
  form: FormData,
): Promise<ContactState> {
  await requireAdmin();
  const parsed = requestUpdateSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { message: 'Check the status and keep your note under 2,000 characters.' };
  const { id, revision, status, note } = parsed.data;
  try {
    const result = await pool.query(
      `UPDATE contact_requests SET status=$1,admin_note=$2,updated_at=clock_timestamp() WHERE id=$3 AND updated_at::text=$4`,
      [status, note, id, revision],
    );
    if (!result.rowCount)
      return {
        message:
          'This request changed in another window. Copy your note, then reload to see the latest version.',
      };
  } catch {
    return { message: 'Changes could not be saved. Please try again.' };
  }
  revalidatePath('/admin', 'layout');
  return { success: true, message: 'Request updated.' };
}
