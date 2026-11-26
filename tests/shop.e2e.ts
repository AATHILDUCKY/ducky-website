import { test, expect } from '@playwright/test';
import { Pool } from 'pg';
import { randomUUID, createHash } from 'node:crypto';
import sharp from 'sharp';
const db = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const slug = `shop-qa-${randomUUID()}`;
const email = `${slug}@example.com`;
let id = '';
let imageId = '';
test.afterAll(async () => {
  await db.query('DELETE FROM shop_orders WHERE email=$1', [email]);
  await db.query('DELETE FROM shop_products WHERE slug=$1', [slug]);
  if (imageId) await db.query('DELETE FROM media WHERE id=$1', [imageId]);
  await db.query('DELETE FROM shop_order_limits WHERE key=$1', [
    createHash('sha256').update(email).digest('hex'),
  ]);
  await db.end();
});
test('shop: owner publishes, customer orders, retries deduplicate, stock is protected and receipt is printable', async ({
  page,
  browser,
  request,
}) => {
  await page.goto('/admin/shop');
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel('Username', { exact: true }).fill(process.env.ADMIN_USERNAME!);
  await page.getByLabel('Password', { exact: true }).fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Enter your studio' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto('/admin/shop');
  await expect(page.getByRole('heading', { name: 'Shop management', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Shop settings', exact: true })).toBeVisible();
  await page.goto('/admin/shop/products/new');
  await page.getByLabel('Product name', { exact: true }).fill('Shop QA item');
  await page.getByLabel('URL slug').fill(slug);
  await page
    .getByLabel('Description & specifications')
    .fill('A carefully tested product with clear specifications.');
  await page.getByLabel('Price (shop currency)').fill('1250.50');
  await page.getByLabel('Available stock').fill('2');
  const image = await sharp({
    create: { width: 700, height: 700, channels: 3, background: '#39492a' },
  })
    .webp()
    .toBuffer();
  await page
    .getByLabel('Upload photo', { exact: true })
    .setInputFiles({ name: 'shop-qa.webp', mimeType: 'image/webp', buffer: image });
  await expect(page.locator('.shop-admin-images img')).toHaveCount(1);
  await expect(page.getByText('Optimizing photo…')).toHaveCount(0);
  imageId = await page
    .locator('.shop-admin-images img')
    .getAttribute('src')
    .then((v) => v!.split('/').pop()!);
  await page.getByLabel('Visibility').selectOption('published');
  await page.getByRole('button', { name: 'Save product', exact: true }).first().click();
  await expect(page).toHaveURL(/\/admin\/shop\/products\/[0-9a-f-]{36}$/);
  id = page.url().split('/').pop()!;
  const product = (await db.query('SELECT * FROM shop_products WHERE id=$1', [id])).rows[0];
  expect(product.price).toBe(125050);
  expect(product.stock).toBe(2);
  const guest = await browser.newPage();
  await guest.goto('/shop');
  await guest.getByRole('textbox', { name: 'Search products' }).fill('Shop QA item');
  await guest.locator('.shop-card').click();
  await expect(guest.getByRole('heading', { name: 'Shop QA item', exact: true })).toBeVisible();
  expect(await guest.locator('script[type="application/ld+json"]').last().textContent()).toContain(
    'InStock',
  );
  await guest.getByRole('button', { name: 'Add to bag', exact: true }).click();
  await guest.getByRole('link', { name: 'Continue to checkout' }).click();
  await guest.getByLabel('Full name', { exact: true }).fill('Shop QA Customer');
  await guest.getByLabel('Email', { exact: true }).fill(email);
  await guest.getByLabel('Phone number').fill('+94771234567');
  await guest.getByLabel('Street address').fill('123 Test Street');
  await guest.getByLabel('City', { exact: true }).fill('Colombo');
  await guest.getByLabel('Postal code').fill('00100');
  await guest.getByRole('checkbox').check();
  await expect(guest.getByText('Payment arranged after ordering', { exact: true })).toBeVisible();
  // Price tampering must never create an order or reduce stock.
  await guest.locator('input[name="items"]').evaluate((el: HTMLInputElement) => {
    const items = JSON.parse(el.value);
    items[0].price = 1;
    el.value = JSON.stringify(items);
  });
  await guest.getByRole('button', { name: /Place order/ }).click();
  await expect(guest.locator('.shop-error[role=alert]')).toContainText('price has changed');
  expect((await db.query('SELECT stock FROM shop_products WHERE id=$1', [id])).rows[0].stock).toBe(
    2,
  );
  await guest.locator('input[name="items"]').evaluate((el: HTMLInputElement) => {
    const items = JSON.parse(el.value);
    items[0].price = 125050;
    el.value = JSON.stringify(items);
  });
  const submissionId = await guest.locator('input[name=submission_id]').inputValue();
  const sent = guest.waitForRequest(
    (r) => r.method() === 'POST' && r.url().endsWith('/shop/checkout'),
  );
  await guest.getByRole('button', { name: /Place order/ }).click();
  const submission = await sent;
  await expect(guest.getByRole('heading', { name: 'Thank you. You’re all set.' })).toBeVisible();
  const order = (await db.query('SELECT * FROM shop_orders WHERE email=$1', [email])).rows[0];
  expect(order.payment_method).toBe('manual');
  expect(order.payment_status).toBe('unpaid');
  expect(order.subtotal).toBe(125050);
  expect(order.items[0].name).toBe('Shop QA item');
  expect((await db.query('SELECT stock FROM shop_products WHERE id=$1', [id])).rows[0].stock).toBe(
    1,
  );
  await guest.request.post(submission.url(), {
    headers: submission.headers(),
    data: submission.postDataBuffer()!,
  });
  expect(
    (await db.query('SELECT count(*)::int AS n FROM shop_orders WHERE email=$1', [email])).rows[0]
      .n,
  ).toBe(1);
  expect((await db.query('SELECT stock FROM shop_products WHERE id=$1', [id])).rows[0].stock).toBe(
    1,
  );
  // An editor opened before the purchase must not overwrite the new stock count.
  await page.getByLabel('Available stock').fill('999');
  await page.getByRole('button', { name: 'Save product', exact: true }).first().click();
  await expect(page.locator('.shop-error[role=alert]')).toContainText(
    'changed while you were editing',
  );
  expect((await db.query('SELECT stock FROM shop_products WHERE id=$1', [id])).rows[0].stock).toBe(
    1,
  );
  // Two independent requests compete for the last unit; only one may commit.
  const body = submission.postDataBuffer()!.toString();
  await Promise.all(
    [randomUUID(), randomUUID()].map((nextId) =>
      guest.request.post(submission.url(), {
        headers: submission.headers(),
        data: body.replaceAll(submissionId, nextId),
      }),
    ),
  );
  expect((await db.query('SELECT stock FROM shop_products WHERE id=$1', [id])).rows[0].stock).toBe(
    0,
  );
  expect(
    (await db.query('SELECT count(*)::int AS n FROM shop_orders WHERE email=$1', [email])).rows[0]
      .n,
  ).toBe(2);
  await guest.goto(`/admin/shop/orders/${order.id}`);
  await expect(guest).toHaveURL(/\/admin\/login/);
  await page.goto('/admin/shop/orders?q=' + encodeURIComponent(email));
  await expect(page.locator('.shop-table tbody tr')).toHaveCount(2);
  await page.goto(`/admin/shop/orders/${order.id}`);
  await expect(page.locator('.shop-receipt')).toContainText('Shop QA Customer');
  await expect(page.getByRole('button', { name: 'Print receipt / Save PDF' })).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.admin-sidebar')).toBeHidden();
  await expect(page.locator('.shop-order-controls').first()).toBeHidden();
  await expect(page.locator('.shop-receipt')).toBeVisible();
  await page.emulateMedia({ media: 'screen' });
  await page.getByLabel('Order status').selectOption('cancelled');
  await page.getByRole('button', { name: 'Update order', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Changes saved');
  expect((await db.query('SELECT stock FROM shop_products WHERE id=$1', [id])).rows[0].stock).toBe(
    1,
  );
  await page.getByRole('button', { name: 'Update order', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Changes saved');
  expect((await db.query('SELECT stock FROM shop_products WHERE id=$1', [id])).rows[0].stock).toBe(
    1,
  );
  const bucket = ((Number(product.sitemap_id) - 1) / 10000) | 0;
  expect(await (await request.get(`/sitemaps/products-${bucket}.xml`)).text()).toContain(
    `/shop/${slug}`,
  );
  expect(await (await request.get('/sitemap.xml')).text()).toContain(`products-${bucket}.xml`);
  for (const width of [390, 1440]) {
    await guest.setViewportSize({ width, height: 960 });
    await guest.goto(`/shop/${slug}`);
    expect(
      await guest.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    await guest.screenshot({ path: `artifacts/shop-product-${width}.png`, fullPage: true });
    await guest.goto('/shop');
    await guest.screenshot({ path: `artifacts/shop-${width}.png`, fullPage: true });
  }
  await page.goto(`/admin/shop/products/${id}`);
  await page.getByLabel('Visibility').selectOption('draft');
  await page.getByRole('button', { name: 'Save product', exact: true }).first().click();
  await expect(page.getByRole('status')).toContainText('Changes saved');
  expect((await request.get(`/shop/${slug}`)).status()).toBe(404);
  expect(await (await request.get(`/sitemaps/products-${bucket}.xml`)).text()).not.toContain(
    `/shop/${slug}`,
  );
  await guest.close();
});
