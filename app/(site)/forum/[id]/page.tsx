import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { randomUUID } from 'node:crypto';
import type { Metadata } from 'next';
import { MessageCircle } from 'lucide-react';
import { isAdmin } from '@/lib/auth';
import { getProfile, pool, siteUrl } from '@/lib/db';
import { getForumPost, getForumReplies } from '@/lib/forum';
import { decodeForumCursor, forumExcerpt } from '@/lib/forum-validation';
import { forumPostPath } from '@/lib/forum-slugs.mjs';
import { ForumPostCard } from '@/components/forum-post';
import { ForumReplyForm } from '@/components/forum-reply-form';
import { ForumComment } from '@/components/forum-comment';
import { ForumCommentList } from '@/components/forum-comment-list';
import { PageAd } from '@/components/page-ad';
import type { ForumReply } from '@/lib/forum-types';
import { z } from 'zod';
type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ replies?: string; thread?: string }>;
};
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const p = await getForumPost((await params).id);
  if (!p) return { title: 'Post unavailable', robots: { index: false, follow: false } };
  const extra = await searchParams;
  const modified =
    p.discussion_updated_at && p.discussion_updated_at > p.updated_at
      ? p.discussion_updated_at
      : p.updated_at;
  return {
    title: p.title,
    description: forumExcerpt(p.content),
    alternates: { canonical: forumPostPath(p) },
    robots: { index: !extra.replies && !extra.thread, follow: true },
    openGraph: {
      type: 'article',
      title: p.title,
      description: forumExcerpt(p.content),
      url: forumPostPath(p),
      publishedTime: p.created_at,
      modifiedTime: modified,
      ...(p.images[0] ? { images: [`/media/${p.images[0].id}`] } : {}),
    },
  };
}
export default async function ForumDetail({ params, searchParams }: Props) {
  const key = (await params).id;
  const admin = await isAdmin();
  const post = await getForumPost(key, admin);
  if (!post) notFound();
  const path = forumPostPath(post);
  const query = await searchParams;
  if (decodeURIComponent(key) !== post.slug) {
    const args = new URLSearchParams();
    if (typeof query.replies === 'string') args.set('replies', query.replies);
    if (typeof query.thread === 'string') args.set('thread', query.thread);
    permanentRedirect(path + (args.size ? '?' + args.toString() : ''));
  }
  const before = query.replies || '';
  const parentId = query.thread || null;
  if (
    typeof before !== 'string' ||
    (before && !decodeForumCursor(before)) ||
    (parentId && !z.uuid().safeParse(parentId).success)
  )
    notFound();
  let parent: ForumReply | null = null;
  if (parentId) {
    parent =
      (
        await pool.query<ForumReply>(
          `SELECT * FROM forum_replies WHERE id=$1 AND post_id=$2 ${admin ? '' : 'AND NOT hidden AND NOT hidden_by_parent'}`,
          [parentId, post.id],
        )
      ).rows[0] || null;
    if (!parent) notFound();
  }
  const [profile, result] = await Promise.all([
    getProfile(),
    getForumReplies(post.id, before, admin, parentId),
  ]);
  const url = siteUrl() + path;
  const visible = result.replies.filter((r) => !r.hidden && !r.hidden_by_parent);
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'DiscussionForumPosting',
    '@id': url,
    url,
    headline: post.title,
    text: post.content,
    datePublished: post.created_at,
    dateModified:
      post.discussion_updated_at && post.discussion_updated_at > post.updated_at
        ? post.discussion_updated_at
        : post.updated_at,
    author: { '@type': 'Person', name: profile.name, url: siteUrl() + '/about' },
    image: post.images.map((i) => siteUrl() + '/media/' + i.id),
    interactionStatistic: [
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/CommentAction',
        userInteractionCount: post.reply_count,
      },
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/LikeAction',
        userInteractionCount: post.like_count,
      },
    ],
    comment: visible.map((r) => ({
      '@type': 'Comment',
      '@id': url + '#reply-' + r.id,
      text: r.content,
      datePublished: r.created_at,
      author: { '@type': 'Person', name: r.name },
      ...(r.parent_id ? { parentItem: { '@id': url + '#reply-' + r.parent_id } } : {}),
    })),
  };
  return (
    <div className="forum-thread">
      <Link className="forum-back" href="/forum">
        ← All posts
      </Link>
      <ForumPostCard post={post} author={profile} admin={admin} full />
      {post.status === 'published' && <PageAd />}
      <section id="replies" className="forum-replies">
        <div className="forum-replies-heading">
          <MessageCircle size={23} />
          <h2>
            Comments <span>{post.reply_count}</span>
          </h2>
        </div>
        {(before || parent) && (
          <Link className="forum-back" href={path + '#replies'}>
            ← All comments
          </Link>
        )}
        {parent && (
          <div className="forum-focused-comment">
            <ForumComment
              reply={{ ...parent, created_at: new Date(parent.created_at).toISOString() }}
              postId={post.id}
              path={path}
              admin={admin}
              authorName={admin ? profile.name : undefined}
            />
          </div>
        )}
        {post.status === 'published' && (
          <ForumReplyForm
            key={'reply-form:' + post.id + String(parentId)}
            postId={post.id}
            parentId={parentId}
            initialId={randomUUID()}
            authorName={admin ? profile.name : undefined}
          />
        )}
        <ForumCommentList
          key={'comments-list:' + post.id + String(parentId) + before}
          postId={post.id}
          path={path}
          parentId={parentId}
          initialContent={result.replies.map((reply) => (
            <ForumComment
              key={reply.id}
              reply={reply}
              postId={post.id}
              path={path}
              admin={admin}
              authorName={admin ? profile.name : undefined}
            />
          ))}
          initialNext={result.next}
        />
        {!result.replies.length && (
          <p className="forum-no-replies">Be the first to add a comment.</p>
        )}
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}
      />
    </div>
  );
}
