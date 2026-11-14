'use client';
import { useEffect, useState, useTransition } from 'react';
import { ThumbsUp } from 'lucide-react';
import { setForumLike } from '@/app/forum-actions';
export function ForumLike({
  postId,
  count: initialCount,
  liked: initialLiked,
}: {
  postId: string;
  count: number;
  liked: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    setLiked(initialLiked);
    setCount(initialCount);
  }, [initialLiked, initialCount]);
  return (
    <span className="forum-like-control">
      <button
        type="button"
        className="forum-like-button"
        aria-pressed={liked}
        disabled={pending}
        aria-label={liked ? 'Unlike post' : 'Like post'}
        onClick={() => {
          const before = { liked, count };
          const desired = !liked;
          setLiked(desired);
          setCount(count + (desired ? 1 : -1));
          setError('');
          startTransition(async () => {
            try {
              const result = await setForumLike(postId, desired);
              if (result.error) {
                setLiked(before.liked);
                setCount(before.count);
                setError(result.error);
              } else {
                setLiked(result.liked);
                setCount(result.count);
              }
            } catch {
              setLiked(before.liked);
              setCount(before.count);
              setError('Could not save your reaction. Try again.');
            }
          });
        }}
      >
        <ThumbsUp size={18} />
        <span>{liked ? 'Liked' : 'Like'}</span>
        <span className="forum-like-count">{count}</span>
      </button>
      {error && (
        <span role="status" className="forum-like-error">
          {error}
        </span>
      )}
    </span>
  );
}
