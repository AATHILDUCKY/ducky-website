'use client';
import { useEffect, useState } from 'react';
import { moderateForumReply } from '@/app/forum-actions';
import type { ForumReply } from '@/lib/forum-types';
import { ForumCommentReply } from './forum-comment-controls';
import { ForumCommentList } from './forum-comment-list';
export function ForumComment({
  reply,
  postId,
  path,
  admin,
  authorName,
}: {
  reply: ForumReply;
  postId: string;
  path: string;
  admin: boolean;
  authorName?: string;
}) {
  const hidden = reply.hidden || reply.hidden_by_parent;
  const [moderating, setModerating] = useState(false);
  const [error, setError] = useState('');
  const [children, setChildren] = useState(reply.child_count);
  useEffect(() => setChildren(reply.child_count), [reply.child_count]);
  useEffect(() => {
    const changed = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (
        detail?.postId === postId &&
        detail.parentId === reply.id &&
        Number.isFinite(detail.parentCount)
      )
        setChildren(detail.parentCount);
    };
    window.addEventListener('forum:comments', changed);
    return () => window.removeEventListener('forum:comments', changed);
  }, [postId, reply.id]);
  return (
    <article
      className={`forum-reply ${hidden ? 'forum-reply-hidden' : ''}`}
      id={`reply-${reply.id}`}
      data-comment-id={reply.id}
    >
      <span className="forum-reply-avatar" aria-hidden="true">
        {reply.name.slice(0, 1).toUpperCase()}
      </span>
      <div className="forum-comment-content">
        <header>
          <strong>{reply.name}</strong>
          {reply.is_author && <span className="forum-author-badge">Author</span>}
          {hidden && <span className="forum-draft">Hidden · only you</span>}
          <a href={`${path}?thread=${reply.parent_id || reply.id}#reply-${reply.id}`}>
            <time dateTime={reply.created_at}>
              {new Date(reply.created_at).toLocaleString('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
                timeZone: 'Asia/Colombo',
              })}
            </time>
          </a>
        </header>
        <p>{reply.content}</p>
        <div className="forum-comment-actions">
          {!hidden && reply.depth < 32 && (
            <ForumCommentReply postId={postId} parentId={reply.id} authorName={authorName} />
          )}
          {admin && (
            <form
              action={async (form) => {
                setModerating(true);
                setError('');
                try {
                  const result = await moderateForumReply(form);
                  window.dispatchEvent(
                    new CustomEvent('forum:comments', {
                      detail: {
                        postId,
                        parentId: reply.parent_id,
                        moderated: true,
                        count: result?.count,
                      },
                    }),
                  );
                } catch {
                  setError('Could not update this comment. Try again.');
                } finally {
                  setModerating(false);
                }
              }}
            >
              <input type="hidden" name="id" value={reply.id} />
              <input type="hidden" name="postId" value={postId} />
              <input type="hidden" name="hidden" value={String(!reply.hidden)} />
              <button className="forum-text-button" disabled={moderating}>
                {reply.hidden ? 'Restore reply' : 'Hide reply'}
              </button>
            </form>
          )}
        </div>
        {error && (
          <p className="forum-error" role="alert">
            {error}
          </p>
        )}
        {(children > 0 || admin) && (
          <ForumCommentList
            key={reply.id}
            postId={postId}
            path={path}
            parentId={reply.id}
            collapsed
            count={children}
          />
        )}
      </div>
    </article>
  );
}
