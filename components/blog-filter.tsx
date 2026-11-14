'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Search, ArrowUpRight, ArrowRight } from 'lucide-react';
import { WriteupThumbnail } from './writeup-thumbnail';
import type { PostSummary } from '@/lib/types';
export function BlogFilter({ posts }: { posts: PostSummary[] }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All writeups');
  const cats = ['All writeups', ...new Set(posts.map((p) => p.category))];
  const filtered = posts.filter(
    (p) =>
      (cat === 'All writeups' || p.category === cat) &&
      `${p.title} ${p.excerpt} ${p.tags.join(' ')}`.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      <div className="filter-bar writeups-filters">
        <div className="filter-pills">
          {cats.map((c) => (
            <button
              className={cat === c ? 'selected' : ''}
              key={c}
              aria-pressed={cat === c}
              onClick={() => setCat(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <label className="search-box">
          <Search size={16} />
          <input
            placeholder="Search writeups…"
            aria-label="Search writing"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
      </div>
      <div className="blog-grid">
        {filtered.map((p) => (
          <Link className="blog-card" href={`/blog/${p.slug}`} key={p.id}>
            <WriteupThumbnail key={p.cover_id || 'fallback'} post={p} />
            <div className="blog-card-body">
              <div className="eyebrow">
                {p.category}
                <span>{p.read_time} min read</span>
              </div>
              <h2>
                {p.title}
                <ArrowUpRight size={20} />
              </h2>
              <p>{p.excerpt}</p>
              <div className="blog-card-bottom">
                <time dateTime={new Date(p.published_at!).toISOString()}>
                  {new Date(p.published_at!).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    timeZone: 'Asia/Colombo',
                  })}
                </time>
                <ArrowRight size={17} />
              </div>
            </div>
          </Link>
        ))}
      </div>
      {!filtered.length && (
        <div className="empty-state">No notes found. Try another search or check back soon.</div>
      )}
    </>
  );
}
