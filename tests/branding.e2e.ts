import { test, expect } from '@playwright/test';
import { Pool } from 'pg';
import sharp from 'sharp';
import { homepageSchema } from '../lib/homepage-schema';
import { upgradeHomepage } from '../lib/homepage-migration.mjs';
import { brandFonts } from '../lib/brand-fonts';
const db = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
test.afterAll(() => db.end());
test('brand font controls preview safely and save across the public site and admin', async ({
  page,
}) => {
  const row = (await db.query("SELECT value FROM settings WHERE key='homepage'")).rows[0].value;
  const original = homepageSchema.parse(upgradeHomepage(row)).branding;
  let mediaId: string | undefined;
  let edited = false;
  const save = async () => {
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(page.locator('.homepage-save-strip')).toContainText('Saved to your website');
    await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toBeDisabled();
  };
  await page.goto('/admin');
  await page.getByLabel('Username', { exact: true }).fill(process.env.ADMIN_USERNAME!);
  await page.getByLabel('Password', { exact: true }).fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Enter your studio' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.getByRole('link', { name: 'Edit logo & fonts', exact: true }).click();
  await expect(page.getByLabel('Brand font', { exact: true })).toBeVisible();
  try {
    for (const font of brandFonts) {
      await page.getByLabel('Brand font', { exact: true }).selectOption(font.id);
      const family = await page
        .locator('.homepage-brand-preview .brand-wordmark')
        .evaluate((el) => getComputedStyle(el).fontFamily);
      expect(family).toContain(font.family.split(',')[0].replaceAll('"', ''));
    }
    const image = await sharp({
      create: { width: 256, height: 256, channels: 4, background: '#059669' },
    })
      .png()
      .toBuffer();
    const response = page.waitForResponse(
      (r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/upload',
    );
    await page
      .getByLabel('Logo image file', { exact: true })
      .setInputFiles({ name: 'brand-logo-test.png', mimeType: 'image/png', buffer: image });
    const upload = await response;
    expect(upload.status()).toBe(201);
    const media = await upload.json();
    mediaId = media.id;
    await expect(page.locator('.homepage-brand-preview .brand-duck')).toHaveAttribute(
      'src',
      media.url,
    );
    await page.getByRole('button', { name: 'Reset this section', exact: true }).click();
    await expect(page.getByLabel('Brand font', { exact: true })).toHaveValue(original.font);
    await page.getByLabel('Brand name', { exact: true }).fill('Aathil Studio');
    await page.getByLabel('Brand font', { exact: true }).selectOption('mono');
    await page.getByLabel('Brand font weight', { exact: true }).selectOption('600');
    await expect(page.locator('.homepage-brand-preview .brand-wordmark')).toHaveText(
      'Aathil Studio',
    );
    await expect(page.locator('.homepage-brand-preview .brand-wordmark')).toHaveCSS(
      'font-weight',
      '600',
    );
    const guest = await page.context().newPage();
    await guest.goto('/');
    await expect(guest.locator('.site-header .brand-wordmark')).toHaveText(original.name);
    await guest.close();
    edited = true;
    await save();
    const saved = (await db.query("SELECT value FROM settings WHERE key='homepage'")).rows[0].value;
    expect(saved.branding).toMatchObject({
      name: 'Aathil Studio',
      font: 'mono',
      fontWeight: 600,
      logo: original.logo,
    });
    expect(saved.projects).toEqual(row.projects);
    expect(saved.freelance).toEqual(row.freelance);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const path of ['/', '/tools', '/about', '/blog', '/contact', '/admin']) {
        await page.goto(path);
        const brand = page.locator(
          path === '/admin' ? '.admin-brand .brand-wordmark' : '.site-header .brand-wordmark',
        );
        await expect(brand).toHaveText('Aathil Studio');
        expect(await brand.evaluate((el) => getComputedStyle(el).fontFamily)).toContain(
          'monospace',
        );
        await expect(brand).toHaveCSS('font-weight', '600');
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          `${path} at ${width}`,
        ).toBeTruthy();
      }
    }
  } finally {
    if (edited) {
      await page.goto('/admin/homepage?section=branding');
      await page.getByLabel('Brand name', { exact: true }).fill(original.name);
      await page.getByLabel('Brand font', { exact: true }).selectOption(original.font);
      await page
        .getByLabel('Brand font weight', { exact: true })
        .selectOption(String(original.fontWeight));
      if (await page.getByRole('button', { name: 'Save changes', exact: true }).isEnabled())
        await save();
    } else {
      await page.goto('/admin/homepage?section=branding');
      const reset = page.getByRole('button', { name: 'Reset this section', exact: true });
      if (await reset.isVisible()) await reset.click();
    }
    if (mediaId)
      await db.query(
        "DELETE FROM media WHERE id=$1 AND NOT EXISTS (SELECT 1 FROM settings WHERE value::text LIKE '%' || $1::text || '%')",
        [mediaId],
      );
  }
});
