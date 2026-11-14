import type { Profile } from './types';
export function articleAuthor(profile: Profile) {
  return {
    name: profile.articleAuthor?.name.trim() || profile.name,
    portrait: profile.articleAuthor?.portrait || profile.portrait,
  };
}
export function authorInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => Array.from(part)[0] || '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
