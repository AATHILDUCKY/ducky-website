import Link from 'next/link';
import { ArrowRight, BookOpen, Clock3 } from 'lucide-react';
import { WriteupThumbnail } from './writeup-thumbnail';
import type { PostSummary } from '@/lib/types';
export function WriteupCard({ post, index }: { post: PostSummary; index?: number }) {
  return (
    <Link href={'/blog/' + post.slug} className="home-writeup-card">
      <WriteupThumbnail post={post} />
      {index !== undefined && (
        <span className="home-writeup-number" aria-hidden="true">
          {String(index + 1).padStart(2, '0')}
        </span>
      )}
      <div className="home-writeup-body">
        <div className="home-writeup-meta">
          <span>
            <BookOpen size={16} aria-hidden="true" />
            {post.category}
          </span>
          <span>
            <Clock3 size={16} aria-hidden="true" />
            {post.read_time} min read
          </span>
        </div>
        <h3>{post.title}</h3>
        <p>{post.excerpt}</p>
        <div className="home-writeup-date">
          <time dateTime={new Date(post.published_at!).toISOString()}>
            {new Date(post.published_at!).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              timeZone: 'Asia/Colombo',
            })}
          </time>
          <span>
            Read writeup <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
}
