import { createForumSlug } from '../lib/forum-slugs.mjs';
export async function installForum(db) {
  while (true) {
    const rows = (
      await db.query('SELECT id,title FROM forum_posts WHERE slug IS NULL ORDER BY id LIMIT 100')
    ).rows;
    if (!rows.length) break;
    for (const row of rows)
      await db.query('UPDATE forum_posts SET slug=$2 WHERE id=$1 AND slug IS NULL', [
        row.id,
        createForumSlug(row.title, row.id),
      ]);
  }
  await db.query('ALTER TABLE forum_posts ALTER COLUMN slug SET NOT NULL');
}
