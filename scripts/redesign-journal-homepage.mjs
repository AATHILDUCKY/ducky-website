/** One-time, idempotent refresh of original homepage copy. Customized values stay intact. */
import { Pool } from 'pg';
import { writeFile } from 'node:fs/promises';
import { journalHomepage } from '../lib/homepage-journal.mjs';
import { upgradeHomepage } from '../lib/homepage-migration.mjs';
import { homepageSchema } from '../lib/homepage-schema.ts';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const db = await pool.connect();
try {
  await db.query('BEGIN');
  const { rows } = await db.query("SELECT value FROM settings WHERE key='homepage' FOR UPDATE");
  if (!rows[0]) throw new Error('Save an initial homepage before applying the journal design.');
  const original = rows[0].value;
  const profile = (await db.query("SELECT value FROM settings WHERE key='profile'")).rows[0].value;
  const next = homepageSchema.parse(journalHomepage(upgradeHomepage(original), profile));
  const active = homepageSchema.parse(upgradeHomepage(original));
  if (JSON.stringify(next) !== JSON.stringify(active)) {
    await writeFile('/tmp/ducky-homepage-before-journal.json', JSON.stringify(original, null, 2), {
      mode: 0o600,
    });
    await db.query(
      "UPDATE settings SET value=value || $1::jsonb, updated_at=clock_timestamp() WHERE key='homepage'",
      [JSON.stringify(next)],
    );
    console.log(
      'Journal copy and section order updated; original saved in /tmp/ducky-homepage-before-journal.json.',
    );
  } else console.log('Journal direction already applied; no changes needed.');
  await db.query('COMMIT');
} catch (error) {
  await db.query('ROLLBACK');
  throw error;
} finally {
  db.release();
  await pool.end();
}
