import test from 'node:test';
import assert from 'node:assert/strict';
import { postSchema, safeExternal, slugSchema } from '../lib/validation';
const valid = {
  id: '',
  title: 'An interesting post',
  slug: 'an-interesting-post',
  excerpt: 'A helpful introduction for a reader.',
  content: '## Something worth sharing\n\nUseful details go here.',
  category: 'Notes',
  tags: ['learning'],
  status: 'draft',
  seo_title: '',
  seo_description: '',
  cover_id: '',
};
test('draft and published posts validate with optional SEO fields', () => {
  assert.ok(postSchema.safeParse(valid).success);
  assert.ok(postSchema.safeParse({ ...valid, status: 'published' }).success);
});
test('invalid slugs, content, cover references, and statuses are rejected', () => {
  for (const slug of ['../admin', 'Hello world', 'a/b', '-slug', 'slug-', ''])
    assert.equal(slugSchema.safeParse(slug).success, false);
  for (const patch of [
    { status: 'scheduled' },
    { cover_id: '../../etc/passwd' },
    { content: '' },
    { tags: Array(13).fill('tag') },
    { seo_description: 'a'.repeat(171) },
  ])
    assert.equal(postSchema.safeParse({ ...valid, ...patch }).success, false);
});
test('profile links allow HTTP(S), excluding executable URLs', () => {
  for (const value of [
    'javascript:alert(1)',
    'data:text/html,<h1>hello</h1>',
    'file:///etc/passwd',
  ])
    assert.equal(safeExternal.safeParse(value).success, false);
  for (const value of ['https://github.com/AATHILDUCKY', 'http://localhost:3000', ''])
    assert.ok(safeExternal.safeParse(value).success);
});
