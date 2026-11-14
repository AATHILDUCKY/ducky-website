import Link from 'next/link';
import { ArrowUpRight, Pencil } from 'lucide-react';
import { randomUUID } from 'node:crypto';
import { forumPostPath } from '@/lib/forum-slugs.mjs';
import { ForumDiscussion } from './forum-discussion';
import { Markdown } from './markdown';
import { ForumEmbed } from './forum-embed';
import { forumLinks } from '@/lib/forum-links';
import type { ForumPost as Post } from '@/lib/forum-types';
export function ForumPostCard({
  post: p,
  author,
  admin = false,
  full = false,
}: {
  post: Post;
  author: { name: string; portrait: string };
  admin?: boolean;
  full?: boolean;
}) {
  const path = forumPostPath(p);
  const truncated = !full && p.content.length > 1800;
  return (
    <article className={`forum-post ${full ? 'forum-post-full' : ''}`} data-post-id={p.id}>
      <header className="forum-post-header">
        <img
          className="forum-avatar"
          src={author.portrait || '/portrait.webp'}
          alt=""
          width={44}
          height={44}
          loading="lazy"
        />
        <div>
          <strong>
            {author.name} <span className="forum-author-badge">Author</span>
          </strong>
          <a href={path}>
            <time dateTime={p.created_at}>
              {new Date(p.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                timeZone: 'Asia/Colombo',
              })}
            </time>
            {p.status === 'draft' && <span className="forum-draft">Draft · only you</span>}
          </a>
        </div>
        {admin && (
          <a
            className="forum-icon-button"
            href={`/forum/${p.id}/edit`}
            aria-label={`Edit ${p.title}`}
          >
            <Pencil size={17} />
          </a>
        )}
      </header>
      {full ? (
        <h1>{p.title}</h1>
      ) : (
        <h2>
          <Link href={path}>{p.title}</Link>
        </h2>
      )}
      <Markdown content={truncated ? p.content.slice(0, 1800) + '\n\n…' : p.content} />
      {truncated && (
        <Link className="forum-continue" href={path}>
          Read the full post <ArrowUpRight size={15} />
        </Link>
      )}
      {!!p.images.length && (
        <div className={`forum-images forum-images-${p.images.length}`}>
          {p.images.map((image) => (
            <a href={`/media/${image.id}`} key={image.id} target="_blank" rel="noopener noreferrer">
              <img
                src={`/media/${image.id}`}
                alt={image.alt || p.title}
                width={image.width}
                height={image.height}
                loading="lazy"
                decoding="async"
              />
            </a>
          ))}
        </div>
      )}
      {forumLinks(p.content, p.link_url).map((link) => (
        <ForumEmbed value={link.url} key={link.url} />
      ))}
      <ForumDiscussion
        postId={p.id}
        path={path}
        title={p.title}
        count={p.reply_count}
        likes={p.like_count}
        liked={p.liked}
        full={full}
        initialId={randomUUID()}
        authorName={admin ? author.name : undefined}
        published={p.status === 'published'}
      />
    </article>
  );
}
