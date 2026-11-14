'use client';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowDown, Loader2 } from 'lucide-react';
import { loadForumPage } from '@/app/forum-render-actions';
export function ForumFeed({
  children,
  nextHref,
  query,
}: {
  children: ReactNode;
  nextHref: string;
  query: string;
}) {
  const [batches, setBatches] = useState<ReactNode[]>([]);
  const [next, setNext] = useState(nextHref);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const sentinel = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const load = useCallback(async () => {
    if (!next || busy.current) return;
    busy.current = true;
    setLoading(true);
    setError('');
    try {
      const params = new URL(next, location.origin).searchParams;
      const result = await loadForumPage(
        query,
        params.get('after') || '',
        params.get('sort') || 'top',
      );
      setBatches((items) => [...items, result.content]);
      setNext(result.next);
    } catch {
      setError('Could not load the next posts. Try again or open the next page.');
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [next, query]);
  useEffect(() => {
    if (!next || error || !sentinel.current || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void load();
      },
      { rootMargin: '400px 0px' },
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [next, error, load]);
  return (
    <>
      <div className="forum-feed">
        {children}
        {batches.map((batch, index) => (
          <div className="forum-batch" key={index}>
            {batch}
          </div>
        ))}
      </div>
      <div className="forum-load-more" ref={sentinel} aria-busy={loading}>
        {loading && (
          <p role="status">
            <Loader2 size={18} className="spin" /> Gathering the next 10 posts…
          </p>
        )}
        {error && <p role="alert">{error}</p>}
        {next ? (
          <a
            href={next}
            className="forum-more-link"
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || loading)
                return;
              event.preventDefault();
              void load();
            }}
          >
            <ArrowDown size={17} />
            {error ? 'Retry loading posts' : 'Load 10 more posts'}
          </a>
        ) : (
          <p className="forum-end">You’re all caught up.</p>
        )}
        {error && <a href={next}>Open next page →</a>}
      </div>
    </>
  );
}
