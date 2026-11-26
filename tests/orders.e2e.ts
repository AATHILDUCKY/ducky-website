import { test, expect } from '@playwright/test';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
const db = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const token = randomUUID();
const email = `orders-qa-${token}@example.com`;
let productId = '';
let orderId = '';
let number = '';
test.beforeAll(async () => {
  productId = (
    await db.query(
      "INSERT INTO shop_products(name,slug,description,price,stock) VALUES('Order document item',$1,'Order document test fixture',125050,5) RETURNING id",
      [`order-doc-${token}`],
    )
  ).rows[0].id;
  const items = JSON.stringify([
    {
      id: productId,
      name: 'Order document item',
      slug: `order-doc-${token}`,
      price: 125050,
      quantity: 2,
    },
  ]);
  const rows = await db.query(
    `INSERT INTO shop_orders(submission_id,name,email,phone,address,city,postal_code,country,notes,items,subtotal,shipping,currency,payment_method,status,admin_note) SELECT gen_random_uuid(),'Order QA '||g,$1,'+94771234567','123 Test Street','Colombo','00100','Sri Lanka','Leave at reception',$2::jsonb,250100,35000,'LKR','manual',CASE WHEN g=1 THEN 'confirmed' WHEN g=2 THEN 'shipped' WHEN g=3 THEN 'cancelled' ELSE 'new' END,'PRIVATE ONLY: test note' FROM generate_series(1,27) g RETURNING id,number,status`,
    [email, items],
  );
  const order = rows.rows.find((r) => r.status === 'confirmed');
  orderId = order.id;
  number = order.number;
});
test.afterAll(async () => {
  await db.query('DELETE FROM shop_orders WHERE email=$1', [email]);
  if (productId) await db.query('DELETE FROM shop_products WHERE id=$1', [productId]);
  await db.end();
});
test('dedicated orders: bounded lists, filters, private documents, PDF downloads, printing and safe updates', async ({
  page,
  browser,
  request,
}) => {
  const documentUrl = (kind: string) => `/admin/orders/${orderId}/documents/${kind}`;
  expect((await request.get(documentUrl('invoice') + '/download')).status()).toBe(401);
  await page.goto('/admin/orders');
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel('Username', { exact: true }).fill(process.env.ADMIN_USERNAME!);
  await page.getByLabel('Password', { exact: true }).fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Enter your studio' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto('/admin/orders?q=' + encodeURIComponent(email));
  await expect(page.locator('.orders-table tbody tr')).toHaveCount(25);
  await expect(page.locator('.orders-pagination')).toContainText('1–25 of 27');
  await expect(
    page
      .getByRole('navigation', { name: 'Admin navigation' })
      .getByRole('link', { name: 'Orders', exact: true }),
  ).toHaveAttribute('class', 'active');
  await page.getByRole('link', { name: 'Next', exact: true }).click();
  await expect(page.locator('.orders-table tbody tr')).toHaveCount(2);
  await expect(page.locator('.orders-pagination')).toContainText('26–27 of 27');
  await page.goto('/admin/orders?q=' + encodeURIComponent(email) + '&status=active');
  await expect(page.locator('.orders-table tbody tr')).toHaveCount(2);
  await page.goto('/admin/orders?q=' + encodeURIComponent(email) + '&payment=due');
  await expect(page.locator('.orders-pagination')).toContainText('of 26');
  await page.goto('/admin/orders?q=DK-' + number);
  await expect(page.locator('.orders-table tbody tr')).toHaveCount(1);
  await page.getByRole('link', { name: `Manage order DK-${number}` }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/orders/${orderId}$`));
  await expect(page.getByRole('heading', { name: 'Manage this order' })).toBeVisible();
  const second = await page.context().newPage();
  await second.goto(`/admin/orders/${orderId}`);
  await page.getByLabel('Tracking number / delivery reference').fill('TRACK-QA-42');
  await page.getByLabel('Internal note').fill('PRIVATE ONLY: updated note');
  await page.getByRole('button', { name: 'Update order', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Changes saved');
  await second.getByLabel('Internal note').fill('Stale overwrite');
  await second.getByRole('button', { name: 'Update order', exact: true }).click();
  await expect(
    second.getByRole('alert').filter({ hasText: 'changed in another tab' }),
  ).toBeVisible();
  await second.close();
  for (const kind of ['receipt', 'invoice', 'shipping']) {
    const pdf = await page.request.get(documentUrl(kind) + '/download');
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()['content-type']).toBe('application/pdf');
    expect(pdf.headers()['cache-control']).toContain('no-store');
    expect(pdf.headers()['content-disposition']).toContain(`DK-${number}-${kind}.pdf`);
    expect((await pdf.body()).subarray(0, 5).toString()).toBe('%PDF-');
    await page.goto(documentUrl(kind));
    await expect(page.locator('.order-document')).toContainText('TRACK-QA-42');
    expect(await page.locator('.order-document').textContent()).not.toContain('PRIVATE ONLY');
    if (kind === 'shipping') {
      await expect(
        page.getByRole('heading', { name: 'Shipping invoice', exact: true }),
      ).toBeVisible();
      expect(await page.locator('.order-document').textContent()).not.toContain('Unit price');
    } else await expect(page.locator('.order-document')).toContainText('2,851.00');
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.admin-sidebar')).toBeHidden();
    await expect(page.locator('.document-toolbar')).toBeHidden();
    await expect(page.locator('.order-document')).toBeVisible();
    await page.emulateMedia({ media: 'screen' });
  }
  expect(
    (await page.request.get(`/admin/orders/${orderId}/documents/invalid/download`)).status(),
  ).toBe(404);
  const guest = await browser.newPage();
  await guest.goto(documentUrl('invoice'));
  await expect(guest).toHaveURL(/\/admin\/login/);
  expect((await guest.request.get(documentUrl('shipping') + '/download')).status()).toBe(401);
  await guest.close();
  await page.goto(`/admin/shop/orders/${orderId}`);
  await expect(page).toHaveURL(new RegExp(`/admin/orders/${orderId}$`));
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of [
      '/admin/orders?q=' + encodeURIComponent(email),
      `/admin/orders/${orderId}`,
      documentUrl('shipping'),
    ]) {
      await page.goto(route);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${route} at ${width}`,
      ).toBeTruthy();
    }
    await page.screenshot({ path: `artifacts/order-shipping-${width}.png`, fullPage: true });
    await page.goto('/admin/orders?q=' + encodeURIComponent(email));
    await page.screenshot({ path: `artifacts/orders-workspace-${width}.png`, fullPage: true });
  }
  await page.goto(`/admin/orders/${orderId}`);
  await page.getByLabel('Order status').selectOption('cancelled');
  await page.getByRole('button', { name: 'Update order', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Changes saved');
  expect(
    (await db.query('SELECT stock FROM shop_products WHERE id=$1', [productId])).rows[0].stock,
  ).toBe(7);
  await page.getByRole('button', { name: 'Update order', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Changes saved');
  expect(
    (await db.query('SELECT stock FROM shop_products WHERE id=$1', [productId])).rows[0].stock,
  ).toBe(7);
});
