import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { profileSocialLinks } from '../lib/social-links';
import { socialLinksSchema } from '../lib/validation';
import { HeroSocialLinks } from '../components/hero-social-links';

const profile = {
  github: 'https://github.com/example',
  linkedin: 'https://www.linkedin.com/in/example',
  email: 'hello@example.com',
};

test('legacy profiles retain the existing YouTube link without inventing Instagram or X handles', () => {
  const before = structuredClone(profile);
  const links = profileSocialLinks(profile);
  assert.equal(links.youtube, 'https://www.youtube.com/@aathilducky');
  assert.equal(links.instagram, '');
  assert.equal(links.x, '');
  assert.deepEqual(profile, before);
  assert.equal(profileSocialLinks({ ...profile, youtube: '' }).youtube, '');
});

test('social settings trim public URLs and allow empty fields for hiding icons', () => {
  const result = socialLinksSchema.parse({
    ...profileSocialLinks(profile),
    instagram: '  https://www.instagram.com/example/  ',
    x: 'https://x.com/example',
    youtube: '',
  });
  assert.equal(result.instagram, 'https://www.instagram.com/example/');
  assert.equal(result.x, 'https://x.com/example');
  assert.equal(result.youtube, '');
  assert.equal(result.github, profile.github);
});

test('social settings reject executable, malformed, credential-bearing, and oversized links', () => {
  for (const value of [
    'javascript:alert(1)',
    'data:text/html,unsafe',
    'ftp://example.com',
    'not-a-url',
    'https://user:password@example.com/',
    'https://example.com/' + 'x'.repeat(500),
  ]) {
    assert.equal(
      socialLinksSchema.safeParse({ ...profileSocialLinks(profile), instagram: value }).success,
      false,
      value,
    );
  }
});

test('hero renders configured Instagram and X links and respects cleared social fields', () => {
  const html = renderToStaticMarkup(
    createElement(HeroSocialLinks, {
      profile: {
        ...profile,
        instagram: 'https://www.instagram.com/example/',
        x: 'https://x.com/example',
        youtube: '',
      },
    }),
  );
  assert.ok(html.includes('href="https://www.instagram.com/example/"'));
  assert.ok(html.includes('aria-label="Instagram (opens in a new tab)"'));
  assert.ok(html.includes('href="https://x.com/example"'));
  assert.ok(html.includes('aria-label="X (opens in a new tab)"'));
  assert.ok(html.includes('rel="noopener noreferrer"'));
  assert.ok(html.includes('href="mailto:hello@example.com"'));
  assert.ok(!html.includes('youtube.com'));
});
