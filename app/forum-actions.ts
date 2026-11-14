'use server';
import { createHmac } from 'node:crypto';
import { headers } from 'next/headers';
import { revalidatePath, updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { isAdmin, requireAdmin } from '@/lib/auth';
import { pool } from '@/lib/db';
import { forumPostSchema, forumReplySchema } from '@/lib/forum-validation';
import type { ForumState, ForumImage } from '@/lib/forum-types';
import { forumVisitor } from '@/lib/forum-visitor';
import { createForumSlug, forumPostPath } from '@/lib/forum-slugs.mjs';

function refreshForum(id: string) {
  updateTag('forum-feed');
  updateTag('sitemaps');
  revalidatePath('/forum');
  revalidatePath('/forum/[id]', 'page');
  revalidatePath('/admin/forum');
}
export async function saveForumPost(_: ForumState, form: FormData): Promise<ForumState> {
  await requireAdmin();
  let images: unknown;
  try {
    images = JSON.parse(String(form.get('images') || '[]'));
  } catch {
    return { message: 'The image list is invalid. Please attach the images again.' };
  }
  const parsed = forumPostSchema.safeParse({ ...Object.fromEntries(form), images });
  if (!parsed.success)
    return { message: 'Please check your post.', errors: z.flattenError(parsed.error).fieldErrors };
  const p = parsed.data;
  let slug = '';
  try {
    const media = p.images.length
      ? (
          await pool.query('SELECT id,width,height FROM media WHERE id=ANY($1::uuid[])', [
            p.images.map((image) => image.id),
          ])
        ).rows
      : [];
    if (p.images.some((image) => !media.some((item) => item.id === image.id)))
      return { message: 'An attached image no longer exists. Upload it again.' };
    const images: ForumImage[] = p.images.map((image) => ({
      ...image,
      ...media.find((item) => item.id === image.id),
    }));
    const values = [p.id, p.title, p.content, p.link_url, JSON.stringify(images), p.status];
    if (p.revision) {
      const saved = await pool.query(
        `UPDATE forum_posts SET title=$2,content=$3,link_url=$4,images=$5,status=$6,updated_at=clock_timestamp() WHERE id=$1 AND updated_at=$7::timestamptz RETURNING slug`,
        [...values, p.revision],
      );
      if (!saved.rowCount)
        return { message: 'This post changed in another window. Reload it before saving again.' };
      slug = saved.rows[0].slug;
    } else {
      const saved = await pool.query(
        `INSERT INTO forum_posts(id,title,content,link_url,images,status,slug) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO NOTHING RETURNING slug`,
        [...values, createForumSlug(p.title, p.id)],
      );
      if (!saved.rowCount)
        return {
          message: 'This post was already saved. Open it from your forum to continue editing.',
        };
      slug = saved.rows[0].slug;
    }
  } catch (error) {
    console.error('Forum post save failed:', (error as { code?: string }).code || 'database error');
    return { message: 'Your post could not be saved. Your text is still here; please try again.' };
  }
  refreshForum(p.id);
  redirect(forumPostPath({ id: p.id, slug }));
}
export async function submitForumReply(_: ForumState, form: FormData): Promise<ForumState> {
  let count = 0;
  let parentCount: number | null = null;
  const parsed = forumReplySchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      message: 'Please check your reply.',
      errors: z.flattenError(parsed.error).fieldErrors,
    };
  const p = parsed.data;
  const admin = await isAdmin();
  const requestHeaders = await headers();
  const address =
    requestHeaders.get('x-forwarded-for')?.split(',')[0].trim() ||
    requestHeaders.get('x-real-ip') ||
    'local';
  const key = createHmac('sha256', process.env.SESSION_SECRET!)
    .update('forum:' + address)
    .digest('hex');
  const client = await pool.connect().catch(() => null);
  if (!client) return { message: 'Your reply could not be saved. Please try again shortly.' };
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [p.submissionId]);
    const existing = await client.query(
      "SELECT r.post_id,p.reply_count,(SELECT child_count FROM forum_replies parent WHERE parent.id=r.parent_id) AS parent_count FROM forum_replies r JOIN forum_posts p ON p.id=r.post_id WHERE r.submission_id=$1 AND p.status='published'",
      [p.submissionId],
    );
    if (existing.rowCount) {
      await client.query('COMMIT');
      return existing.rows[0].post_id === p.postId
        ? {
            success: true,
            message: 'Your reply is published.',
            count: existing.rows[0].reply_count,
            parentCount: existing.rows[0].parent_count,
          }
        : { message: 'Please reload this post and try again.' };
    }
    const post = await client.query(
      "SELECT id FROM forum_posts WHERE id=$1 AND status='published' FOR UPDATE",
      [p.postId],
    );
    if (!post.rowCount) {
      await client.query('ROLLBACK');
      return { message: 'This post is no longer open for replies.' };
    }
    if (p.parentId) {
      const parent = await client.query(
        'SELECT depth FROM forum_replies WHERE id=$1 AND post_id=$2 AND NOT hidden AND NOT hidden_by_parent',
        [p.parentId, p.postId],
      );
      if (!parent.rowCount || parent.rows[0].depth >= 32) {
        await client.query('ROLLBACK');
        return {
          message: 'This comment is unavailable for replies. Please reply to an earlier comment.',
        };
      }
    }
    if (!admin) {
      const limit = await client.query(
        `INSERT INTO forum_reply_limits(key) VALUES($1) ON CONFLICT(key) DO UPDATE SET
        attempts=CASE WHEN forum_reply_limits.window_start < now()-interval '10 minutes' THEN 1 ELSE forum_reply_limits.attempts+1 END,
        window_start=CASE WHEN forum_reply_limits.window_start < now()-interval '10 minutes' THEN now() ELSE forum_reply_limits.window_start END RETURNING attempts`,
        [key],
      );
      if (limit.rows[0].attempts > 10) {
        await client.query('COMMIT');
        return { message: 'You have sent several replies. Please try again in 10 minutes.' };
      }
    }
    await client.query(
      'INSERT INTO forum_replies(post_id,submission_id,name,content,is_author,parent_id) VALUES($1,$2,$3,$4,$5,$6)',
      [p.postId, p.submissionId, p.name, p.content, admin, p.parentId || null],
    );
    await client.query(
      "DELETE FROM forum_reply_limits WHERE window_start < now()-interval '1 day'",
    );
    const counts = (
      await client.query(
        'SELECT reply_count,(SELECT child_count FROM forum_replies WHERE id=$2 AND post_id=$1) AS parent_count FROM forum_posts WHERE id=$1',
        [p.postId, p.parentId || null],
      )
    ).rows[0];
    count = counts.reply_count;
    parentCount = counts.parent_count;
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(
      'Forum reply save failed:',
      (error as { code?: string }).code || 'database error',
    );
    return { message: 'Your reply could not be saved. Please try again shortly.' };
  } finally {
    client.release();
  }
  refreshForum(p.postId);
  return { success: true, message: 'Your reply is published.', count, parentCount };
}
export async function setForumLike(
  postId: string,
  liked: boolean,
): Promise<{ liked: boolean; count: number; error?: string }> {
  if (!z.uuid().safeParse(postId).success || typeof liked !== 'boolean')
    return { liked: false, count: 0, error: 'Invalid post.' };
  const visitor = await forumVisitor(true);
  const h = await headers();
  const address = h.get('x-forwarded-for')?.split(',')[0].trim() || h.get('x-real-ip') || 'local';
  const key = createHmac('sha256', process.env.SESSION_SECRET!)
    .update('forum-like:' + address)
    .digest('hex');
  const client = await pool.connect().catch(() => null);
  if (!client) return { liked: false, count: 0, error: 'Could not save your reaction. Try again.' };
  try {
    await client.query('BEGIN');
    const p = await client.query(
      "SELECT like_count FROM forum_posts WHERE id=$1 AND status='published' FOR UPDATE",
      [postId],
    );
    if (!p.rowCount) {
      await client.query('ROLLBACK');
      return { liked: false, count: 0, error: 'This post is no longer available.' };
    }
    const current = !!(
      await client.query('SELECT 1 FROM forum_likes WHERE post_id=$1 AND visitor_id=$2', [
        postId,
        visitor,
      ])
    ).rowCount;
    if (current !== liked) {
      const rate = await client.query(
        `INSERT INTO forum_like_limits(key) VALUES($1) ON CONFLICT(key) DO UPDATE SET
        attempts=CASE WHEN forum_like_limits.window_start<now()-interval '10 minutes' THEN 1 ELSE forum_like_limits.attempts+1 END,
        window_start=CASE WHEN forum_like_limits.window_start<now()-interval '10 minutes' THEN now() ELSE forum_like_limits.window_start END RETURNING attempts`,
        [key],
      );
      if (rate.rows[0].attempts > 120) {
        await client.query('COMMIT');
        return {
          liked: current,
          count: p.rows[0].like_count,
          error: 'Too many reactions. Try again in a few minutes.',
        };
      }
      if (liked)
        await client.query(
          'INSERT INTO forum_likes(post_id,visitor_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
          [postId, visitor],
        );
      else
        await client.query('DELETE FROM forum_likes WHERE post_id=$1 AND visitor_id=$2', [
          postId,
          visitor,
        ]);
    }
    const count = (await client.query('SELECT like_count FROM forum_posts WHERE id=$1', [postId]))
      .rows[0].like_count;
    await client.query("DELETE FROM forum_like_limits WHERE window_start<now()-interval '1 day'");
    await client.query('COMMIT');
    return { liked, count };
  } catch {
    await client.query('ROLLBACK').catch(() => {});
    return { liked: false, count: 0, error: 'Could not save your reaction. Try again.' };
  } finally {
    client.release();
  }
}
export async function moderateForumReply(form: FormData) {
  await requireAdmin();
  const parsed = z
    .object({ id: z.uuid(), postId: z.uuid(), hidden: z.enum(['true', 'false']) })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return;
  const p = parsed.data;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT id FROM forum_posts WHERE id=$1 FOR UPDATE', [p.postId]);
    await client.query('UPDATE forum_replies SET hidden=$3 WHERE id=$1 AND post_id=$2', [
      p.id,
      p.postId,
      p.hidden === 'true',
    ]);
    await client.query(
      `WITH RECURSIVE branch AS (
      SELECT id,hidden OR hidden_by_parent AS blocked FROM forum_replies WHERE id=$1 AND post_id=$2
      UNION ALL SELECT r.id,(r.hidden OR b.blocked) FROM forum_replies r JOIN branch b ON r.parent_id=b.id WHERE r.post_id=$2
    ) UPDATE forum_replies r SET hidden_by_parent=b.blocked FROM branch b WHERE r.parent_id=b.id AND r.post_id=$2 AND r.hidden_by_parent IS DISTINCT FROM b.blocked`,
      [p.id, p.postId],
    );
    await client.query(
      'UPDATE forum_posts SET discussion_updated_at=clock_timestamp() WHERE id=$1',
      [p.postId],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  refreshForum(p.postId);
  return {
    count:
      (await pool.query('SELECT reply_count FROM forum_posts WHERE id=$1', [p.postId])).rows[0]
        ?.reply_count || 0,
  };
}
