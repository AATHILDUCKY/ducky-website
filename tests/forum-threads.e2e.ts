import { test, expect } from '@playwright/test';
import { Pool } from 'pg';
import { randomUUID, createHmac } from 'node:crypto';
import { createForumSlug, forumPostPath } from '../lib/forum-slugs.mjs';
const db = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const ids = Array.from({ length: 4 }, () => randomUUID());
const marker = 'forumthreadqa' + randomUUID().replaceAll('-', '');
const titles = [
  marker + ' Writing safer API integrations',
  marker + ' Writing safer API integrations',
  marker + ' தமிழ் குறிப்புகள்',
  marker + ' Private draft',
];
const slugs = ids.map((id, i) => createForumSlug(titles[i], id));
const paths = ids.map((id, i) => forumPostPath({ id, slug: slugs[i] }));
const address = '198.51.100.42';
test.beforeAll(async () => {
  for (let i = 0; i < ids.length; i++)
    await db.query('INSERT INTO forum_posts(id,title,content,slug,status) VALUES($1,$2,$3,$4,$5)', [
      ids[i],
      titles[i],
      'A useful discussion about safer APIs and practical engineering.',
      slugs[i],
      i === 3 ? 'draft' : 'published',
    ]);
});
test.afterAll(async () => {
  await db.query('DELETE FROM forum_posts WHERE id=ANY($1::uuid[])', [ids]);
  await db.query('DELETE FROM forum_reply_limits WHERE key=$1', [
    createHmac('sha256', process.env.SESSION_SECRET!)
      .update('forum:' + address)
      .digest('hex'),
  ]);
  await db.end();
});

test('every published slug has a canonical indexable page, old links redirect, and sitemap responses revalidate', async ({
  request,
  page,
}) => {
  for (const i of [0, 1, 2]) {
    const old = await request.get('/forum/' + ids[i], { maxRedirects: 0 });
    expect(old.status()).toBe(308);
    expect(old.headers().location).toBe(paths[i]);
    await page.goto(paths[i]);
    await expect(page.locator('h1').first()).toHaveText(titles[i]);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      new URL(paths[i], process.env.SITE_URL).href,
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /^index, follow$/);
  }
  expect(slugs[0]).not.toBe(slugs[1]);
  expect((await request.get(paths[3])).status()).toBe(404);
  const bucket = (
    await db.query('SELECT ((sitemap_id-1)/10000)::text AS bucket FROM forum_posts WHERE id=$1', [
      ids[0],
    ])
  ).rows[0].bucket;
  const shard = await request.get(`/sitemaps/forum-${bucket}.xml`);
  const xml = await shard.text();
  for (const path of paths.slice(0, 3)) expect(xml).toContain(path);
  expect(xml).not.toContain(paths[3]);
  expect(xml).not.toContain('/forum/' + ids[0]);
  const cached = await request.get(`/sitemaps/forum-${bucket}.xml`, {
    headers: { 'if-none-match': shard.headers().etag },
  });
  expect(cached.status()).toBe(304);
  expect(await cached.body()).toHaveLength(0);
  const index = await request.get('/sitemap.xml');
  expect(await index.text()).toContain('<lastmod>');
});

