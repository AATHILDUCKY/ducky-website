'use server';
import { getForumPage, getForumPost, getForumReplies } from '@/lib/forum';
import { getProfile } from '@/lib/db';
import { isAdmin, requireAdmin } from '@/lib/auth';
import { ForumPostCard } from '@/components/forum-post';
import { Markdown } from '@/components/markdown';
import { ForumEmbed } from '@/components/forum-embed';
import { forumLinks, normalizeForumLinkInput } from '@/lib/forum-links';
import { forumPageHref } from '@/lib/forum-validation';
import { forumSort } from '@/lib/forum-ranking';
import { forumPostPath } from '@/lib/forum-slugs.mjs';
import { z } from 'zod';
import { pool } from '@/lib/db';
export async function loadForumPage(q: string, after: string, order: string = 'top') {
  const sort = forumSort(order);
  const [page, profile, admin] = await Promise.all([
    getForumPage(String(q), String(after), sort),
    getProfile(),
    isAdmin(),
  ]);
  return {
    content: page.posts.map((post) => (
      <ForumPostCard key={post.id} post={post} author={profile} admin={admin} />
    )),
    next: page.next ? forumPageHref(page.q, page.next, sort) : '',
    count: page.posts.length,
  };
}
export async function previewForumPost(content: string, link = '') {
  await requireAdmin();
  const text = String(content).slice(0, 20000);
  return (
    <>
      <Markdown content={text} />
      {forumLinks(text, normalizeForumLinkInput(String(link).slice(0, 2000))).map((item) => (
        <ForumEmbed key={item.url} value={item.url} />
      ))}
    </>
  );
}
export async function loadForumComments(
  postId: string,
  parentId: string | null = null,
  after = '',
) {
  if (
    !z.uuid().safeParse(postId).success ||
    (parentId !== null && !z.uuid().safeParse(parentId).success)
  )
    throw new Error('Invalid comment.');
  const [admin, profile] = await Promise.all([isAdmin(), getProfile()]);
  const post = await getForumPost(postId, admin);
  if (!post) throw new Error('Post unavailable.');
  if (parentId) {
    const parent = (
      await pool.query(
        'SELECT id FROM forum_replies WHERE id=$1 AND post_id=$2 ' +
          (admin ? '' : 'AND NOT hidden AND NOT hidden_by_parent'),
        [parentId, postId],
      )
    ).rows[0];
    if (!parent) throw new Error('Comment unavailable.');
  }
  const result = await getForumReplies(postId, String(after), admin, parentId);
  const path = forumPostPath(post);
  return {
    replies: result.replies,
    path,
    admin,
    authorName: admin ? profile.name : undefined,
    next: result.next,
  };
}
