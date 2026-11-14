'use client';
import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { ForumReplyForm, newForumSubmissionId } from './forum-reply-form';
export function ForumCommentReply({
  postId,
  parentId,
  authorName,
}: {
  postId: string;
  parentId: string;
  authorName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [initialId, setInitialId] = useState('');
  return (
    <div className="forum-comment-reply-control">
      <button
        className="forum-text-button"
        type="button"
        aria-expanded={open}
        onClick={() => {
          if (!open) setInitialId(newForumSubmissionId());
          setOpen((value) => !value);
        }}
      >
        <MessageCircle size={14} />
        {open ? 'Cancel reply' : 'Reply'}
      </button>
      {open && (
        <ForumReplyForm
          postId={postId}
          parentId={parentId}
          initialId={initialId}
          authorName={authorName}
        />
      )}
    </div>
  );
}
