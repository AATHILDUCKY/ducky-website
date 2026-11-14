import { test, expect } from '@playwright/test';
import { Pool } from 'pg';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { profileSocialLinks } from '../lib/social-links';
const db = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
test.afterAll(() => db.end());
test('admin edits the shared article author name and photo without changing the public profile', async ({
  page,
}) => {
  const original = (await db.query("SELECT value FROM settings WHERE key='profile'")).rows[0].value;
  const slugs = (
    await db.query(
      "SELECT slug FROM posts WHERE status='published' AND published_at<=now() ORDER BY published_at DESC LIMIT 2",
    )
  ).rows.map((r) => r.slug);
  expect(slugs.length).toBeGreaterThan(0);
  const name = `Author QA ${randomUUID().slice(0, 8)}`;
  let mediaId: string | undefined;
  let edited = false;
  const save = async () => {
    const response = page.waitForResponse(
      (r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/admin/profile',
    );
    await page.getByRole('button', { name: 'Save profile', exact: true }).click();
    await response;
    await expect(page.locator('.form-success')).toContainText('Saved.');
    await expect(page.getByRole('button', { name: 'Save profile', exact: true })).toBeEnabled();
  };
  await page.goto('/admin/profile');
  await page.getByLabel('Username', { exact: true }).fill(process.env.ADMIN_USERNAME!);
  await page.getByLabel('Password', { exact: true }).fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Enter your studio' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  try {
    await page.goto('/admin/profile');
    await expect(page.getByRole('heading', { name: 'Article author', exact: true })).toBeVisible();
    await page.getByLabel('Author display name', { exact: true }).fill(name);
    await expect(page.locator('.article-author-preview strong')).toHaveText(name);
    const image = await sharp({
      create: { width: 512, height: 512, channels: 3, background: '#5b8d78' },
    })
      .png()
      .toBuffer();
    const uploaded = page.waitForResponse(
      (r) => new URL(r.url()).pathname === '/api/upload' && r.request().method() === 'POST',
    );
    await page
      .getByLabel('Author photo file', { exact: true })
      .setInputFiles({ name: 'author-test.png', mimeType: 'image/png', buffer: image });
    const result = await uploaded;
    expect(result.status()).toBe(201);
    const media = await result.json();
    mediaId = media.id;
    await expect(page.locator('.article-author-preview img')).toHaveAttribute('src', media.url);
    edited = true;
    await save();
    const saved = (await db.query("SELECT value FROM settings WHERE key='profile'")).rows[0].value;
    expect(saved.articleAuthor).toEqual({ name, portrait: media.url });
    const { articleAuthor: _saved, ...otherSaved } = saved;
    const { articleAuthor: _old, ...otherOriginal } = original;
    expect(otherSaved).toEqual({ ...otherOriginal, ...profileSocialLinks(original) });
    for (const slug of slugs) {
      await page.goto(`/blog/${slug}`);
      await expect(page.locator('.article-author strong')).toHaveText(name);
      await expect(page.locator('.article-author .author-avatar img')).toHaveAttribute(
        'src',
        media.url,
      );
      const schema = JSON.parse(
        (await page.locator('script[type="application/ld+json"]').textContent())!,
      );
      expect(schema.author.name).toBe(name);
      expect(schema.author.image).toContain(media.url);
    }
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 960 });
      for (const path of ['/admin/profile', `/blog/${slugs[0]}`]) {
        await page.goto(path);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          `${path} at ${width}`,
        ).toBeTruthy();
      }
    }
    await page.screenshot({ path: 'artifacts/article-author-desktop.png' });
    await page.route(`**${media.url}`, (route) => route.abort());
    await page.reload();
    await expect(page.locator('.article-author .author-avatar img')).toHaveCount(0);
    await expect(page.locator('.article-author .author-avatar')).toContainText('AQ');
    await page.unroute(`**${media.url}`);
    await page.goto('/admin/profile');
    await page.getByRole('button', { name: 'Use profile photo', exact: true }).click();
    await page.getByLabel('Author display name', { exact: true }).fill('');
    await save();
    await page.goto(`/blog/${slugs[0]}`);
    await expect(page.locator('.article-author strong')).toHaveText(original.name);
    await expect(page.locator('.article-author .author-avatar img')).toHaveAttribute(
      'src',
      original.portrait,
    );
  } finally {
    if (edited) {
      await page.goto('/admin/profile');
      await page
        .getByLabel('Author display name', { exact: true })
        .fill(original.articleAuthor?.name || '');
      await page
        .locator('input[name="authorPortrait"]')
        .evaluate((el: HTMLInputElement, value: string) => {
          el.value = value;
        }, original.articleAuthor?.portrait || '');
      await save();
    }
    if (mediaId)
      await db.query(
        "DELETE FROM media WHERE id=$1 AND NOT EXISTS (SELECT 1 FROM settings WHERE value::text LIKE '%' || $1::text || '%')",
        [mediaId],
      );
  }
});
