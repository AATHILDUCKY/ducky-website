'use client';
import { useState } from 'react';
import { ArrowUpRight, ShieldCheck, Code2, NotebookPen } from 'lucide-react';
import type { PostSummary } from '@/lib/types';

export function WriteupThumbnail({ post }: { post: PostSummary }) {
  const [failed, setFailed] = useState(false);
  const research = /security|research|pentest|vulnerability|iam|iag/i.test(post.category);
  const technical = /project|develop|engineering|code/i.test(post.category);
  const tone = research ? 'green' : technical ? 'sand' : 'clay';
  const Icon = research ? ShieldCheck : technical ? Code2 : NotebookPen;
  return (
    <div className="writeup-thumbnail" data-tone={tone}>
      {post.cover_id && !failed ? (
        <img
          src={`/media/${post.cover_id}`}
          alt=""
          width={1200}
          height={675}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="writeup-thumbnail-fallback" aria-hidden="true">
          <div className="thumbnail-topline">
            <span>DUCKY / FIELD NOTES</span>
            <ArrowUpRight size={17} />
          </div>
          <div className="thumbnail-content">
            <span className="thumbnail-icon">
              <Icon size={32} strokeWidth={1.5} />
            </span>
            <div>
              <strong>{post.category}</strong>
              <span>Ideas worth sharing.</span>
            </div>
          </div>
          <div className="thumbnail-bottomline">
            <span>{post.tags.slice(0, 2).join(' / ') || 'Security. Software. Curiosity.'}</span>
            <span className="thumbnail-grid-mark" />
          </div>
        </div>
      )}
    </div>
  );
}
