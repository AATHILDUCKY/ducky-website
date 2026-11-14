import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { homepageSchema } from '../lib/homepage-schema';
import { createHomepageDefaults } from '../lib/homepage-defaults.mjs';
import { brandFonts, brandFontStyle } from '../lib/brand-fonts';
import { SiteBrand } from '../components/site-brand';
const defaults = () =>
  createHomepageDefaults(
    {
      name: 'Test Person',
      handle: 'tester',
      company: 'Company',
      email: 'test@example.com',
      location: 'Sri Lanka',
      portrait: '/portrait.webp',
      experience: [],
    },
    undefined,
  );
test('existing branding keeps its logo and text with the default font', () => {
  const data = defaults();
  delete data.branding.font;
  delete data.branding.fontWeight;
  const result = homepageSchema.parse(data);
  assert.equal(result.branding.font, 'system');
  assert.equal(result.branding.fontWeight, 700);
  assert.equal(result.branding.name, 'AATHIL DUCKY');
  assert.equal(result.branding.logo, '/reference/ducky-badge.webp');
});
test('brand typography accepts only the supplied font and weight choices', () => {
  for (const font of brandFonts)
    for (const weight of [500, 600, 700, 800]) {
      const data = defaults();
      Object.assign(data.branding, { font: font.id, fontWeight: weight });
      assert.equal(homepageSchema.safeParse(data).success, true);
    }
  for (const patch of [
    { font: 'url(https://example.com/font)' },
    { font: 'Inter; color:red' },
    { fontWeight: 300 },
    { fontWeight: '700' },
  ]) {
    const data = defaults();
    Object.assign(data.branding, patch);
    assert.equal(homepageSchema.safeParse(data).success, false);
  }
  assert.deepEqual(brandFontStyle('unknown'), brandFontStyle('system'));
});
test('shared branding renders the saved font, escapes the name, and supports text without a logo', () => {
  const branding = homepageSchema.parse(defaults()).branding;
  const html = renderToStaticMarkup(
    createElement(SiteBrand, {
      branding: { ...branding, name: '<Unsafe>', font: 'serif', fontWeight: 600, logo: '' },
    }),
  );
  assert.ok(html.includes('&lt;Unsafe&gt;'));
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('font-weight:600'));
  assert.ok(html.includes('Noto Serif'));
});
