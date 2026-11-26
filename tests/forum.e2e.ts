import { test, expect } from '@playwright/test';
import { Pool } from 'pg';
import { createHmac, randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { encodeForumCursor } from '../lib/forum-validation';
import { forumFeedScore } from '../lib/forum-ranking';
import { createForumSlug } from '../lib/forum-slugs.mjs';

const db = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const marker = 'forumqa' + randomUUID().replaceAll('-', '');
const ids = Array.from({ length: 23 }, () => randomUUID());
const mediaIds: string[] = [];
const createdIds: string[] = [];
const address = '192.0.2.' + (20 + Math.floor(Math.random() * 200));
test.beforeAll(async () => {
  const second = new Date(Date.now() - 86400000).toISOString().slice(0, 19);
  for (let i = 0; i < ids.length; i++) {
    const content =
      i === 20
        ? `${marker} security only.`
        : i === 21
          ? `${marker} tools only.`
          : `${marker} Useful **security** tools.\n\n- A helpful discovery\n- Another small idea`;
    await db.query(
      `INSERT INTO forum_posts(id,title,content,status,created_at) VALUES($1,$2,$3,$4,$5)`,
      [
        ids[i],
        i === 0 ? `${marker} security tools` : `${marker} Discovery ${i}`,
        content,
        i === 22 ? 'draft' : 'published',
        `${second}.${500000 - i}Z`,
      ],
    );
  }
});
test.afterAll(async () => {
  await db.query('DELETE FROM forum_posts WHERE id=ANY($1::uuid[])', [[...ids, ...createdIds]]);
  if (mediaIds.length) await db.query('DELETE FROM media WHERE id=ANY($1::uuid[])', [mediaIds]);
  const key = createHmac('sha256', process.env.SESSION_SECRET!)
    .update('forum:' + address)
    .digest('hex');
  await db.query('DELETE FROM forum_reply_limits WHERE key=$1', [key]);
  await db.query('DELETE FROM forum_like_limits WHERE key=$1', [
    createHmac('sha256', process.env.SESSION_SECRET!)
      .update('forum-like:' + address)
      .digest('hex'),
  ]);
  await db.end();
});

test('forum scroll loads 10 at a time without duplicates and searches all keywords by relevance', async ({
  page,
  browser,
}) => {
  await page.goto(`/forum?q=${marker}`);
  await expect(page.locator('.forum-hero,.forum-sidebar,.forum-art-card,.site-footer')).toHaveCount(
    0,
  );
  await expect(page.getByRole('link', { name: 'New post', exact: true })).toHaveCount(0);
  await expect(page.locator('.forum-post')).toHaveCount(10);
  const href = await page.getByRole('link', { name: 'Load 10 more posts' }).getAttribute('href');
  expect(href).toContain('after=');
  await page.locator('.forum-load-more').scrollIntoViewIfNeeded();
  await expect(page.locator('.forum-post')).toHaveCount(20);
  await page.locator('.forum-load-more').scrollIntoViewIfNeeded();
  await expect(page.locator('.forum-post')).toHaveCount(22);
  const seen = await page
    .locator('.forum-post')
    .evaluateAll((posts) => posts.map((post) => post.getAttribute('data-post-id')));
  expect(new Set(seen).size).toBe(22);
  expect(seen).not.toContain(ids[22]);

  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const crawler = await noJs.newPage();
  await crawler.goto(href!);
  await expect(crawler.locator('.forum-post')).toHaveCount(10);
  expect(await crawler.locator('.forum-post').first().getAttribute('data-post-id')).toBe(ids[10]);
  await noJs.close();

  await page.goto(`/forum?q=${marker}+security+tools`);
  await expect(page.locator('.forum-post').first()).toHaveAttribute('data-post-id', ids[0]);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await page.locator('.forum-load-more').scrollIntoViewIfNeeded();
  await expect(page.locator('.forum-post')).toHaveCount(20);
  const matched = await page
    .locator('.forum-post')
    .evaluateAll((posts) => posts.map((post) => post.getAttribute('data-post-id')));
  expect(matched).not.toContain(ids[20]);
  expect(matched).not.toContain(ids[21]);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `forum width ${width}`,
    ).toBeTruthy();
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`/forum?q=${marker}`);
  await page.screenshot({ path: 'artifacts/forum-desktop.png', fullPage: false, caret: 'initial' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/forum-mobile.png', fullPage: false, caret: 'initial' });
});

test('anonymous likes persist, retry safely, count distinct browsers and cannot react to drafts', async ({
  page,
  browser,
}) => {
  const id = ids[18];
  await page.setExtraHTTPHeaders({ 'x-forwarded-for': address });
  await page.goto(`/forum/${id}`);
  const sent = page.waitForRequest((r) => r.method() === 'POST' && r.url().includes('/forum/'));
  await page.getByRole('button', { name: 'Like post', exact: true }).click();
  const mutation = await sent;
  await expect(page.getByRole('button', { name: 'Unlike post', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('.forum-like-count')).toHaveText('1');
  await expect(page.getByRole('button', { name: 'Unlike post', exact: true })).toBeEnabled();
  expect(
    (await db.query('SELECT like_count FROM forum_posts WHERE id=$1', [id])).rows[0].like_count,
  ).toBe(1);
  const replay = await page.request.post(mutation.url(), {
    headers: mutation.headers(),
    data: mutation.postDataBuffer()!,
  });
  expect(replay.ok()).toBeTruthy();
  expect(
    (await db.query('SELECT count(*)::int AS n FROM forum_likes WHERE post_id=$1', [id])).rows[0].n,
  ).toBe(1);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Unlike post', exact: true })).toBeVisible();
  const other = await browser.newPage();
  try {
    await other.setExtraHTTPHeaders({ 'x-forwarded-for': address });
    await other.goto(`/forum/${id}`);
    await other.getByRole('button', { name: 'Like post', exact: true }).click();
    await expect(other.locator('.forum-like-count')).toHaveText('2');
    await expect(other.getByRole('button', { name: 'Unlike post', exact: true })).toBeEnabled();
    await page.reload();
    await expect(page.locator('.forum-like-count')).toHaveText('2');
    await page.getByRole('button', { name: 'Unlike post', exact: true }).click();
    await expect(page.locator('.forum-like-count')).toHaveText('1');
    await expect(page.getByRole('button', { name: 'Like post', exact: true })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await expect(page.getByRole('button', { name: 'Like post', exact: true })).toBeEnabled();
    const draft = await page.request.post(mutation.url(), {
      headers: mutation.headers(),
      data: mutation.postData()!.replaceAll(id, ids[22]),
    });
    expect(await draft.text()).toContain('no longer available');
    expect(
      (await db.query('SELECT like_count FROM forum_posts WHERE id=$1', [ids[22]])).rows[0]
        .like_count,
    ).toBe(0);
    const key = createHmac('sha256', process.env.SESSION_SECRET!)
      .update('forum-like:' + address)
      .digest('hex');
    await db.query('UPDATE forum_like_limits SET attempts=120 WHERE key=$1', [key]);
    await page.getByRole('button', { name: 'Like post', exact: true }).click();
    await expect(page.locator('.forum-like-error')).toContainText('Too many reactions');
    await expect(page.locator('.forum-like-count')).toHaveText('1');
  } finally {
    await other.close();
  }
});

test('ranked snapshots keep scroll order stable while engagement changes and latest remains crawlable', async ({
  page,
  browser,
}) => {
  const published: string[] = ids.slice(0, 22);
  const snapshot = (
    await db.query('INSERT INTO forum_feed_snapshots(post_ids) VALUES($1) RETURNING id', [
      published,
    ])
  ).rows[0].id;
  const cursor = encodeForumCursor({
    date: new Date().toISOString(),
    id: published[0],
    rank: 0,
    q: '',
    snapshot,
    position: 0,
  });
  try {
    await page.goto('/forum?after=' + cursor);
    await expect(page.locator('.forum-post')).toHaveCount(10);
    const before = await page
      .locator('.forum-post')
      .evaluateAll((posts) => posts.map((p) => p.getAttribute('data-post-id')));
    await db.query(
      'INSERT INTO forum_likes(post_id,visitor_id) SELECT $1,gen_random_uuid() FROM generate_series(1,12)',
      [ids[21]],
    );
    const row = (
      await db.query(
        'SELECT created_at,like_count,reply_count,feed_score FROM forum_posts WHERE id=$1',
        [ids[21]],
      )
    ).rows[0];
    expect(row.feed_score).toBeCloseTo(
      forumFeedScore(row.created_at.toISOString(), row.like_count, row.reply_count),
      6,
    );
    await page.locator('.forum-load-more').scrollIntoViewIfNeeded();
    await expect(page.locator('.forum-post')).toHaveCount(20);
    await page.locator('.forum-load-more').scrollIntoViewIfNeeded();
    await expect
      .poll(async () =>
        page
          .locator('.forum-post')
          .evaluateAll(
            (posts, published) =>
              posts
                .map((p) => p.getAttribute('data-post-id'))
                .filter((id) => id && published.includes(id)).length,
            published,
          ),
      )
      .toBe(22);
    const seen = await page
      .locator('.forum-post')
      .evaluateAll((posts) => posts.map((p) => p.getAttribute('data-post-id')));
    expect(seen.slice(0, 10)).toEqual(before);
    expect(new Set(seen).size).toBe(seen.length);
    expect(seen.slice(0, 22)).toEqual(published);
    await page.goto('/forum?sort=latest&q=' + marker);
    const next = await page.getByRole('link', { name: 'Load 10 more posts' }).getAttribute('href');
    expect(next).toContain('sort=latest');
    const context = await browser.newContext({ javaScriptEnabled: false });
    const crawler = await context.newPage();
    await crawler.goto(next!);
    await expect(crawler.locator('.forum-post')).toHaveCount(10);
    await context.close();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/forum?q=' + marker);
    await page.screenshot({ path: 'artifacts/forum-social-desktop.png', caret: 'initial' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: 'artifacts/forum-social-mobile.png', caret: 'initial' });
  } finally {
    await db.query('DELETE FROM forum_feed_snapshots WHERE id=$1', [snapshot]);
  }
});

test('guests reply without accounts; replies are escaped, deduplicated, rate limited and moderated', async ({
  page,
  browser,
}) => {
  await page.setExtraHTTPHeaders({ 'x-forwarded-for': address });
  await page.goto(`/forum/${ids[0]}`);
  await page.getByLabel('Your name (optional)').fill('Guest QA');
  const content = 'A useful discovery! <script>window.forumUnsafe=true</script>';
  await page.getByLabel('Your reply', { exact: true }).fill(content);
  const sent = page.waitForRequest(
    (request) => request.method() === 'POST' && request.url().includes('/forum/'),
  );
  await page.getByRole('button', { name: 'Post reply', exact: true }).click();
  const submission = await sent;
  await expect(page.locator('.forum-reply-form [role="status"]')).toContainText(
    'Your reply is published',
  );
  await expect(page.locator('.forum-reply p')).toHaveText(content);
  expect(
    await page.evaluate(() => Boolean((window as Window & { forumUnsafe?: boolean }).forumUnsafe)),
  ).toBeFalsy();
  expect(
    (await db.query('SELECT count(*)::int AS n FROM forum_replies WHERE post_id=$1', [ids[0]]))
      .rows[0].n,
  ).toBe(1);
  const replay = await page.request.post(submission.url(), {
    headers: submission.headers(),
    data: submission.postDataBuffer()!,
  });
  expect(replay.ok()).toBeTruthy();
  expect(
    (await db.query('SELECT count(*)::int AS n FROM forum_replies WHERE post_id=$1', [ids[0]]))
      .rows[0].n,
  ).toBe(1);
  for (let i = 0; i < 9; i++) {
    await page.getByLabel('Your reply', { exact: true }).fill(`A thoughtful follow-up ${i}`);
    await page.getByRole('button', { name: 'Post reply', exact: true }).click();
    await expect(page.getByLabel('Your reply', { exact: true })).toHaveValue('');
  }
  await page.getByLabel('Your reply', { exact: true }).fill('This reply should be rate limited.');
  await page.getByRole('button', { name: 'Post reply', exact: true }).click();
  await expect(page.locator('.forum-reply-form [role="status"]')).toContainText(
    'try again in 10 minutes',
  );
  await expect(page.getByLabel('Your reply', { exact: true })).toHaveValue(
    'This reply should be rate limited.',
  );
  await page.goto(`/forum/${ids[22]}`);
  expect((await page.title()).toLowerCase()).not.toContain(marker);
  await page.goto('/forum/new');
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel('Username', { exact: true }).fill(process.env.ADMIN_USERNAME!);
  await page.getByLabel('Password', { exact: true }).fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Enter your studio' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.locator('.contact-inbox-shortcut')).toBeVisible();
  await page.goto(`/forum/${ids[0]}`);
  const reply = page.locator('.forum-reply').filter({ hasText: content });
  await reply.getByRole('button', { name: 'Hide reply', exact: true }).click();
  await expect(reply).toHaveClass(/forum-reply-hidden/);
  const guest = await browser.newPage();
  await guest.goto(`/forum/${ids[0]}`);
  await expect(guest.locator('.forum-reply p').filter({ hasText: content })).toHaveCount(0);
  const schema = JSON.parse(
    (await guest.locator('script[type="application/ld+json"]').last().textContent())!,
  );
  expect(schema['@type']).toBe('DiscussionForumPosting');
  expect(schema.comment.some((comment: { text: string }) => comment.text === content)).toBeFalsy();
  await guest.close();
});

test('forum accepts iPhone HEIC selections and HEIF drops without a MIME type', async ({
  page,
}) => {
  await page.goto('/admin/login');
  await page.getByLabel('Username', { exact: true }).fill(process.env.ADMIN_USERNAME!);
  await page.getByLabel('Password', { exact: true }).fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Enter your studio' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto('/forum/new');
  const input = page.getByLabel('Attach forum images');
  await expect(input).toHaveAttribute('accept', /\.heic/);
  const photo = await readFile('tests/fixtures/sample.heic');
  let uploaded = page.waitForResponse(
    (response) => response.url().endsWith('/api/upload') && response.request().method() === 'POST',
  );
  await input.setInputFiles({ name: 'IMG_1001.HEIC', mimeType: 'image/heic', buffer: photo });
  let response = await uploaded;
  expect(response.status()).toBe(201);
  let result = await response.json();
  mediaIds.push(result.id);
  expect(result.bytes).toBeLessThan(50000);
  await expect(page.locator('.forum-upload-grid img')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Add images' })).toBeEnabled();

  uploaded = page.waitForResponse(
    (response) => response.url().endsWith('/api/upload') && response.request().method() === 'POST',
  );
  await page.evaluate((base64) => {
    const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
    const transfer = new DataTransfer();
    transfer.items.add(new File([bytes], 'IMG_1002.HEIF', { type: '' }));
    document
      .querySelector('.forum-composer')!
      .dispatchEvent(
        new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }),
      );
  }, photo.toString('base64'));
  response = await uploaded;
  expect(response.status()).toBe(201);
  result = await response.json();
  mediaIds.push(result.id);
  expect(result.bytes).toBeLessThan(50000);
  await expect(page.locator('.forum-upload-grid img')).toHaveCount(2);
  const media = await page.request.get(result.url);
  expect(media.headers()['content-type']).toBe('image/webp');
  expect((await media.body()).length).toBeLessThan(50000);
  await expect(page.locator('.forum-error')).toHaveCount(0);
});

test('only the owner can publish Markdown, optimized images, and social embeds; sitemaps exclude drafts', async ({
  page,
  browser,
}) => {
  await page.route('https://www.instagram.com/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<p>Instagram embed fixture</p>' }),
  );
  await page.goto('/admin/login');
  await page.getByLabel('Username', { exact: true }).fill(process.env.ADMIN_USERNAME!);
  await page.getByLabel('Password', { exact: true }).fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Enter your studio' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.locator('.contact-inbox-shortcut')).toBeVisible();
  await page.goto('/forum');
  await page.getByRole('link', { name: 'New post', exact: true }).click();
  const id = await page.locator('input[name="id"]').inputValue();
  createdIds.push(id);
  await page.getByLabel('Post title', { exact: true }).fill(`${marker} A fresh discovery`);
  await page
    .getByLabel('Post content', { exact: true })
    .fill(
      '## A proper heading\n\nA **bold thought**, a list, and some code.\n\n- First thing\n- Second thing\n\n```js\nconst hello = "world";\n```\n\nhttps://github.com/vercel/next.js',
    );
  await page
    .getByLabel('A link to share (optional)')
    .fill('https://www.instagram.com/reel/ABC_xyz/');
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.locator('.forum-markdown-preview .prose strong')).toHaveText('bold thought');
  await page.getByRole('button', { name: 'Write', exact: true }).click();
  const image = await sharp({
    create: { width: 1200, height: 800, channels: 3, background: '#e8a18b' },
  })
    .png()
    .toBuffer();
  const uploaded = page.waitForResponse(
    (response) => response.url().endsWith('/api/upload') && response.request().method() === 'POST',
  );
  await page
    .getByLabel('Attach forum images')
    .setInputFiles({ name: 'discovery.png', mimeType: 'image/png', buffer: image });
  const upload = await (await uploaded).json();
  mediaIds.push(upload.id);
  expect(upload.bytes).toBeLessThan(50000);
  await expect(page.locator('.forum-upload-grid img')).toHaveCount(1);
  await page.getByLabel('Image description', { exact: true }).fill('A warm colored discovery');
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `composer width ${width}`,
    ).toBeTruthy();
  }
  const send = page.waitForRequest(
    (request) => request.method() === 'POST' && request.url().endsWith('/forum/new'),
  );
  await page.getByRole('button', { name: 'Publish post', exact: true }).click();
  const mutation = await send;
  const slug = createForumSlug(`${marker} A fresh discovery`, id);
  await expect(page).toHaveURL(new RegExp('/forum/' + slug + '$'));
  await expect(page.locator('.forum-post .prose strong')).toHaveText('bold thought');
  await expect(page.locator('.forum-post .prose li')).toHaveCount(2);
  await expect(page.locator('.forum-images img')).toHaveAttribute(
    'alt',
    'A warm colored discovery',
  );
  await expect(page.locator('.forum-link-github')).toContainText('vercel / next.js');
  await expect(page.locator('.forum-link-instagram')).toBeVisible();
  await expect(page.locator('iframe[title="Embedded Instagram post"]')).toHaveAttribute(
    'loading',
    'lazy',
  );
  const media = await page.request.get(upload.url);
  expect(media.headers()['content-type']).toBe('image/webp');
  expect((await media.body()).length).toBeLessThan(50000);
  const guest = await browser.newPage();
  const attackHeaders = { ...mutation.headers() };
  delete attackHeaders.cookie;
  const denied = await guest.request.post(mutation.url(), {
    headers: attackHeaders,
    data: mutation.postDataBuffer()!,
  });
  expect(denied.headers()['x-action-redirect'] || denied.headers().location).toContain(
    '/admin/login',
  );
  await guest.route('https://www.instagram.com/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<p>Instagram embed fixture</p>' }),
  );
  await guest.goto(`/forum/${id}`);
  await expect(guest.getByRole('link', { name: /Edit / })).toHaveCount(0);
  const raw = await guest.request.get(`/forum/${id}`);
  expect(raw.headers()['content-security-policy']).toContain(
    "frame-src 'self' https://www.instagram.com",
  );
  expect(await raw.text()).toContain('bold thought');
  for (const width of [320, 768, 1440]) {
    await guest.setViewportSize({ width, height: 900 });
    expect(
      await guest.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `discussion width ${width}`,
    ).toBeTruthy();
  }
  // Public posts render inline without requiring a separate load button.
  await expect(guest.getByRole('button', { name: /Load Instagram post/ })).toHaveCount(0);
  await expect(guest.locator('iframe')).toHaveAttribute(
    'src',
    'https://www.instagram.com/reel/ABC_xyz/embed/',
  );
  const index = await page.request.get('/sitemap.xml');
  expect(await index.text()).toContain('<sitemapindex');
  const bucket = (
    await db.query('SELECT ((sitemap_id-1)/10000)::text AS bucket FROM forum_posts WHERE id=$1', [
      id,
    ])
  ).rows[0].bucket;
  const shard = await page.request.get(`/sitemaps/forum-${bucket}.xml`);
  const xml = await shard.text();
  expect(xml).toContain(`/forum/${slug}`);
  expect(xml).not.toContain(`/forum/${ids[22]}`);
  expect(xml).toContain(`<image:loc>`);
  const pages = await page.request.get('/sitemaps/pages.xml');
  expect(await pages.text()).toContain('/forum</loc>');
  const robots = await page.request.get('/robots.txt');
  expect(await robots.text()).toContain('/sitemap.xml');
  await page.getByRole('link', { name: `Edit ${marker} A fresh discovery`, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/forum/${id}/edit$`));
  await page.getByLabel('Visibility', { exact: true }).selectOption('draft');
  await page.getByRole('button', { name: 'Save post', exact: true }).click();
  await expect(page).toHaveURL(new RegExp('/forum/' + slug + '$'));
  const missing = await guest.request.get(`/forum/${id}`);
  expect(missing.status()).toBe(404);
  const hidden = await page.request.get(`/sitemaps/forum-${bucket}.xml`);
  expect(await hidden.text()).not.toContain(`/forum/${slug}`);
  await guest.close();
});
