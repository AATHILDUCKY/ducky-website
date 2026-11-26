import { test, expect, type Page } from '@playwright/test';
import { Pool } from 'pg';
import { randomUUID, createHash } from 'node:crypto';
import sharp from 'sharp';
const db = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const key = randomUUID();
const email = `payments-${key}@example.com`;
const slug = `payments-${key}`;
let productId = '';
let mediaId = '';
let oldSettings: unknown;
let orderId = '';
test.beforeAll(async () => {
  oldSettings = (await db.query("SELECT value FROM settings WHERE key='shop'")).rows[0].value;
  await db.query("UPDATE settings SET value=value||$1::jsonb WHERE key='shop'", [
    JSON.stringify({
      payment: 'manual',
      cod_enabled: false,
      payment_instructions: 'Contact the shop for bank transfer details.',
    }),
  ]);
  const image = await sharp({
    create: { width: 600, height: 600, channels: 3, background: '#cab6a3' },
  })
    .webp()
    .toBuffer();
  mediaId = (
    await db.query(
      "INSERT INTO media(data,alt,width,height) VALUES($1,'Payment QA',600,600) RETURNING id",
      [image],
    )
  ).rows[0].id;
  productId = (
    await db.query(
      "INSERT INTO shop_products(name,slug,description,price,stock,images,status) VALUES('Payment QA product',$1,'A payment workflow test product.',150000,10,$2,'published') RETURNING id",
      [slug, [mediaId]],
    )
  ).rows[0].id;
});
test.afterAll(async () => {
  await db.query(
    'DELETE FROM shop_proof_limits WHERE key IN (SELECT id::text FROM shop_orders WHERE email=$1)',
    [email],
  );
  await db.query('DELETE FROM shop_orders WHERE email=$1', [email]);
  if (productId) await db.query('DELETE FROM shop_products WHERE id=$1', [productId]);
  if (mediaId) await db.query('DELETE FROM media WHERE id=$1', [mediaId]);
  await db.query('DELETE FROM shop_order_limits WHERE key=$1', [
    createHash('sha256').update(email).digest('hex'),
  ]);
  if (oldSettings)
    await db.query("UPDATE settings SET value=$1 WHERE key='shop'", [JSON.stringify(oldSettings)]);
  await db.end();
});
async function prepareCheckout(page: Page) {
  await page.goto(`/shop/${slug}`);
  await page.getByRole('button', { name: 'Add to bag', exact: true }).click();
  await page.getByRole('link', { name: 'Continue to checkout' }).click();
  await page.getByLabel('Full name', { exact: true }).fill('Payment QA Customer');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Phone number').fill('+94771234567');
  await page.getByLabel('Street address').fill('123 Test Street');
  await page.getByLabel('City', { exact: true }).fill('Colombo');
  await page.getByLabel('Postal code').fill('00100');
  await page.getByRole('checkbox').check();
}
test('private customer uploads, pending review, admin verification and opt-in COD', async ({
  page,
  browser,
}) => {
  test.setTimeout(90000);
  const guest = await browser.newPage();
  await prepareCheckout(guest);
  await expect(guest.getByRole('radio', { name: 'Cash on delivery' })).toHaveCount(0);
  // A forged COD choice must not create an order while disabled.
  await guest.locator('input[name=payment]').evaluate((el: HTMLInputElement) => {
    el.value = 'cod';
  });
  await guest.getByRole('button', { name: /Place order/ }).click();
  await expect(guest.locator('.shop-error[role=alert]')).toContainText('no longer available');
  expect(
    (await db.query('SELECT count(*)::int AS n FROM shop_orders WHERE email=$1', [email])).rows[0]
      .n,
  ).toBe(0);
  await guest.locator('input[name=payment]').evaluate((el: HTMLInputElement) => {
    el.value = 'manual';
  });
  await guest.getByRole('button', { name: /Place order/ }).click();
  await expect(guest.getByRole('heading', { name: 'Thank you. You’re all set.' })).toBeVisible();
  const order = (await db.query('SELECT * FROM shop_orders WHERE email=$1', [email])).rows[0];
  orderId = order.id;
  expect(order.payment_method).toBe('manual');
  expect(order.payment_status).toBe('unpaid');
  expect(order.customer_access_hash).toMatch(/^[a-f0-9]{64}$/);
  const cookie = (await guest.context().cookies()).find(
    (c) => c.name === `ducky_order_${orderId}`,
  )!;
  expect(cookie.httpOnly).toBeTruthy();
  expect(cookie.value).not.toBe(order.customer_access_hash);
  const image = await sharp({
    create: { width: 800, height: 1200, channels: 3, background: '#fff' },
  })
    .png()
    .toBuffer();
  await guest
    .getByLabel('Payment proof file')
    .setInputFiles({ name: 'bank-transfer.png', mimeType: 'image/png', buffer: image });
  await guest.getByRole('button', { name: 'Submit payment proof', exact: true }).click();
  await expect(
    guest.getByRole('status').filter({ hasText: 'Payment proof submitted' }),
  ).toBeVisible();
  const proof = (
    await db.query('SELECT id,status,mime FROM shop_payment_proofs WHERE order_id=$1', [orderId])
  ).rows[0];
  expect(proof.status).toBe('pending');
  expect(proof.mime).toBe('image/webp');
  expect(
    (await db.query('SELECT payment_status FROM shop_orders WHERE id=$1', [orderId])).rows[0]
      .payment_status,
  ).toBe('unpaid');
  await guest.getByRole('link', { name: 'Manage payment & view your order' }).click();
  await expect(guest.locator('.customer-proofs')).toContainText('Awaiting verification');
  const ownerFile = await guest.request.get(`/api/shop/payment-proofs/${proof.id}`);
  expect(ownerFile.status()).toBe(200);
  expect(ownerFile.headers()['cache-control']).toContain('no-store');
  const stranger = await browser.newPage();
  expect((await stranger.goto(`/shop/orders/${orderId}`))?.status()).toBe(404);
  expect((await stranger.request.get(`/api/shop/payment-proofs/${proof.id}`)).status()).toBe(404);
  expect(
    (
      await stranger.request.post(`/api/shop/orders/${orderId}/proof`, {
        headers: { origin: new URL(guest.url()).origin },
        multipart: {
          upload_id: randomUUID(),
          file: { name: 'fake.png', mimeType: 'image/png', buffer: image },
        },
      })
    ).status(),
  ).toBe(403);
  await stranger.close();
  await page.goto('/admin/orders');
  await page.getByLabel('Username', { exact: true }).fill(process.env.ADMIN_USERNAME!);
  await page.getByLabel('Password', { exact: true }).fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Enter your studio' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto(`/admin/orders?q=${encodeURIComponent(email)}&payment=review`);
  await expect(page.locator('.orders-table tbody tr')).toHaveCount(1);
  await expect(page.locator('.orders-table')).toContainText('Proof to review');
  await page.goto(`/admin/orders/${orderId}`);
  await expect(page.getByRole('img', { name: 'Customer-submitted payment proof' })).toBeVisible();
  // Rejecting never marks paid; the customer can correct their proof.
  await page
    .getByLabel('Review note for customer')
    .fill('Please include the full transfer reference.');
  await page.getByRole('button', { name: 'Reject proof', exact: true }).click();
  await expect(page.getByText('Rejected', { exact: true })).toBeVisible();
  expect(
    (await db.query('SELECT payment_status FROM shop_orders WHERE id=$1', [orderId])).rows[0]
      .payment_status,
  ).toBe('unpaid');
  await guest.reload();
  await expect(guest.locator('.customer-proofs')).toContainText(
    'Please include the full transfer reference.',
  );
  await guest
    .getByLabel('Payment proof file')
    .setInputFiles({ name: 'corrected-transfer.png', mimeType: 'image/png', buffer: image });
  await guest.getByRole('button', { name: 'Submit payment proof', exact: true }).click();
  await expect(
    guest.getByRole('status').filter({ hasText: 'Payment proof submitted' }),
  ).toBeVisible();
  await page.reload();
  const pending = page
    .locator('.admin-payment-proof')
    .filter({ hasText: 'corrected-transfer.png' });
  await pending.getByRole('button', { name: 'Verify payment & mark paid', exact: true }).click();
  await expect(pending.getByText('Verified', { exact: true })).toBeVisible();
  expect(
    (await db.query('SELECT payment_status FROM shop_orders WHERE id=$1', [orderId])).rows[0]
      .payment_status,
  ).toBe('paid');
  await guest.reload();
  await expect(guest.getByText('Your payment has been recorded as paid.')).toBeVisible();
  await expect(guest.getByLabel('Payment proof file')).toHaveCount(0);
  // Enabling COD exposes an additional choice, while arranged payment remains available.
  await page.goto('/admin/shop');
  await expect(page.getByRole('checkbox', { name: /Enable cash on delivery/ })).not.toBeChecked();
  await page.getByRole('checkbox', { name: /Enable cash on delivery/ }).check();
  await page.getByRole('button', { name: 'Save settings', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Changes saved');
  await guest.goto('/shop');
  await expect(
    guest.getByText('Cash on delivery is available. Choose COD at checkout.'),
  ).toBeVisible();
  await prepareCheckout(guest);
  await expect(guest.getByRole('radio', { name: 'Cash on delivery', exact: true })).toBeVisible();
  await guest.getByRole('radio', { name: 'Cash on delivery', exact: true }).check();
  await guest.getByRole('button', { name: /Place order/ }).click();
  await expect(guest.getByRole('heading', { name: 'Thank you. You’re all set.' })).toBeVisible();
  await expect(guest.getByText('Payment is due on delivery.')).toBeVisible();
  await expect(guest.getByLabel('Payment proof file')).toHaveCount(0);
  expect(
    (
      await db.query(
        "SELECT count(*)::int AS n FROM shop_orders WHERE email=$1 AND payment_method='cod'",
        [email],
      )
    ).rows[0].n,
  ).toBe(1);
  await db.query(
    "UPDATE shop_orders SET customer_access_expires_at=now()-interval '1 minute' WHERE id=$1",
    [orderId],
  );
  expect((await guest.request.get(`/api/shop/payment-proofs/${proof.id}`)).status()).toBe(404);
  expect((await guest.goto(`/shop/orders/${orderId}`))?.status()).toBe(404);
  await page.getByRole('checkbox', { name: /Enable cash on delivery/ }).uncheck();
  await page.getByRole('button', { name: 'Save settings', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Changes saved');
  await guest.goto('/shop');
  await expect(
    guest.getByText('Cash on delivery is available. Choose COD at checkout.'),
  ).toHaveCount(0);
  await guest.close();
});
