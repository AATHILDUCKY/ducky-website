import 'server-only';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { pool } from './db';
import { z } from 'zod';
import { decodeForumCursor, encodeForumCursor, forumSearch } from './forum-validation';
import type { ForumPost, ForumReply } from './forum-types';
import { forumVisitor } from './forum-visitor';
import { FORUM_RANKED_CANDIDATES, FORUM_FEED_CACHE_SECONDS } from './forum-ranking';

export const FORUM_PAGE_SIZE = 10;
// Keep PostgreSQL's microseconds: JS Date truncation can skip rows at cursor boundaries.
const fields = `p.id,p.slug,p.title,p.content,p.link_url,p.images,p.status,
  to_char(p.discussion_updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS discussion_updated_at,
  to_char(p.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS created_at,
  to_char(p.updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS updated_at,
  p.updated_at::text AS revision,
  p.reply_count,p.like_count`;
async function withLikes(posts: ForumPost[]) {
  const visitor = await forumVisitor();
  const liked = new Set(
    visitor && posts.length
      ? (
          await pool.query(
            'SELECT post_id FROM forum_likes WHERE visitor_id=$1 AND post_id=ANY($2::uuid[])',
            [visitor, posts.map((p) => p.id)],
          )
        ).rows.map((r) => r.post_id)
      : [],
  );
  return posts.map((post) => ({ ...post, liked: liked.has(post.id) }));
}
const latestSnapshot = unstable_cache(
  async () => {
    const snapshot = (
      await pool.query(`INSERT INTO forum_feed_snapshots(post_ids,created_at)
    SELECT ARRAY(SELECT id FROM forum_posts WHERE status='published' AND created_at<=statement_timestamp()
      ORDER BY feed_score DESC,created_at DESC,id DESC LIMIT ${FORUM_RANKED_CANDIDATES}),statement_timestamp() RETURNING id`)
    ).rows[0].id as string;
    await pool.query("DELETE FROM forum_feed_snapshots WHERE created_at<now()-interval '1 day'");
    return snapshot;
  },
  ['forum-ranked-snapshot-v1'],
  { tags: ['forum-feed'], revalidate: FORUM_FEED_CACHE_SECONDS },
);
async function rankedPage(after: string) {
  const cursor = decodeForumCursor(after);
  if (after && (!cursor?.snapshot || cursor.position === undefined))
    throw new Error('Invalid ranked feed cursor.');
  const snapshotId = cursor?.snapshot || (await latestSnapshot());
  const snapshot = (
    await pool.query(
      `SELECT id,post_ids,to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS date FROM forum_feed_snapshots WHERE id=$1`,
      [snapshotId],
    )
  ).rows[0];
  if (!snapshot) return { posts: [], next: '', q: '', expired: true };
  let rows: (ForumPost & { position: number })[] = [];
  if (!cursor?.tail)
    rows = (
      await pool.query<ForumPost & { position: number }>(
        `SELECT ${fields},0::real AS rank,s.ordinality::int AS position FROM unnest($1::uuid[]) WITH ORDINALITY s(id,ordinality) JOIN forum_posts p ON p.id=s.id WHERE s.ordinality>$2 AND p.status='published' ORDER BY s.ordinality LIMIT 11`,
        [snapshot.post_ids, cursor?.position || 0],
      )
    ).rows;
  if (rows.length > 10) {
    const posts = rows.slice(0, 10);
    const last = posts[9];
    return {
      posts: await withLikes(posts),
      next: encodeForumCursor({
        date: last.created_at,
        id: last.id,
        rank: 0,
        q: '',
        snapshot: snapshotId,
        position: last.position,
      }),
      q: '',
    };
  }
  const date = cursor?.tail ? cursor.date : snapshot.date;
  const id = cursor?.tail ? cursor.id : 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  const tail = (
    await pool.query<ForumPost>(
      `SELECT ${fields},0::real AS rank FROM forum_posts p WHERE status='published' AND created_at<=$1::timestamptz AND NOT(id=ANY($2::uuid[])) AND (created_at,id)<($3::timestamptz,$4::uuid) ORDER BY created_at DESC,id DESC LIMIT $5`,
      [snapshot.date, snapshot.post_ids, date, id, 11 - rows.length],
    )
  ).rows;
  const combined = [...rows, ...tail];
  const posts = combined.slice(0, 10);
  const last = posts.at(-1);
  return {
    posts: await withLikes(posts),
    next:
      combined.length > 10 && last
        ? encodeForumCursor({
            date: tail.length && posts.length > rows.length ? last.created_at : snapshot.date,
            id:
              tail.length && posts.length > rows.length
                ? last.id
                : 'ffffffff-ffff-ffff-ffff-ffffffffffff',
            rank: 0,
            q: '',
            snapshot: snapshotId,
            position: snapshot.post_ids.length,
            tail: true,
          })
        : '',
    q: '',
  };
}
export async function getForumPage(query = '', after = '', sort: 'top' | 'latest' = 'top') {
  const q = forumSearch(query);
  if (!q && sort === 'top') return rankedPage(after);
  const cursor = decodeForumCursor(after, q);
  if (after && (!cursor || cursor.snapshot)) throw new Error('Invalid forum page cursor.');
  const params: unknown[] = [];
  let where = `p.status='published'`;
  let rank = '0::real';
  let order = 'p.created_at DESC,p.id DESC';
  if (q) {
    params.push(q);
    where += ` AND p.search_document @@ plainto_tsquery('simple',$1)`;
    rank = `ts_rank_cd(p.search_document,plainto_tsquery('simple',$1),32)`;
    order = 'rank DESC,' + order;
  }
  if (cursor) {
    const n = params.length;
    params.push(cursor.date, cursor.id);
    if (q) {
      params.push(cursor.rank);
      where += ` AND (${rank},p.created_at,p.id) < ($${n + 3}::real,$${n + 1}::timestamptz,$${n + 2}::uuid)`;
    } else where += ` AND (p.created_at,p.id) < ($${n + 1}::timestamptz,$${n + 2}::uuid)`;
  }
  const result = await pool.query<ForumPost>(
    `SELECT ${fields},${rank} AS rank FROM forum_posts p WHERE ${where} ORDER BY ${order} LIMIT 11`,
    params,
  );
  const posts = result.rows.slice(0, FORUM_PAGE_SIZE);
  const last = posts.at(-1);
  const next =
    result.rows.length > FORUM_PAGE_SIZE && last
      ? encodeForumCursor({ date: last.created_at, id: last.id, rank: last.rank, q })
      : '';
  return { posts: await withLikes(posts), next, q };
}
export const getForumPost = cache(async (id: string, includeDraft = false) => {
  if (id.includes('%')) {
    try {
      id = decodeURIComponent(id);
    } catch {
      return null;
    }
  }
  if (!id || id.length > 300) return null;
  const column = z.uuid().safeParse(id).success ? 'id' : 'slug';
  const post =
    (
      await pool.query<ForumPost>(
        `SELECT ${fields},0::real AS rank FROM forum_posts p WHERE p.${column}=$1 ${includeDraft ? '' : "AND p.status='published'"}`,
        [id],
      )
    ).rows[0] || null;
  return post ? (await withLikes([post]))[0] : null;
});
export async function getForumReplies(
  postId: string,
  before = '',
  includeHidden = false,
  parentId: string | null = null,
) {
  const cursor = decodeForumCursor(before);
  if (before && !cursor) throw new Error('Invalid reply cursor.');
  const rows = (
    await pool.query<ForumReply>(
      `SELECT id,post_id,parent_id,root_id,depth,child_count,name,content,is_author,hidden,hidden_by_parent,
    to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS created_at
    FROM forum_replies WHERE post_id=$1 AND parent_id IS NOT DISTINCT FROM $${cursor ? 4 : 2}::uuid ${includeHidden ? '' : 'AND NOT hidden AND NOT hidden_by_parent'}
    ${cursor ? 'AND (created_at,id) < ($2::timestamptz,$3::uuid)' : ''}
    ORDER BY created_at DESC,id DESC LIMIT 21`,
      cursor ? [postId, cursor.date, cursor.id, parentId] : [postId, parentId],
    )
  ).rows;
  const replies = rows.slice(0, 20);
  const last = replies.at(-1);
  return {
    replies,
    next:
      rows.length > 20 && last
        ? encodeForumCursor({ date: last.created_at, id: last.id, rank: 0, q: '' })
        : '',
  };
}
