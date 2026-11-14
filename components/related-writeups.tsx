import Link from 'next/link';
import { ArrowUpRight, Clock3 } from 'lucide-react';
import { WriteupThumbnail } from './writeup-thumbnail';
import type { RelatedWriteup } from '@/lib/related-writeups';

export function RelatedWriteups({ suggestions }: { suggestions: RelatedWriteup[] }) {
  if (!suggestions.length) return null;
  return (
    <section className="related-writeups" aria-labelledby="related-writeups-heading">
      <div className="related-writeups-heading">
        <div>
          <span className="eyebrow">KEEP EXPLORING</span>
          <h2 id="related-writeups-heading">Your next read</h2>
          <p>A few more ideas to explore after this writeup.</p>
        </div>
        <Link className="text-link" href="/blog">
          All writeups <span aria-hidden="true">↗</span>
        </Link>
      </div>
      <div className="related-writeups-grid">
        {suggestions.map(({ post, reason }) => (
          <Link key={post.id} href={`/blog/${post.slug}`} className="related-writeup-card">
            <WriteupThumbnail post={post} />
            <div className="related-writeup-body">
              <span className="related-writeup-reason">{reason}</span>
              <h3>
                {post.title}
                <ArrowUpRight size={20} aria-hidden="true" />
              </h3>
              <p>{post.excerpt}</p>
              <div className="related-writeup-meta">
                <span>{post.category}</span>
                <span>
                  <Clock3 size={15} aria-hidden="true" />
                  {post.read_time} min read
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
