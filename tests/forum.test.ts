import test from 'node:test';
import assert from 'node:assert/strict';
import {
  forumPostSchema,
  forumReplySchema,
  forumSearch,
  encodeForumCursor,
  decodeForumCursor,
  forumExcerpt,
} from '../lib/forum-validation';
import { forumLink, forumLinks } from '../lib/forum-links';
import { sitemapUrls, sitemapIndex, SITEMAP_SHARD_SIZE } from '../lib/sitemap-xml';
import { forumFeedScore, FORUM_RANKED_CANDIDATES } from '../lib/forum-ranking';
import { createForumSlug, forumPostPath } from '../lib/forum-slugs.mjs';
const id = 'aafe0ecf-f7f3-48ee-8c67-94647810cb05';
test('post slugs describe the title, retain Unicode and avoid reserved or duplicate names', () => {
  assert.equal(
    createForumSlug('A safer API: useful tips!', id),
    'a-safer-api-useful-tips-aafe0ecff7f3',
  );
  assert.notEqual(
    createForumSlug('Same title', id),
    createForumSlug('Same title', 'bafe0ecf-f7f3-48ee-8c67-94647810cb05'),
  );
  assert.ok(createForumSlug('தமிழ் குறிப்புகள்', id).startsWith('தமிழ்-குறிப்புகள்-'));
  assert.equal(createForumSlug('!!!', id), 'post-aafe0ecff7f3');
  assert.match(forumPostPath({ id, slug: 'தமிழ்-test' }), /^\/forum\/%/);
  assert.equal(
    forumReplySchema.safeParse({
      postId: id,
      submissionId: id,
      parentId: 'bad',
      name: 'Guest',
      content: 'A reply',
    }).success,
    false,
  );
});
test('lightweight feed balances freshness and capped engagement with diminishing returns', () => {
  const date = '2026-11-14T12:00:00Z';
  const score = (likes: number, replies = 0) => forumFeedScore(date, likes, replies);
  assert.ok(score(1) > score(0));
  assert.ok(score(0, 1) > score(1));
  assert.ok(score(1) - score(0) > score(100) - score(99));
  assert.equal(score(1001, 21), score(1000, 20));
  assert.ok(forumFeedScore('2026-11-14T13:00:00Z', 0, 0) > score(0));
  assert.ok(forumFeedScore('2026-11-15T12:00:00Z', 0, 0) > score(10));
  assert.ok(FORUM_RANKED_CANDIDATES <= 500);
});
test('forum URLs allow safe links and normalize Instagram reels without accepting lookalike hosts', () => {
  assert.equal(
    forumLink('https://www.instagram.com/reel/ABC_xyz/?igsh=tracking')?.embed,
    'https://www.instagram.com/reel/ABC_xyz/embed/',
  );
  assert.equal(forumLink('https://github.com/owner/repo')?.label, 'owner / repo');
  for (const url of [
    'javascript:alert(1)',
    'data:text/html,hi',
    'https://name:password@example.com',
  ])
    assert.equal(forumLink(url), null);
  assert.equal(forumLink('https://instagram.com.attacker.test/reel/ABC/')?.kind, 'link');
  assert.equal(
    forumLinks(
      'https://github.com/owner/repo\nhttps://github.com/owner/repo',
      'https://github.com/owner/repo',
    ).length,
    1,
  );
});
test('forum validates Markdown, uploaded image references and public reply limits', () => {
  const post = {
    id,
    revision: '',
    title: 'A discovery',
    content: '# Markdown\n\nHello **world**',
    link_url: '',
    images: [],
    status: 'published',
  };
  assert.equal(forumPostSchema.safeParse(post).success, true);
  for (const change of [
    { title: 'ab' },
    { content: '' },
    { content: 'x'.repeat(20001) },
    { status: 'invalid' },
    { images: [{ id: 'not-an-id' }] },
    { link_url: 'javascript:alert(1)' },
  ])
    assert.equal(forumPostSchema.safeParse({ ...post, ...change }).success, false);
  const reply = { postId: id, submissionId: id, name: ' ', content: 'Hello there!' };
  assert.equal(forumReplySchema.parse(reply).name, 'Guest');
  assert.equal(forumReplySchema.safeParse({ ...reply, content: 'x'.repeat(2001) }).success, false);
  assert.equal(forumReplySchema.safeParse({ ...reply, content: ' ' }).success, false);
});
test('forum cursors preserve timestamp precision and are scoped to normalized search', () => {
  const cursor = { date: '2026-11-13T12:34:56.123456Z', id, rank: 0.03456789, q: 'security tools' };
  const value = encodeForumCursor(cursor);
  assert.deepEqual(decodeForumCursor(value, 'security tools'), cursor);
  assert.equal(decodeForumCursor(value, 'different query'), null);
  assert.equal(decodeForumCursor('garbage'), null);
  assert.equal(decodeForumCursor('x'.repeat(2000)), null);
  assert.equal(forumSearch('  Security   tools  '), 'Security tools');
  assert.equal(forumExcerpt('## Hello **world** [link](https://example.com)'), 'Hello world link');
});
test('sitemap XML escapes URLs, includes genuine modification dates and stays within Google shard limits', () => {
  const xml = sitemapUrls([
    {
      url: 'https://example.com/forum/test?a=1&b=2',
      modified: '2026-11-13T12:00:00Z',
      images: ['https://example.com/media/test'],
    },
  ]);
  assert.match(xml, /a=1&amp;b=2/);
  assert.match(xml, /<lastmod>2026-11-13T12:00:00.000Z<\/lastmod>/);
  assert.match(xml, /<image:loc>https:\/\/example.com\/media\/test/);
  assert.match(sitemapIndex(['https://example.com/sitemaps/forum-0.xml']), /<sitemapindex/);
  assert.ok(SITEMAP_SHARD_SIZE <= 50000);
  assert.ok(
    Buffer.byteLength(
      sitemapUrls(
        Array.from({ length: SITEMAP_SHARD_SIZE }, (_, i) => ({
          url: `https://example.com/forum/${i}`,
          images: Array(4).fill('https://example.com/media/aafe0ecf-f7f3-48ee-8c67-94647810cb05'),
        })),
      ),
    ) <
      50 * 1024 * 1024,
  );
});
