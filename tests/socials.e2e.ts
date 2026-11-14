import { test, expect } from '@playwright/test';
import { socialPlatforms } from '../lib/social-links';
import { Pool } from 'pg';

const db = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
test.afterAll(() => db.end());

test('admin saves social links, shows Instagram and X in the hero, and hides cleared icons', async ({
  page,
}) => {
  test.setTimeout(120000);
  const savedProfile = (await db.query("SELECT value FROM settings WHERE key='profile'")).rows[0]
    .value;
  await page.goto('/admin/socials');
  await page.getByLabel('Username', { exact: true }).fill(process.env.ADMIN_USERNAME!);
  await page.getByLabel('Password', { exact: true }).fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Enter your studio' }).click();
  await expect(page).toHaveURL(/\/admin$/, { timeout: 30000 });
  await page.getByRole('link', { name: 'Social links', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Social media profiles', exact: true }),
  ).toBeVisible();
  const original = Object.fromEntries(
    await Promise.all(
      socialPlatforms.map(async ({ key, label }) => [
        key,
        await page.getByLabel(`${label} URL`, { exact: true }).inputValue(),
      ]),
    ),
  );
  let edited = false;
  const save = async () => {
    const response = page.waitForResponse(
      (r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/admin/socials',
    );
    await page.getByRole('button', { name: 'Save social links', exact: true }).click();
    await response;
    await expect(page.getByRole('status')).toContainText('Your social links have been updated.');
    await expect(
      page.getByRole('button', { name: 'Save social links', exact: true }),
    ).toBeEnabled();
  };
  try {
    await page.getByLabel('Instagram URL', { exact: true }).fill('https://www.instagram.com/');
    await page.getByLabel('X URL', { exact: true }).fill('https://x.com/');
    edited = true;
    await save();
    await page.reload();
    await expect(page.getByLabel('Instagram URL', { exact: true })).toHaveValue(
      'https://www.instagram.com/',
    );
    await expect(page.getByLabel('X URL', { exact: true })).toHaveValue('https://x.com/');
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto('/');
      const socials = page.getByRole('navigation', { name: 'Social profiles' });
      await expect(
        socials.getByRole('link', { name: 'Instagram (opens in a new tab)', exact: true }),
      ).toHaveAttribute('href', 'https://www.instagram.com/');
      await expect(
        socials.getByRole('link', { name: 'X (opens in a new tab)', exact: true }),
      ).toHaveAttribute('href', 'https://x.com/');
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      ).toBeTruthy();
      if (width <= 760) {
        expect(
          await page.evaluate(
            () =>
              document.querySelector('.hero-socials')!.getBoundingClientRect().bottom <
              document.querySelector('.journal-intro .eyebrow')!.getBoundingClientRect().top,
          ),
        ).toBeTruthy();
      }
      if (width === 390 || width === 1440)
        await page.screenshot({ path: `artifacts/socials-hero-${width}.png` });
    }
    await page.goto('/admin/socials');
    await page.screenshot({ path: 'artifacts/socials-admin.png' });
    await page.getByLabel('Instagram URL', { exact: true }).fill('');
    await page.getByLabel('X URL', { exact: true }).fill('');
    await page.getByLabel('YouTube URL', { exact: true }).fill('');
    await save();
    await page.goto('/');
    await expect(page.locator('.hero-social-list a[title="Instagram"]')).toHaveCount(0);
    await expect(page.locator('.hero-social-list a[title="X"]')).toHaveCount(0);
    await expect(page.locator('.hero-social-list a[title="YouTube"]')).toHaveCount(0);
    await page.goto('/admin/socials');
    for (const { key, label } of socialPlatforms)
      await page.getByLabel(`${label} URL`, { exact: true }).fill(original[key]);
    await save();
  } finally {
    if (edited) {
      await db.query(
        "UPDATE settings SET value=(value - $1::text[]) || $2::jsonb WHERE key='profile'",
        [
          socialPlatforms.map(({ key }) => key),
          JSON.stringify(
            Object.fromEntries(
              socialPlatforms
                .filter(({ key }) => key in savedProfile)
                .map(({ key }) => [key, savedProfile[key]]),
            ),
          ),
        ],
      );
    }
  }
});
