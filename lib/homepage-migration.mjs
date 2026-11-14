import { isRemovedPageHref } from './site-navigation.mjs';
/** Upgrade saved configurations without replacing the owner's customized content. */
export const defaultWriteups = {
  enabled: true,
  eyebrow: '04 / FIELD NOTES',
  heading: 'Research, notes &\nthings worth sharing.',
  description: 'A few recent writeups on security, software, and what I’m learning.',
  count: 3,
  link: { id: 'writeups-link', label: 'See more writeups', href: '/blog' },
};
export function upgradeHomepage(value) {
  const data = structuredClone(value);
  if (data.version === 1) {
    data.version = 2;
    data.writeups = structuredClone(defaultWriteups);
    const position = data.order.indexOf('freelance');
    data.order.splice(position < 0 ? data.order.length : position, 0, 'writeups');
    const items = data.highlights.items;
    const iag = items.find((item) => item.id === 'highlight-iag');
    const lms = items.find((item) => item.id === 'highlight-lms');
    if (iag && lms) {
      data.highlights.items = items.flatMap((item) =>
        item.id === 'highlight-iag'
          ? [
              {
                id: 'highlight-vulnerabilities',
                value: '100+',
                suffix: '',
                label: 'Vulnerabilities identified',
                context: 'Across identity, learning & enterprise platforms',
              },
            ]
          : item.id === 'highlight-lms'
            ? []
            : [item],
      );
    }
  }
  if (data.version === 2 || data.version === 3) {
    data.version = 3;
    data.order = data.order.filter((key) => key !== 'projects' && key !== 'freelance');
    delete data.projects;
    delete data.freelance;
    data.navigation.items = data.navigation.items.filter((item) => !isRemovedPageHref(item.href));
    data.footer.links = data.footer.links.filter((item) => !isRemovedPageHref(item.href));
    data.hero.buttons = data.hero.buttons.filter((item) => !isRemovedPageHref(item.href));
    data.tools.items = data.tools.items.filter((item) => !isRemovedPageHref(item.href));
    if (isRemovedPageHref(data.navigation.contact.href)) data.navigation.contact.href = '/contact';
    for (const [key, href, label] of [
      ['about', '/about', 'More about me'],
      ['tools', '/tools', 'Explore all tools'],
      ['writeups', '/blog', 'See more writeups'],
      ['contact', '/contact', 'Contact details'],
    ]) {
      if (isRemovedPageHref(data[key].link.href)) {
        Object.assign(data[key].link, { href, label });
      }
    }
    if (data.writeups.eyebrow === '05 / FIELD NOTES') data.writeups.eyebrow = '04 / FIELD NOTES';
    if (data.contact.eyebrow === '06 / GET IN TOUCH') data.contact.eyebrow = '05 / GET IN TOUCH';
  }
  return data;
}
