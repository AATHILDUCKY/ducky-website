import { ArrowUpRight, Github, Instagram, Linkedin, Link2, Youtube } from 'lucide-react';
import { forumLink } from '@/lib/forum-links';
export function ForumEmbed({ value }: { value: string }) {
  const link = forumLink(value);
  if (!link) return null;
  const Icon = {
    github: Github,
    instagram: Instagram,
    youtube: Youtube,
    linkedin: Linkedin,
    link: Link2,
  }[link.kind];
  const provider = {
    github: 'GitHub',
    instagram: 'Instagram',
    youtube: 'YouTube',
    linkedin: 'LinkedIn',
    link: '',
  }[link.kind];
  return (
    <div className={`forum-link-card forum-link-${link.kind}`}>
      <a href={link.url} target="_blank" rel="noopener noreferrer" className="forum-link-label">
        <Icon size={23} />
        <span>
          <small>{provider ? `FROM ${provider.toUpperCase()}` : 'WORTH A LOOK'}</small>
          <strong>{link.label}</strong>
        </span>
        <ArrowUpRight size={19} />
      </a>
      {link.embed && (
        <>
          <div
            className={`forum-embed-player${link.kind === 'youtube' ? ' forum-embed-video' : ''}${link.portrait ? ' forum-embed-portrait' : ''}`}
          >
            <iframe
              title={`Embedded ${provider} ${link.kind === 'youtube' ? 'video' : 'post'}`}
              src={link.embed}
              loading="lazy"
              allow="encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
          <p className="forum-embed-note">
            Private or unavailable?{' '}
            <a href={link.url} target="_blank" rel="noopener noreferrer">
              Open on {provider} ↗
            </a>
          </p>
        </>
      )}
    </div>
  );
}
