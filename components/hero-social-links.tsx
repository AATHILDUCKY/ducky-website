import { ArrowUpRight } from 'lucide-react';
import {
  profileSocialLinks,
  socialPlatforms,
  type HeroSocialProfile,
  type SocialPlatform,
} from '@/lib/social-links';
import { SocialIcon } from './social-icon';

export function HeroSocialLinks({ profile }: { profile: HeroSocialProfile }) {
  const socials = profileSocialLinks(profile);
  const links: { key: SocialPlatform | 'email'; label: string; href: string }[] =
    socialPlatforms.map(({ key, label }) => ({ key, label, href: socials[key] }));
  if (profile.email) links.push({ key: 'email', label: 'Email', href: `mailto:${profile.email}` });
  const visibleLinks = links.filter((link) => link.href);
  if (!visibleLinks.length) return null;

  return (
    <div className="hero-socials">
      <span className="hero-social-label">
        LET’S CONNECT <ArrowUpRight size={15} aria-hidden="true" />
      </span>
      <nav className="hero-social-list" aria-label="Social profiles">
        {visibleLinks.map(({ key, label, href }) => {
          const external = !href.startsWith('mailto:');
          return (
            <a
              key={label}
              className={`hero-social-link${label === 'YouTube' ? ' hero-social-link-featured' : ''}`}
              href={href}
              aria-label={external ? `${label} (opens in a new tab)` : label}
              title={label}
              target={external ? '_blank' : undefined}
              rel={external ? 'noopener noreferrer' : undefined}
            >
              <SocialIcon name={key} />
            </a>
          );
        })}
      </nav>
    </div>
  );
}
