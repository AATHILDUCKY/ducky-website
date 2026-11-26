import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import PDFDocument from 'pdfkit';
import { preparePaymentProof } from '../lib/payment-proof-file';
import { shopSettingsSchema, checkoutSchema } from '../lib/shop-validation';
import { MAX_PROOF_BYTES } from '../lib/payment-proof-types';
test('COD defaults to disabled and requires an explicit boolean setting', () => {
  const settings = {
    currency: 'LKR',
    shipping: 0,
    payment: 'manual',
    delivery: 'Contact us for delivery.',
    returns: 'Contact us for returns.',
  };
  assert.equal(shopSettingsSchema.parse(settings).cod_enabled, false);
  assert.equal(shopSettingsSchema.parse({ ...settings, cod_enabled: true }).cod_enabled, true);
  assert.equal(shopSettingsSchema.safeParse({ ...settings, cod_enabled: 'true' }).success, false);
  assert.equal(checkoutSchema.safeParse({ access_token: 'not-a-token' }).success, false);
});
test('payment images keep readable resolution and become metadata-free WebP files', async () => {
  const source = await sharp({
    create: { width: 1800, height: 2400, channels: 3, background: '#ffffff' },
  })
    .png()
    .toBuffer();
  const result = await preparePaymentProof(source);
  assert.equal(result.mime, 'image/webp');
  const meta = await sharp(result.data).metadata();
  assert.equal(meta.width, 1800);
  assert.equal(meta.height, 2400);
  assert.equal(meta.exif, undefined);
});
test('PDF receipt files are preserved and unsafe or oversized formats are rejected', async () => {
  const doc = new PDFDocument();
  const chunks: Buffer[] = [];
  doc.on('data', (c) => chunks.push(c));
  const finished = new Promise<Buffer>((resolve) =>
    doc.on('end', () => resolve(Buffer.concat(chunks))),
  );
  doc.text('Transfer receipt test');
  doc.end();
  const pdf = await finished;
  const normalized = await preparePaymentProof(pdf);
  assert.equal(normalized.mime, 'application/pdf');
  assert.deepEqual(normalized.data, pdf);
  for (const input of [
    Buffer.from('<script>alert(1)</script>'),
    Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>'),
    Buffer.from('%PDF-1.7\ntruncated'),
    Buffer.alloc(MAX_PROOF_BYTES + 1),
  ])
    await assert.rejects(() => preparePaymentProof(input));
});
