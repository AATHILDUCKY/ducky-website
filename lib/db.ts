import 'server-only';
import { contentVersion } from './content-version';
import { Pool } from 'pg';
import { unstable_cache } from 'next/cache';
import type { Profile, Post, PostSummary, SeoSettings } from './types';
const globalDb = globalThis as unknown as { pool?: Pool };
export const pool =
  globalDb.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
    statement_timeout: 10000,
  });
if (!globalDb.pool) {
  globalDb.pool = pool;
  pool.on('error', (error) => console.error('PostgreSQL pool:', error.message));
}
export const getProfile = unstable_cache(
  async (): Promise<Profile> =>
    (await pool.query("SELECT value FROM settings WHERE key='profile'")).rows[0].value,
  ['profile', contentVersion],
  { tags: ['content'], revalidate: 3600 },
);
export const getSeo = unstable_cache(
  async (): Promise<SeoSettings> =>
    (await pool.query("SELECT value FROM settings WHERE key='seo'")).rows[0].value,
  ['seo', contentVersion],
  { tags: ['content'], revalidate: 3600 },
);
export const getPosts = unstable_cache(
  async (): Promise<PostSummary[]> =>
    (
      await pool.query(
        `SELECT id,slug,title,excerpt,category,tags,status,seo_title,seo_description,cover_id,published_at,created_at,updated_at,GREATEST(1,CEIL(cardinality(regexp_split_to_array(trim(content), '[[:space:]]+'))/220.0))::int AS read_time FROM posts WHERE status='published' AND published_at <= now() ORDER BY published_at DESC`,
      )
    ).rows,
  ['posts', contentVersion],
  { tags: ['content'], revalidate: 3600 },
);
export const getPost = unstable_cache(
  async (slug: string): Promise<Post | undefined> =>
    (
      await pool.query(
        "SELECT * FROM posts WHERE slug=$1 AND status='published' AND published_at <= now()",
        [slug],
      )
    ).rows[0],
  ['post', contentVersion],
  { tags: ['content'], revalidate: 3600 },
);
export function siteUrl() {
  return (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
}
export function readTime(content: string) {
  return Math.max(1, Math.ceil(content.split(/\s+/).length / 220));
}
