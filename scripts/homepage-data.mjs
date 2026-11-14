import { upgradeHomepage } from '../lib/homepage-migration.mjs';
import { createHomepageDefaults } from '../lib/homepage-defaults.mjs';
export async function installHomepage(db) {
  const found = await db.query("SELECT value FROM settings WHERE key='homepage'");
  if (found.rowCount) {
    const before = found.rows[0].value;
    const after = upgradeHomepage(before);
    const { projects: archivedProjects, freelance: archivedFreelance, ...activeBefore } = before;
    if (JSON.stringify(activeBefore) !== JSON.stringify(after))
      await db.query(
        "UPDATE settings SET value=value || $1::jsonb,updated_at=clock_timestamp() WHERE key='homepage'",
        [JSON.stringify(after)],
      );
    return;
  }
  const profile = (await db.query("SELECT value FROM settings WHERE key='profile'")).rows[0].value;
  const reference = (await db.query("SELECT value FROM settings WHERE key='reference.site'"))
    .rows[0].value;
  await db.query("INSERT INTO settings(key,value) VALUES('homepage',$1) ON CONFLICT DO NOTHING", [
    JSON.stringify(createHomepageDefaults(profile, reference)),
  ]);
}
