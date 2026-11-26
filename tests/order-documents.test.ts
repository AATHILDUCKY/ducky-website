import { test } from 'node:test';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { orderFilters, orderHref, documentKinds } from '../lib/order-utils';
import { orderPdf } from '../lib/order-pdf';
import { OrderDocument } from '../components/order-document';
import type { Order } from '../lib/shop-types';
const order: Order = {
  id: '123',
  number: '42',
  name: 'Zoë <Customer>',
  email: 'customer@example.com',
  phone: '+94770000000',
  address: '123 Test Street',
  city: 'Colombo',
  postal_code: '00100',
  country: 'Sri Lanka',
  notes: 'Leave with reception.',
  items: [
    {
      id: 'a',
      slug: 'item',
      name: 'A long product name with <script>unsafe()</script>',
      price: 123450,
      quantity: 2,
    },
  ],
  subtotal: 246900,
  shipping: 35000,
  currency: 'LKR',
  status: 'confirmed',
  payment_method: 'manual',
  payment_status: 'unpaid',
  admin_note: 'TOP SECRET INTERNAL NOTE',
  tracking: 'TRACK-42',
  created_at: '2026-11-26T01:00:00.000Z',
};
const seller = { name: 'Ducky', email: 'seller@example.com' };
test('order filters bound pagination and preserve selected filters in navigation', () => {
  for (const page of ['-1', '1.5', 'Infinity', 'invalid'])
    assert.equal(orderFilters({ page }).page, 1);
  assert.equal(orderFilters({ page: '999999999' }).page, 100000);
  assert.equal(orderFilters({ q: ' x '.repeat(1000) }).q.length, 150);
  assert.equal(orderFilters({ status: 'invalid', payment: 'invalid', sort: 'sql' }).status, '');
  const filters = orderFilters({ q: 'DK-42', payment: 'due', status: 'active', sort: 'oldest' });
  const href = orderHref(filters, { page: 2 });
  assert.match(href, /payment=due/);
  assert.match(href, /status=active/);
  assert.match(href, /page=2/);
});
test('customer documents escape content and omit internal notes; shipping omits item prices', () => {
  for (const kind of documentKinds) {
    const html = renderToStaticMarkup(createElement(OrderDocument, { order, kind, seller }));
    assert.ok(!html.includes(order.admin_note));
    assert.ok(!html.includes('<script>unsafe()'));
    assert.ok(html.includes('&lt;Customer&gt;'));
    assert.ok(html.includes('TRACK-42'));
    if (kind === 'shipping') {
      assert.ok(!html.includes('Unit price'));
      assert.ok(!html.includes('1,234.50'));
    } else {
      assert.ok(html.includes('2,819.00'));
      assert.ok(html.includes('Payment has not been recorded as received'));
    }
  }
  const cancelled = renderToStaticMarkup(
    createElement(OrderDocument, {
      order: { ...order, status: 'cancelled' },
      kind: 'invoice',
      seller,
    }),
  );
  assert.match(cancelled, /This order is cancelled/);
});
test('all three document types generate compact PDFs and long orders paginate safely', async () => {
  for (const kind of documentKinds) {
    const pdf = await orderPdf(order, kind, seller);
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
    assert.ok(pdf.length < 150000);
    assert.ok(pdf.toString('latin1').includes('%%EOF'));
    assert.ok(!pdf.includes(Buffer.from(order.admin_note)));
  }
  const long = {
    ...order,
    items: Array.from({ length: 30 }, (_, i) => ({
      ...order.items[0],
      id: String(i),
      name: `Product ${i} ` + 'detailed '.repeat(17),
    })),
    notes: 'Delivery instructions '.repeat(45),
  };
  const pdf = await orderPdf(long, 'invoice', seller);
  assert.ok(pdf.length > 1000);
  assert.ok((pdf.toString('latin1').match(/\/Type \/Page\b/g) || []).length > 1);
});

test('the PDF font covers document text, amounts, references and accented customer names', () => {
  const require = createRequire(import.meta.url);
  const fontkit = require('fontkit') as {
    create: (data: Buffer) => { hasGlyphForCodePoint: (point: number) => boolean };
  };
  const font = fontkit.create(
    readFileSync(new URL('../assets/fonts/DejaVuSans-orders.ttf', import.meta.url)),
  );
  const text =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 @+-/.,:_() Zoë LKR 1,234.50';
  for (const letter of text)
    assert.ok(
      font.hasGlyphForCodePoint(letter.codePointAt(0)!),
      `Missing PDF character: ${letter}`,
    );
});
