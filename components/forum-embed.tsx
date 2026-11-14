'use client';
import { useState } from 'react';
import { ArrowUpRight, Github, Instagram, Link2, Play } from 'lucide-react';
import { forumLink } from '@/lib/forum-links';
export function ForumEmbed({ value }: { value: string }) {
  const [open, setOpen] = useState(false);
  const link = forumLink(value);
  if (!link) return null;
  const Icon = link.kind === 'github' ? Github : link.kind === 'instagram' ? Instagram : Link2;
  return (
    <div className={`forum-link-card forum-link-${link.kind}`}>
      <a href={link.url} target="_blank" rel="noopener noreferrer" className="forum-link-label">
        <Icon size={23} />
        <span>
          <small>
            {link.kind === 'github'
              ? 'FOUND ON GITHUB'
              : link.kind === 'instagram'
                ? 'FROM INSTAGRAM'
                : 'WORTH A LOOK'}
          </small>
          <strong>{link.label}</strong>
        </span>
        <ArrowUpRight size={19} />
      </a>
      {link.embed &&
        (open ? (
          <>
            <iframe
              title="Embedded Instagram post"
              src={link.embed}
              loading="lazy"
              allow="encrypted-media; fullscreen"
              referrerPolicy="strict-origin-when-cross-origin"
            />
            <p className="forum-embed-note">
              Can’t see it?{' '}
              <a href={link.url} target="_blank" rel="noopener noreferrer">
                Open on Instagram ↗
              </a>
            </p>
          </>
        ) : (
          <button type="button" className="forum-embed-load" onClick={() => setOpen(true)}>
            <Play size={19} /> Load Instagram post <span>Tap to view</span>
          </button>
        ))}
    </div>
  );
}
