import 'server-only';
import { contentVersion } from './content-version';
import { unstable_cache } from 'next/cache';
import source from '@/reference/site.json';
import { pool, getProfile } from './db';
import { isRemovedPageHref } from './site-navigation.mjs';
import type { Profile } from './types';
type Source = typeof source;
type Reference = Source & { baseline?: { profile: Profile | null } };
export const getReference = unstable_cache(
  async (): Promise<Reference> =>
    (
      await pool.query(`
      SELECT jsonb_build_object(
        'source', value->'source', 'retrieved', value->'retrieved', 'icons', value->'icons',
        'pages', jsonb_build_object(
          'about', value#>'{pages,about}', 'tools', value#>'{pages,tools}',
          'contact', value#>'{pages,contact}'
        ),
        'defaults', jsonb_build_object(
          'bio', value#>'{defaults,bio}', 'skills', value#>'{defaults,skills}',
          'experience.about', value->'defaults'->'experience.about'
        ),
        'baseline', jsonb_build_object('profile', value#>'{baseline,profile}')
      ) AS value FROM settings WHERE key='reference.site'
    `)
    ).rows[0]?.value || source,
  ['reference-site-compact', contentVersion],
  { tags: ['content'], revalidate: 3600 },
);
export function escapeHtml(value: unknown) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}
const icon = (name: string) =>
  `<svg class="icon" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
export async function renderReference(name: keyof Source['pages']) {
  const [reference, profile] = await Promise.all([getReference(), getProfile()]);
  const baseline = reference.baseline?.profile;
  const original = reference.defaults as Record<string, string>;
  const expand = (html: string): string =>
    html.replace(/\{\{([^}]+)\}\}/g, (_match, key: string) => {
      if (key.startsWith('slot.')) return slot(key.slice(5));
      if (key.startsWith('profile.')) return escapeHtml(profile[key.slice(8) as keyof Profile]);
      return '';
    });
  function slot(key: string): string {
    if (key === 'bio')
      return !baseline || profile.bio === baseline.bio
        ? expand(original.bio)
        : `<p>${escapeHtml(profile.bio)}</p>`;
    if (key === 'skills')
      return !baseline || JSON.stringify(profile.skills) === JSON.stringify(baseline.skills)
        ? original.skills
        : `<article class="stack-group"><div class="stack-group-heading"><h3>My technology toolkit</h3></div><ul>${profile.skills.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ul></article>`;
    if (key === 'experience.about') {
      if (!baseline || JSON.stringify(profile.experience) === JSON.stringify(baseline.experience))
        return expand(original[key]);
      return profile.experience
        .map(
          (e) =>
            `<article class="experience-row"><p class="experience-date">${escapeHtml(e.dates.toUpperCase())}</p><div><h3>${escapeHtml(e.role)}</h3><p class="experience-company">${escapeHtml(e.company)}</p><p>${escapeHtml(e.description)}</p></div></article>`,
        )
        .join('');
    }
    return '';
  }
  // Older saved templates can still contain a retired internal call to action.
  return expand(reference.pages[name]?.html || source.pages[name].html).replace(
    /<a\b[^>]*href="([^"]*)"[^>]*>[\s\S]*?<\/a>/g,
    (anchor, href: string) =>
      !isRemovedPageHref(href)
        ? anchor
        : name === 'tools'
          ? `<a class="text-link" href="${escapeHtml(profile.github || '/tools')}">Explore ${profile.github ? 'my GitHub' : 'all tools'} ${icon('arrow')}</a>`
          : '',
  );
}
