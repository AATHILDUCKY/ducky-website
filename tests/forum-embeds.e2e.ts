import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';

const db = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const id = randomUUID();
const marker = 'embedqa' + id.replaceAll('-', '');
const linkedIn =
  'https://www.linkedin.com/posts/example_security-activity-1234567890123456789-AbCd';
const sources = [
  'https://www.instagram.com/reel/ABC_xyz/',
  'https://youtu.be/M7lc1UVf-VE',
  linkedIn,
];

test.beforeAll(async () => {
  await db.query(
    "INSERT INTO forum_posts(id,slug,title,content,status) VALUES($1,$2,$3,$4,'published')",
    [id, marker, marker + ' shared posts', sources.join('\n\n')],
  );
});
test.afterAll(async () => {
  await db.query('DELETE FROM forum_posts WHERE id=$1', [id]);
  await db.end();
});
test.beforeEach(async ({ page }) => {
  for (const origin of [
    'https://www.instagram.com/**',
    'https://www.youtube-nocookie.com/**',
    'https://www.linkedin.com/**',
  ]) {
    await page.route(origin, (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<html><body><p>Embedded provider fixture</p></body></html>',
      }),
    );
  }
});

test('public feed and discussion embed providers inline and fit mobile and desktop', async ({
  page,
}) => {
  for (const path of ['/forum?q=' + marker, '/forum/' + marker]) {
    await page.goto(path);
    for (const [provider, source] of [
      ['Instagram', 'https://www.instagram.com/reel/ABC_xyz/embed/'],
      ['YouTube', 'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE'],
      [
        'LinkedIn',
        'https://www.linkedin.com/embed/feed/update/urn:li:activity:1234567890123456789',
      ],
    ]) {
      const frame = page.locator(`iframe[title^="Embedded ${provider}"]`);
      await expect(frame).toHaveAttribute('src', source);
      await expect(frame).toHaveAttribute('loading', 'lazy');
      await frame.scrollIntoViewIfNeeded();
      await expect(frame.contentFrame().getByText('Embedded provider fixture')).toBeVisible();
    }
    await expect(page.getByRole('button', { name: /Load .* post/ })).toHaveCount(0);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      ).toBeTruthy();
      const video = await page.locator('.forum-embed-video iframe').boundingBox();
      expect(video!.height).toBeGreaterThanOrEqual(200);
      expect(video!.width).toBeGreaterThanOrEqual(200);
    }
  }
});

test('composer previews copied iframe code and saves only its safe URL', async ({ page }) => {
  await page.goto('/admin/login');
  await page.getByLabel('Username', { exact: true }).fill(process.env.ADMIN_USERNAME!);
  await page.getByLabel('Password', { exact: true }).fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Enter your studio' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto(`/forum/${id}/edit`);
  // Enter and leave preview before editing so the server-rendered form has hydrated.
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.locator('.forum-markdown-preview')).toBeVisible();
  await page.getByRole('button', { name: 'Write', exact: true }).click();
  await page.getByLabel('Post content', { exact: true }).fill('A short worth watching.');
  await page
    .getByLabel('A link to share (optional)')
    .fill(
      '<iframe src="https://www.youtube.com/embed/M7lc1UVf-VE" onload="window.insecureEmbed=true"></iframe>',
    );
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.locator('.forum-markdown-preview .prose')).toHaveText(
    'A short worth watching.',
  );
  await expect(
    page.locator('.forum-markdown-preview iframe[title="Embedded YouTube video"]'),
  ).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE');
  await page.getByRole('button', { name: 'Write', exact: true }).click();
  await page
    .getByLabel('Post content', { exact: true })
    .fill('A short worth watching.\n\nhttps://www.youtube.com/shorts/M7lc1UVf-VE');
  await page.getByRole('button', { name: 'Save post', exact: true }).click();
  await expect(page).toHaveURL(new RegExp('/forum/' + marker + '$'));
  await expect(page.locator('.forum-embed-portrait iframe')).toBeVisible();
  expect(
    (await db.query('SELECT link_url FROM forum_posts WHERE id=$1', [id])).rows[0].link_url,
  ).toBe('https://www.youtube.com/watch?v=M7lc1UVf-VE');
  expect(await page.evaluate(() => 'insecureEmbed' in window)).toBe(false);
});
