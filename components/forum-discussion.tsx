'use client';
import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { ForumLike } from './forum-like';
import { ForumShare } from './forum-share';
import { ForumReplyForm } from './forum-reply-form';
import { ForumCommentList } from './forum-comment-list';
export function ForumDiscussion({
  postId,
  path,
  title,
  count,
  likes,
  liked,
  full,
  initialId,
  authorName,
  published,
}: {
  postId: string;
  path: string;
  title: string;
  count: number;
  likes: number;
  liked: boolean;
  full: boolean;
  initialId: string;
  authorName?: string;
  published: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [total, setTotal] = useState(count);
  useEffect(() => setTotal(count), [count]);
  useEffect(() => {
    const changed = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.postId === postId && Number.isFinite(detail.count)) setTotal(detail.count);
    };
    window.addEventListener('forum:comments', changed);
    return () => window.removeEventListener('forum:comments', changed);
  }, [postId]);
  return (
    <>
      <footer className="forum-post-footer">
        {published && <ForumLike postId={postId} count={likes} liked={liked} />}
        <a
          href={`${path}#replies`}
          aria-expanded={full || open}
          aria-controls={full ? 'replies' : `comments-${postId}`}
          onClick={(event) => {
            if (full || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            setOpen((value) => !value);
          }}
        >
          <MessageCircle size={18} />
          {total} {total === 1 ? 'comment' : 'comments'}
        </a>
        <ForumShare url={path} title={title} />
      </footer>
      {!full && open && (
        <section id={`comments-${postId}`} className="forum-inline-comments" aria-label="Comments">
          <div className="forum-inline-heading">
            <h3>Comments</h3>
            <a href={`${path}#replies`}>Open discussion ↗</a>
          </div>
          {published && (
            <ForumReplyForm postId={postId} initialId={initialId} authorName={authorName} />
          )}
          <ForumCommentList postId={postId} path={path} />
        </section>
      )}
    </>
  );
}
