import test from 'node:test';
import assert from 'node:assert/strict';
import { relatedWriteups } from '../lib/related-writeups';
import type { PostSummary } from '../lib/types';
const now = Date.parse('2026-11-11T12:00:00Z');
const post = (slug: string, overrides: Partial<PostSummary> = {}): PostSummary => ({
  id: slug,
  slug,
  title: 'A field note',
  excerpt: 'A useful idea.',
  category: 'Notes',
  tags: [],
  status: 'published',
  seo_title: '',
  seo_description: '',
  cover_id: null,
  published_at: new Date('2026-10-01'),
  created_at: new Date('2026-10-01'),
  updated_at: new Date('2026-10-01'),
  read_time: 2,
  ...overrides,
});
const current = post('current', {
  title: 'Testing identity access',
  category: 'Security',
  tags: ['IAM'],
});

test('shared tags outrank category and title matches, and freshness cannot displace relevance', () => {
  const results = relatedWriteups(
    current,
    [
      post('newest', { published_at: new Date('2026-11-11') }),
      post('title', { title: 'Identity access guide' }),
      post('category', { category: 'Security' }),
      post('tag', { tags: ['IAM'], published_at: new Date('2025-01-01') }),
    ],
    3,
    now,
  );
  assert.deepEqual(
    results.map((r) => r.post.slug),
    ['tag', 'category', 'title'],
  );
  assert.deepEqual(
    results.map((r) => r.reason),
    ['Shared topics', 'Same category', 'Related subject'],
  );
});
test('tag normalization and deduplication tolerate case and extra spaces', () => {
  const results = relatedWriteups(
    current,
    [post('normalized', { tags: [' iam ', 'IAM'] })],
    3,
    now,
  );
  assert.equal(results[0].reason, 'Shared topics');
});
test('current article, drafts, scheduled posts, undated posts and duplicate slugs never appear', () => {
  const results = relatedWriteups(
    current,
    [
      current,
      post('draft', { status: 'draft' }),
      post('future', { published_at: new Date(now + 1) }),
      post('undated', { published_at: null }),
      post('same-id', { id: current.id }),
      post('okay'),
      post('okay'),
    ],
    3,
    now,
  );
  assert.deepEqual(
    results.map((r) => r.post.slug),
    ['okay'],
  );
});
test('unrelated fallback is newest first with stable slug tie breaks and a three-post cap', () => {
  const results = relatedWriteups(
    current,
    [
      post('old'),
      post('b', { published_at: new Date('2026-11-01') }),
      post('a', { published_at: new Date('2026-11-01') }),
      post('new', { published_at: new Date('2026-11-02') }),
    ],
    10,
    now,
  );
  assert.deepEqual(
    results.map((r) => r.post.slug),
    ['new', 'a', 'b'],
  );
  assert.ok(results.every((r) => r.reason === 'More to explore'));
});
test('generic title words and empty categories do not invent a topic match', () => {
  const results = relatedWriteups(
    post('blank', { title: 'How to use this', category: '' }),
    [post('other', { title: 'How to use your', category: '' })],
    3,
    now,
  );
  assert.equal(results[0].reason, 'More to explore');
});
test('small catalogues and zero limits are handled without modifying the candidate list', () => {
  const candidates = [post('only')];
  assert.equal(relatedWriteups(current, candidates, 3, now).length, 1);
  assert.deepEqual(relatedWriteups(current, candidates, 0, now), []);
  assert.deepEqual(relatedWriteups(current, [], 3, now), []);
  assert.equal(candidates.length, 1);
});
