'use client';
import { useActionState, useEffect, useState, useId } from 'react';
import { Send } from 'lucide-react';
import { submitForumReply } from '@/app/forum-actions';
export function newForumSubmissionId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export function ForumReplyForm({
  postId,
  initialId,
  authorName,
  parentId = null,
}: {
  postId: string;
  initialId: string;
  authorName?: string;
  parentId?: string | null;
}) {
  const [state, action, pending] = useActionState(submitForumReply, {});
  const fieldId = useId();
  const [id, setId] = useState(initialId);
  const [content, setContent] = useState('');
  const [name, setName] = useState(authorName || '');
  useEffect(() => {
    if (state.success) {
      setContent('');
      setId(newForumSubmissionId());
      window.dispatchEvent(
        new CustomEvent('forum:comments', {
          detail: { postId, parentId, count: state.count, parentCount: state.parentCount },
        }),
      );
    }
  }, [state, postId, parentId]);
  return (
    <form className="forum-reply-form" action={action}>
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="parentId" value={parentId || ''} />
      <input type="hidden" name="submissionId" value={id} />
      <label className="forum-field">
        Your name <span className="forum-optional">(optional)</span>
        <input
          name="name"
          maxLength={80}
          autoComplete="nickname"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Guest"
        />
      </label>
      <div className="forum-field">
        <label htmlFor={fieldId}>Your reply</label>
        <textarea
          id={fieldId}
          name="content"
          required
          minLength={2}
          maxLength={2000}
          rows={4}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Add to the conversation…"
          aria-invalid={!!state.errors?.content}
        />
      </div>
      <div className="forum-reply-bottom">
        <span>No account needed. Your name and reply will be public.</span>
        <button className="forum-primary" disabled={pending}>
          <Send size={16} />
          {pending ? 'Posting…' : 'Post reply'}
        </button>
      </div>
      {state.message && (
        <p className={state.success ? 'forum-success' : 'forum-error'} role="status">
          {state.message}
        </p>
      )}
      {state.errors && (
        <p className="forum-error">{Object.values(state.errors).flat().join(' ')}</p>
      )}
    </form>
  );
}