test('feed comments expand, support recursive replies, paginate branches and hide moderated descendants', async ({
  page,
  browser,
}) => {
  await page.setExtraHTTPHeaders({ 'x-forwarded-for': address });
  await page.goto('/forum?q=' + marker);
  const card = page.locator(`.forum-post[data-post-id="${ids[0]}"]`);
  await expect(card.locator('.forum-inline-comments')).toHaveCount(0);
  await card.getByRole('link', { name: '0 comments', exact: true }).click();
  await expect(card.locator('.forum-inline-comments')).toBeVisible();
  await card.getByLabel('Your name (optional)').fill('Thread Guest');
  await card.getByLabel('Your reply', { exact: true }).fill('A root comment for the discussion.');
  await card.getByRole('button', { name: 'Post reply', exact: true }).click();
  const root = card
    .locator('.forum-reply')
    .filter({ has: page.locator('p', { hasText: 'A root comment for the discussion.' }) });
  await expect(root).toHaveCount(1);
  const rootId = await root.getAttribute('data-comment-id');
  await root.getByRole('button', { name: 'Reply', exact: true }).click();
  await root
    .getByLabel('Your reply', { exact: true })
    .fill('A child reply with <script>unsafe()</script> text.');
  await root.getByRole('button', { name: 'Post reply', exact: true }).click();
  await expect(root.locator('.forum-thread-toggle').first()).toContainText('View 1 reply');
  await root.locator('.forum-thread-toggle').first().click();
  const child = root.locator('.forum-reply').filter({
    has: page.locator('p', { hasText: 'A child reply with <script>unsafe()</script> text.' }),
  });
  await expect(child).toHaveCount(1);
  const childId = await child.getAttribute('data-comment-id');
  await child.getByRole('button', { name: 'Reply', exact: true }).click();
  await child.getByLabel('Your reply', { exact: true }).fill('A reply to the child comment.');
  await child.getByRole('button', { name: 'Post reply', exact: true }).click();
  await expect(child.locator('.forum-thread-toggle').first()).toContainText('View 1 reply');
  await child.locator('.forum-thread-toggle').first().click();
  await expect(child.locator('.forum-reply p')).toContainText('A reply to the child comment.');
  const rows = (
    await db.query(
      'SELECT id,parent_id,root_id,depth FROM forum_replies WHERE post_id=$1 ORDER BY depth',
      [ids[0]],
    )
  ).rows;
  expect(rows.map((row) => row.depth)).toEqual([0, 1, 2]);
  expect(rows[1].parent_id).toBe(rootId);
  expect(rows[2].parent_id).toBe(childId);
  expect(rows.every((row) => row.root_id === rootId)).toBeTruthy();
  expect(
    (await db.query('SELECT reply_count FROM forum_posts WHERE id=$1', [ids[0]])).rows[0]
      .reply_count,
  ).toBe(3);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `nested thread width ${width}`,
    ).toBeTruthy();
  }
  // Sibling branches fetch only 20 rows at a time; no unbounded recursive request.
  await db.query(
    'INSERT INTO forum_replies(post_id,submission_id,name,content,parent_id) SELECT $1,gen_random_uuid(),$2,$3||g,$4 FROM generate_series(1,22) g',
    [ids[0], 'Branch Guest', 'Extra reply ', rootId],
  );
  await page.goto(paths[0] + '?thread=' + rootId);
  await expect(
    page.locator('.forum-replies > .forum-comment-branch > .forum-reply-list > .forum-reply'),
  ).toHaveCount(20);
  await page.getByRole('link', { name: 'Load more replies', exact: true }).click();
  await expect(
    page.locator('.forum-replies > .forum-comment-branch > .forum-reply-list > .forum-reply'),
  ).toHaveCount(23);
  const guest = await browser.newPage();
  try {
    // Server-enforced validation rejects a parent from another post.
    await guest.setExtraHTTPHeaders({ 'x-forwarded-for': address });
    await guest.goto(paths[1]);
    await guest
      .getByLabel('Your reply', { exact: true })
      .fill('Cross-post reply must not be saved.');

    await guest
      .locator('.forum-reply-form input[name="parentId"]')
      .evaluate((el: HTMLInputElement, value) => {
        el.value = value;
      }, rootId!);
    await guest.getByRole('button', { name: 'Post reply', exact: true }).click();
    await expect(guest.getByRole('status')).toContainText('unavailable for replies');
    await page.goto('/admin/login');
    await page.getByLabel('Username', { exact: true }).fill(process.env.ADMIN_USERNAME!);
    await page.getByLabel('Password', { exact: true }).fill(process.env.ADMIN_PASSWORD!);
    await page.getByRole('button', { name: 'Enter your studio' }).click();
    await expect(page.locator('.contact-inbox-shortcut')).toBeVisible();
    await page.goto(paths[0]);
    const ownerRoot = page.locator(`article[data-comment-id="${rootId}"]`);
    await ownerRoot.getByRole('button', { name: 'Hide reply', exact: true }).click();
    await expect(ownerRoot).toHaveClass(/forum-reply-hidden/);
    await guest.goto(paths[0]);
    await expect(guest.locator('.forum-reply')).toHaveCount(0);
    expect((await guest.request.get(paths[0] + '?thread=' + childId)).status()).toBe(404);
    expect(
      (await db.query('SELECT reply_count FROM forum_posts WHERE id=$1', [ids[0]])).rows[0]
        .reply_count,
    ).toBe(0);
    await ownerRoot.getByRole('button', { name: 'Restore reply', exact: true }).click();
    await expect(ownerRoot).not.toHaveClass(/forum-reply-hidden/);
    expect(
      (await db.query('SELECT reply_count FROM forum_posts WHERE id=$1', [ids[0]])).rows[0]
        .reply_count,
    ).toBe(25);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: 'artifacts/forum-thread-desktop.png', caret: 'initial' });
  } finally {
    await guest.close();
  }
});
