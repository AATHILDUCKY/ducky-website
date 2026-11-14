'use client';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { loadForumComments } from '@/app/forum-render-actions';
import { ForumComment } from './forum-comment';
export function ForumCommentList({
  postId,
  path,
  parentId = null,
  initialContent,
  initialNext = '',
  collapsed = false,
  count = 0,
}: {
  postId: string;
  path: string;
  parentId?: string | null;
  initialContent?: ReactNode;
  initialNext?: string;
  collapsed?: boolean;
  count?: number;
}) {
  const [open, setOpen] = useState(!collapsed);
  const [content, setContent] = useState<ReactNode>(initialContent);
  const [next, setNext] = useState(initialNext);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const reload = useCallback(
    async (after = '', append = false) => {
      setPending(true);
      setError('');
      try {
        const result = await loadForumComments(postId, parentId, after);
        const nodes = result.replies.map((reply) => (
          <ForumComment
            key={reply.id}
            reply={reply}
            postId={postId}
            path={result.path}
            admin={result.admin}
            authorName={result.authorName}
          />
        ));
        setContent((current) =>
          append ? (
            <>
              {current}
              {nodes}
            </>
          ) : (
            nodes
          ),
        );
        setNext(result.next);
      } catch {
        setError('Could not load comments. Please try again.');
      } finally {
        setPending(false);
      }
    },
    [postId, parentId],
  );
  useEffect(() => {
    if (initialContent !== undefined) setContent(initialContent);
  }, [initialContent]);
  useEffect(() => {
    if (open && initialContent === undefined) void reload();
  }, [open, initialContent, reload]);
  useEffect(() => {
    const changed = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (open && detail?.postId === postId && (detail.moderated || detail.parentId === parentId))
        void reload();
    };
    window.addEventListener('forum:comments', changed);
    return () => window.removeEventListener('forum:comments', changed);
  }, [open, postId, parentId, reload]);
  const href = (cursor = '') =>
    path +
    '?' +
    new URLSearchParams({
      ...(parentId ? { thread: parentId } : {}),
      ...(cursor ? { replies: cursor } : {}),
    }).toString() +
    '#replies';
  return (
    <div className={parentId ? 'forum-comment-branch' : 'forum-comments-list'}>
      {collapsed && (
        <a
          className="forum-thread-toggle"
          href={href()}
          aria-expanded={open}
          onClick={(event) => {
            if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            setOpen((value) => !value);
          }}
        >
          <ChevronDown size={15} />
          {open ? 'Hide replies' : `View ${count} ${count === 1 ? 'reply' : 'replies'}`}
        </a>
      )}
      {open && (
        <>
          <div className="forum-reply-list">{content}</div>
          {pending && (
            <p className="forum-comments-loading" role="status">
              <Loader2 size={15} className="spin" /> Loading comments…
            </p>
          )}
          {error && (
            <p className="forum-error" role="alert">
              {error}{' '}
              <button type="button" onClick={() => void reload()}>
                Retry
              </button>
            </p>
          )}
          {next && (
            <a
              href={href(next)}
              className="forum-more-link"
              onClick={(event) => {
                if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || pending)
                  return;
                event.preventDefault();
                void reload(next, true);
              }}
            >
              Load more replies
            </a>
          )}
        </>
      )}
    </div>
  );
}
