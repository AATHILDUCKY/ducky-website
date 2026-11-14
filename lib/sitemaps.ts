import 'server-only';
import { unstable_cache } from 'next/cache';
import { pool, siteUrl } from './db';
import { publicPaths, SITEMAP_SHARD_SIZE, sitemapUrls } from './sitemap-xml';
import type { ForumImage } from './forum-types';
import { forumPostPath } from './forum-slugs.mjs';
export const getSitemapFiles = unstable_cache(
  async () => {
    const [blog, forum] = await Promise.all([
      pool.query(
        `SELECT ((sitemap_id-1)/${SITEMAP_SHARD_SIZE})::text AS bucket,max(updated_at) AS modified FROM posts WHERE status='published' AND published_at<=now() GROUP BY bucket ORDER BY bucket`,
      ),
      pool.query(
        `SELECT ((sitemap_id-1)/${SITEMAP_SHARD_SIZE})::text AS bucket,max(greatest(updated_at,discussion_updated_at)) AS modified FROM forum_posts WHERE status='published' GROUP BY bucket ORDER BY bucket`,
      ),
    ]);
    return [
      { file: 'pages.xml', modified: null },
      ...blog.rows.map((row) => ({
        file: `blog-${row.bucket}.xml`,
        modified: new Date(row.modified).toISOString(),
      })),
      ...forum.rows.map((row) => ({
        file: `forum-${row.bucket}.xml`,
        modified: new Date(row.modified).toISOString(),
      })),
    ];
  },
  ['sitemap-manifest-v2-slugs'],
  { tags: ['sitemaps', 'content'], revalidate: 300 },
);
// Cache shard responses at the HTTP layer; origin always reads current publication state.
export async function getSitemapXml(file: string): Promise<string | null> {
  const base = siteUrl();
  if (file === 'pages.xml') return sitemapUrls(publicPaths.map((path) => ({ url: base + path })));
  const match = /^(blog|forum)-(\d{1,9})\.xml$/.exec(file);
  if (!match) return null;
  const start = Number(match[2]) * SITEMAP_SHARD_SIZE + 1;
  const end = start + SITEMAP_SHARD_SIZE;
  if (match[1] === 'blog') {
    const result = await pool.query(
      "SELECT slug,updated_at,cover_id FROM posts WHERE sitemap_id >= $1 AND sitemap_id < $2 AND status='published' AND published_at<=now() ORDER BY sitemap_id",
      [start, end],
    );
    return result.rows.length
      ? sitemapUrls(
          result.rows.map((row) => ({
            url: `${base}/blog/${row.slug}`,
            modified: row.updated_at,
            images: row.cover_id ? [`${base}/media/${row.cover_id}`] : [],
          })),
        )
      : null;
  }
  const result = await pool.query(
    `SELECT p.id,p.slug,p.updated_at,p.images,
    GREATEST(p.updated_at,p.discussion_updated_at) AS modified
    FROM forum_posts p WHERE sitemap_id >= $1 AND sitemap_id < $2 AND status='published' ORDER BY sitemap_id`,
    [start, end],
  );
  return result.rows.length
    ? sitemapUrls(
        result.rows.map((row) => ({
          url: base + forumPostPath(row),
          modified: row.modified,
          images: (row.images as ForumImage[]).map((image) => `${base}/media/${image.id}`),
        })),
      )
    : null;
}
