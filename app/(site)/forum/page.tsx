import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import type { Metadata } from 'next';
import { isAdmin } from '@/lib/auth';
import { getProfile } from '@/lib/db';
import { getForumPage } from '@/lib/forum';
import { decodeForumCursor, forumPageHref, forumSearch } from '@/lib/forum-validation';
import { forumSort } from '@/lib/forum-ranking';
import { ForumPostCard } from '@/components/forum-post';
import { ForumFeed } from '@/components/forum-feed';
import { PageAd } from '@/components/page-ad';
type Props = { searchParams: Promise<{ q?: string; after?: string; sort?: string }> };
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const q = forumSearch(typeof params.q === 'string' ? params.q : '');
  const after = typeof params.after === 'string' ? params.after : '';
  const sort = forumSort(params.sort);
  return {
    title: q ? `Search: ${q} · Forum` : 'Forum',
    description:
      'Posts, links, and conversations from Aathil. Like a post or join the discussion without an account.',
    alternates: { canonical: forumPageHref(q, after, sort) },
    robots: { index: !q && (!after || sort === 'latest'), follow: true },
    openGraph: {
      title: 'Forum · Aathilducky',
      description: 'Posts, links, and conversations.',
      url: '/forum',
    },
  };
}
export default async function ForumPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = forumSearch(typeof params.q === 'string' ? params.q : '');
  const after = typeof params.after === 'string' ? params.after : '';
  const sort = forumSort(params.sort);
  const cursor = decodeForumCursor(after, q);
  if (
    after &&
    (!cursor ||
      (!q && sort === 'top' && (!cursor.snapshot || cursor.position === undefined)) ||
      ((q || sort === 'latest') && cursor.snapshot))
  )
    notFound();
  const [page, profile, admin] = await Promise.all([
    getForumPage(q, after, sort),
    getProfile(),
    isAdmin(),
  ]);
  return (
    <div className="forum-shell forum-content-only">
      <section className="forum-main" aria-label="Forum posts">
        <header className="forum-compact-header">
          <h1>Forum</h1>
          {admin && (
            <Link className="forum-primary" href="/forum/new">
              <Plus size={17} /> New post
            </Link>
          )}
        </header>
        <div className="forum-feed-controls">
          <nav className="forum-sort" aria-label="Feed order">
            <Link
              href={forumPageHref(q, '', 'top')}
              aria-current={sort === 'top' ? 'page' : undefined}
            >
              Top
            </Link>
            <Link
              href={forumPageHref(q, '', 'latest')}
              aria-current={sort === 'latest' ? 'page' : undefined}
            >
              Latest
            </Link>
          </nav>
          <form action="/forum" className="forum-search" role="search">
            <Search size={17} />
            <label htmlFor="forum-search" className="sr-only">
              Search forum
            </label>
            <input
              id="forum-search"
              type="search"
              name="q"
              defaultValue={q}
              maxLength={160}
              placeholder="Search posts"
            />
            <input type="hidden" name="sort" value={sort} />
            <button type="submit">Search</button>
          </form>
        </div>
        {q && (
          <p className="forum-search-note">
            Results for “{q}” · <Link href={forumPageHref('', '', sort)}>Clear search</Link>
          </p>
        )}
        {after && (
          <Link className="forum-back" href={forumPageHref(q, '', sort)}>
            ← Refresh feed
          </Link>
        )}
        {!page.posts.length ? (
          <div className="forum-empty">
            <p>
              {'expired' in page && page.expired ? (
                <Link href="/forum">Refresh to load the latest posts.</Link>
              ) : q ? (
                'No matching posts.'
              ) : (
                'No posts yet.'
              )}
            </p>
          </div>
        ) : (
          <ForumFeed
            key={`${q}:${after}:${sort}`}
            query={q}
            nextHref={page.next ? forumPageHref(q, page.next, sort) : ''}
          >
            {page.posts.map((post) => (
              <ForumPostCard key={post.id} post={post} author={profile} admin={admin} />
            ))}
          </ForumFeed>
        )}
      </section>
      <PageAd show={page.posts.length > 0} />
    </div>
  );
}
