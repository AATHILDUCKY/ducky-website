import Link from 'next/link';
import { ArrowUpRight, BookOpen } from 'lucide-react';
import type { PostSummary } from '@/lib/types';
export function WritingList({ posts }: { posts: PostSummary[] }) {
  return (
    <div className="writing-list">
      {posts.map((p) => (
        <Link className="writing-row" key={p.id} href={`/blog/${p.slug}`}>
          <div className="writing-date">
            <BookOpen size={20} />
            <time dateTime={new Date(p.published_at!).toISOString()}>
              {new Date(p.published_at!).toLocaleDateString('en-US', {
                month: 'short',
                day: '2-digit',
                year: 'numeric',
                timeZone: 'Asia/Colombo',
              })}
            </time>
          </div>
          <div className="writing-row-copy">
            <div className="writing-meta">
              <span className="category-label">{p.category}</span>
              <span>{p.read_time} min read</span>
            </div>
            <h3>{p.title}</h3>
            <p>{p.excerpt}</p>
          </div>
          <span className="writing-arrow">
            <ArrowUpRight size={20} />
          </span>
        </Link>
      ))}
    </div>
  );
}
