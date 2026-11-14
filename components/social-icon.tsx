import { Github, Instagram, Linkedin, Mail, Youtube } from 'lucide-react';
import type { SocialPlatform } from '@/lib/social-links';

export function SocialIcon({ name, size = 21 }: { name: SocialPlatform | 'email'; size?: number }) {
  if (name === 'x') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L.753 2.25H7.58l4.713 6.231Zm-1.161 17.52h1.833L6.584 4.126H4.617Z"
        />
      </svg>
    );
  }
  const Icon = {
    github: Github,
    instagram: Instagram,
    linkedin: Linkedin,
    youtube: Youtube,
    email: Mail,
  }[name];
  return <Icon size={size} strokeWidth={1.75} aria-hidden="true" />;
}
