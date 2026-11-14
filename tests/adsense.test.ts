import test from 'node:test';
import assert from 'node:assert/strict';
import { adSlotId, isAdPage } from '../lib/adsense';

test('ad eligibility excludes home, private pages, editors, and unknown routes', () => {
  for (const path of [
    '/',
    '/admin',
    '/admin/login',
    '/forum/new',
    '/forum/post/edit',
    '/unknown',
    '/api/contact',
  ])
    assert.equal(isAdPage(path), false, path);
  for (const path of [
    '/about',
    '/tools',
    '/contact',
    '/research',
    '/blog',
    '/blog/article',
    '/forum',
    '/forum/post',
    '/blog/',
  ])
    assert.equal(isAdPage(path), true, path);
});

test('only a real numeric slot configuration enables ad requests', () => {
  for (const value of [
    undefined,
    '',
    ' ',
    'YOUR_NUMERIC_SLOT_ID',
    'ca-pub-6405478732026557',
    '<script>',
  ])
    assert.equal(adSlotId(value), '');
  assert.equal(adSlotId(' 1234567890 '), '1234567890');
});
