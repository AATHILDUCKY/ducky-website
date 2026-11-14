import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { upgradeHomepage } from '../lib/homepage-migration.mjs';
import { homepageSchema, validHomeHref } from '../lib/homepage-schema';
import { createHomepageDefaults } from '../lib/homepage-defaults.mjs';
import { HomepageSections } from '../components/homepage-sections';
import { landingHomepage } from '../lib/homepage-art-direction';
const profile = {
  name: 'Test Person',
  handle: 'tester',
  company: 'Security Company',
  location: 'Sri Lanka',
  email: 'test@example.com',
  portrait: '/portrait.webp',
  experience: [
    {
      role: 'Engineer',
      company: 'Updated Company',
      dates: '2025 — Present',
      description: 'A description already edited by the owner.',
    },
  ],
};
const defaults = () => homepageSchema.parse(createHomepageDefaults(profile, undefined));
test('landing art direction refreshes template copy without changing saved data', () => {
  const saved = defaults();
  const original = structuredClone(saved);
  const refreshed = landingHomepage(saved);
  assert.equal(refreshed.hero.heading, 'Breaking things.');
  assert.equal(refreshed.hero.accentHeading, 'Building trust.');
  assert.deepEqual(refreshed.order, [
    'hero',
    'highlights',
    'experience',
    'tools',
    'about',
    'writeups',
    'contact',
  ]);
  assert.equal(homepageSchema.safeParse(refreshed).success, true);
  assert.deepEqual(saved, original);
  assert.deepEqual(landingHomepage(refreshed), refreshed);
});
test('experience follows the metric section and section labels follow the new order', () => {
  const saved = defaults();
  saved.order = ['hero', 'highlights', 'tools', 'about', 'experience', 'writeups', 'contact'];
  saved.experience.eyebrow = '03 / THE JOURNEY';
  saved.tools.eyebrow = '01 / THE WORKBENCH';
  saved.about.eyebrow = '02 / BEHIND THE HANDLE';
  const refreshed = landingHomepage(saved);
  assert.deepEqual(refreshed.order.slice(0, 3), ['hero', 'highlights', 'experience']);
  assert.deepEqual(refreshed.order.slice(-2), ['writeups', 'contact']);
  assert.equal(refreshed.experience.eyebrow, '01 / THE JOURNEY');
  assert.equal(refreshed.tools.eyebrow, '02 / THE WORKBENCH');
  assert.equal(refreshed.about.eyebrow, '03 / BEHIND THE HANDLE');
  assert.deepEqual(refreshed.experience.items, saved.experience.items);
  assert.deepEqual(landingHomepage(refreshed), refreshed);
});
test('existing landing layout moves highlights after the hero and keeps blogs before contact', () => {
  const saved = defaults();
  saved.order = ['hero', 'tools', 'about', 'highlights', 'experience', 'writeups', 'contact'];
  const original = structuredClone(saved);
  const refreshed = landingHomepage(saved);
  assert.deepEqual(refreshed.order.slice(0, 2), ['hero', 'highlights']);
  assert.deepEqual(refreshed.order.slice(-2), ['writeups', 'contact']);
  assert.deepEqual(refreshed.highlights, saved.highlights);
  assert.deepEqual(saved, original);
  assert.deepEqual(landingHomepage(refreshed), refreshed);
});
test('landing art direction preserves custom copy, branding, links, order, and hidden sections', () => {
  const saved = defaults();
  saved.hero.heading = 'A custom introduction';
  saved.hero.description = 'My own story.';
  saved.about.enabled = false;
  saved.order.reverse();
  saved.branding.name = 'My custom brand';
  saved.contact.email = 'hello@example.com';
  const refreshed = landingHomepage(saved);
  assert.equal(refreshed.hero.heading, saved.hero.heading);
  assert.equal(refreshed.hero.description, saved.hero.description);
  assert.equal(refreshed.about.enabled, false);
  assert.deepEqual(refreshed.order, saved.order);
  assert.deepEqual(refreshed.branding, saved.branding);
  assert.deepEqual(refreshed.hero.buttons, saved.hero.buttons);
  assert.equal(refreshed.contact.email, saved.contact.email);
});
test('homepage defaults preserve profile content without retired sections or navigation', () => {
  const data = defaults();
  assert.equal(data.hero.portrait.src, profile.portrait);
  assert.equal(data.contact.email, profile.email);
  assert.equal(data.experience.items[0].description, profile.experience[0].description);
  assert.equal(data.version, 3);
  assert.equal(data.order.length, 7);
  assert.ok(!('projects' in data));
  assert.ok(!('freelance' in data));
  assert.ok(data.navigation.items.some((link) => link.href === '/blog'));
});
test('homepage links allow useful destinations and reject executable or ambiguous URLs', () => {
  for (const href of [
    '/blog/example',
    '/blog?q=security#posts',
    '#home-about',
    'https://example.com/path',
    'mailto:test@example.com',
    'tel:+94123456789',
  ])
    assert.equal(validHomeHref(href), true, href);
  for (const href of [
    '/projects',
    '/projects/example?view=full',
    '/freelance/',
    '/admin/projects',
    '/admin/freelance?edit=1',
    'javascript:alert(1)',
    'data:text/html,unsafe',
    '//example.com',
    '/\\example.com',
    'https://user:password@example.com',
    'https://example.com/\nunsafe',
    'mailto:not-an-email',
    '',
  ])
    assert.equal(validHomeHref(href), false, href);
});
test('homepage schema rejects duplicated sections, item identities, and unsupported image sources', () => {
  const duplicateSection = defaults();
  duplicateSection.order[1] = duplicateSection.order[0];
  assert.equal(homepageSchema.safeParse(duplicateSection).success, false);
  const duplicateItem = defaults();
  duplicateItem.tools.items.push(duplicateItem.tools.items[0]);
  assert.equal(homepageSchema.safeParse(duplicateItem).success, false);
  const externalImage = defaults();
  externalImage.hero.portrait.src = 'https://example.com/unoptimized.png';
  assert.equal(homepageSchema.safeParse(externalImage).success, false);
});
test('public homepage follows saved order and visibility while rendering text safely', () => {
  const data = defaults();
  data.tools.enabled = false;
  data.order = ['contact', ...data.order.filter((key) => key !== 'contact')];
  data.hero.description = '**Safe emphasis** <script>alert(1)</script>';
  const html = renderToStaticMarkup(createElement(HomepageSections, { data }));
  assert.ok(html.indexOf('data-home-section="contact"') < html.indexOf('data-home-section="hero"'));
  assert.ok(!html.includes('data-home-section="tools"'));
  assert.ok(html.includes('<strong>Safe emphasis</strong>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
});

test('homepage upgrades combine the original vulnerability metrics and preserve custom edits idempotently', () => {
  const data = defaults();
  assert.equal(data.highlights.items[0].value, '100+');
  assert.equal(data.highlights.items.length, 3);
  assert.ok(data.order.includes('writeups'));
  const old = {
    ...data,
    version: 1,
    order: data.order.filter((key) => key !== 'writeups'),
    hero: { ...data.hero, heading: 'My edited introduction' },
  };
  const upgraded = upgradeHomepage(old);
  assert.equal(homepageSchema.safeParse(upgraded).success, true);
  assert.equal(upgraded.hero.heading, 'My edited introduction');
  assert.deepEqual(upgradeHomepage(upgraded), upgraded);
});

test('editor input limits and required fields follow the backend schema', async () => {
  const { homepageFieldSpec, panelForHomeField, homepageItemForField } =
    await import('../lib/homepage-editing');
  assert.deepEqual(homepageFieldSpec('hero.heading'), { maxLength: 180, required: false });
  assert.equal(homepageFieldSpec('hero.description').maxLength, 3000);
  assert.equal(homepageFieldSpec('hero.portrait.tags.0').maxLength, 80);
  assert.equal(homepageFieldSpec('navigation.items.0.href').maxLength, 500);
  assert.equal(homepageFieldSpec('hero.learningLabel').required, false);
  assert.equal(panelForHomeField('navigation.items.1.href'), 'branding');
  assert.equal(
    homepageItemForField(defaults(), 'experience.items.0.role'),
    'experience.items::experience-0',
  );
  const minimal = defaults();
  minimal.navigation.items = [];
  assert.equal(homepageSchema.safeParse(minimal).success, true);
});

test('homepage revisions merge unrelated sections and reject overlapping edits', async () => {
  const { homepageHashes, mergeHomepageChanges } = await import('../lib/homepage-revisions');
  const original = defaults();
  const expected = homepageHashes(original);
  const remote = structuredClone(original);
  remote.footer.copyright = 'Remote footer';
  const local = structuredClone(original);
  local.hero.heading = 'Local heading';
  const merged = mergeHomepageChanges(remote, local, expected);
  assert.deepEqual(merged.conflicts, []);
  assert.equal(merged.data.hero.heading, 'Local heading');
  assert.equal(merged.data.footer.copyright, 'Remote footer');
  assert.equal(original.hero.heading, 'Learning in public.');
  remote.hero.heading = 'A different remote heading';
  assert.deepEqual(mergeHomepageChanges(remote, local, expected).conflicts, ['hero']);
  remote.hero.heading = local.hero.heading;
  assert.deepEqual(mergeHomepageChanges(remote, local, expected).conflicts, []);
});

test('version 2 migration removes retired pages and preserves unrelated custom content and its input', () => {
  const current = defaults();
  const legacy = {
    ...current,
    version: 2,
    branding: { ...current.branding, name: 'My custom brand' },
    order: [...current.order, 'projects', 'freelance'],
    projects: { enabled: true, items: [{ title: 'Archived project' }] },
    freelance: { enabled: true, description: 'Archived services' },
    navigation: {
      ...current.navigation,
      items: [
        ...current.navigation.items,
        { id: 'old-projects', label: 'Projects', href: '/projects/' },
        { id: 'old-freelance', label: 'Freelance', href: '/freelance?view=all' },
      ],
    },
    footer: {
      ...current.footer,
      links: [
        ...current.footer.links,
        { id: 'old-case', label: 'Case study', href: '/projects/old-case' },
      ],
    },
    about: { ...current.about, link: { ...current.about.link, href: '/projects' } },
    hero: {
      ...current.hero,
      heading: 'My custom introduction',
      buttons: [
        ...current.hero.buttons,
        {
          id: 'old-button',
          label: 'My services',
          href: '/freelance',
          style: 'secondary',
          icon: 'arrow',
        },
      ],
    },
  };
  const before = structuredClone(legacy);
  const migrated = homepageSchema.parse(upgradeHomepage(legacy));
  assert.equal(migrated.version, 3);
  assert.equal(migrated.branding.name, 'My custom brand');
  assert.equal(migrated.hero.heading, 'My custom introduction');
  assert.deepEqual(migrated.order, current.order);
  assert.deepEqual(migrated.navigation.items, current.navigation.items);
  assert.deepEqual(migrated.footer.links, current.footer.links);
  assert.deepEqual(migrated.hero.buttons, current.hero.buttons);
  assert.equal(migrated.about.link.href, '/about');
  assert.equal('projects' in migrated, false);
  assert.equal('freelance' in migrated, false);
  assert.deepEqual(legacy, before);
  assert.deepEqual(upgradeHomepage(migrated), migrated);
  const html = renderToStaticMarkup(createElement(HomepageSections, { data: migrated }));
  assert.ok(!html.includes('data-home-section="projects"'));
  assert.ok(!html.includes('data-home-section="freelance"'));
  assert.ok(!/href="\/(projects|freelance)(\/|\?|"|#)/.test(html));
});

test('journal redesign leads with writing and preserves personalized content and layout', async () => {
  const { journalHomepage } = await import('../lib/homepage-journal.mjs');
  const data = defaults();
  assert.deepEqual(data.order.slice(0, 3), ['hero', 'writeups', 'tools']);
  assert.equal(data.hero.buttons[0].href, '/blog');
  assert.equal(data.hero.portrait.name, profile.name);
  assert.ok(data.hero.portrait.tags.includes('Content Creator'));
  assert.deepEqual(journalHomepage(data, profile), data);
  const custom = structuredClone(data);
  custom.hero.heading = 'My custom journal';
  custom.hero.description = 'A personal introduction';
  custom.hero.buttons[0].href = '/research';
  custom.writeups.heading = 'My custom reading list';
  custom.order.reverse();
  assert.deepEqual(journalHomepage(custom, profile), custom);
  assert.equal(data.order[0], 'hero');
});
