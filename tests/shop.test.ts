import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { checkoutSchema, productSchema, shopSettingsSchema } from '../lib/shop-validation';
import { money } from '../lib/shop-types';
import { publicPaths } from '../lib/sitemap-xml';
const product = {
  name: 'Useful item',
  slug: 'useful-item',
  description: 'A detailed product description.',
  category: 'Tools',
  price: 125050,
  stock: 2,
  images: [randomUUID()],
  status: 'published',
  seo_title: '',
  seo_description: '',
};
const checkout = {
  submission_id: randomUUID(),
  access_token: 'a'.repeat(64),
  name: 'Test Customer',
  email: 'CUSTOMER@example.com',
  phone: '+94 77 123 4567',
  address: '123 Test Street',
  city: 'Colombo',
  postal_code: '00100',
  country: 'Sri Lanka',
  notes: '',
  consent: 'yes',
  items: [{ id: randomUUID(), quantity: 1, price: 125050 }],
};
test('products require valid money, stock, URL and photos before publishing', () => {
  assert.equal(productSchema.safeParse(product).success, true);
  for (const change of [
    { price: 0 },
    { price: 1.2 },
    { stock: -1 },
    { slug: 'Bad URL' },
    { images: [] },
    { images: ['invalid'] },
  ])
    assert.equal(productSchema.safeParse({ ...product, ...change }).success, false);
  assert.equal(productSchema.safeParse({ ...product, status: 'draft', images: [] }).success, true);
});
test('checkout validates contact details, consent and unique bounded quantities', () => {
  assert.equal(checkoutSchema.parse(checkout).email, 'customer@example.com');
  for (const change of [
    { consent: undefined },
    { email: 'bad' },
    { phone: 'not a phone' },
    { country: 'Other' },
    { items: [] },
    { items: [{ ...checkout.items[0], quantity: 0 }] },
    { items: [{ ...checkout.items[0], quantity: 100 }] },
    { items: [checkout.items[0], checkout.items[0]] },
  ])
    assert.equal(checkoutSchema.safeParse({ ...checkout, ...change }).success, false);
});
test('delivery fees use integer minor units and only supported currencies and methods', () => {
  const settings = {
    currency: 'LKR',
    shipping: 35000,
    payment: 'manual',
    delivery: 'Delivery within Sri Lanka.',
    returns: 'Contact us for returns.',
  };
  assert.equal(shopSettingsSchema.safeParse(settings).success, true);
  for (const change of [
    { shipping: -1 },
    { shipping: 1.5 },
    { currency: 'BAD' },
    { payment: 'card' },
  ])
    assert.equal(shopSettingsSchema.safeParse({ ...settings, ...change }).success, false);
  assert.match(money(125050, 'LKR'), /1,250\.50/);
  assert.ok(publicPaths.includes('/shop'));
  assert.ok(!publicPaths.includes('/shop/checkout'));
});
