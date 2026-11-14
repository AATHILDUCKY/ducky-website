import type { Profile } from './types';

export const socialPlatforms = [
  { key: 'github', label: 'GitHub', placeholder: 'https://github.com/your-username' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://www.linkedin.com/in/your-name' },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://www.youtube.com/@your-channel' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://www.instagram.com/your-username/' },
  { key: 'x', label: 'X', placeholder: 'https://x.com/your-username' },
] as const;

export type SocialPlatform = (typeof socialPlatforms)[number]['key'];
export type SocialLinks = Record<SocialPlatform, string>;
export type SocialProfile = Pick<Profile, SocialPlatform>;
export type HeroSocialProfile = SocialProfile & Pick<Profile, 'email'>;

export function profileSocialLinks(profile: SocialProfile): SocialLinks {
  return {
    github: profile.github || '',
    linkedin: profile.linkedin || '',
    youtube: profile.youtube ?? 'https://www.youtube.com/@aathilducky',
    instagram: profile.instagram || '',
    x: profile.x || '',
  };
}
