import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import sharp from 'sharp';
import { compressImage } from '../lib/images';
test('a noisy full-resolution upload becomes a genuine WebP strictly below 50,000 bytes', async () => {
  const input = await sharp(randomBytes(1800 * 1200 * 3), {
    raw: { width: 1800, height: 1200, channels: 3 },
  })
    .png()
    .toBuffer();
  const compressed = await compressImage(input);
  const info = await sharp(compressed.data).metadata();
  assert.ok(compressed.data.length < 50000);
  assert.equal(info.format, 'webp');
  assert.equal(info.width, compressed.width);
  assert.ok(compressed.width <= 1600);
});
test('small images keep their size and metadata is removed', async () => {
  const input = await sharp({
    create: { width: 80, height: 60, channels: 3, background: '#335544' },
  })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();
  const result = await compressImage(input);
  const info = await sharp(result.data).metadata();
  assert.ok(result.data.length < 50000);
  assert.equal(info.orientation, undefined);
  assert.equal(info.format, 'webp');
  assert.equal(result.width, 60);
  assert.equal(result.height, 80);
});
test('malformed and SVG uploads are rejected', async () => {
  await assert.rejects(() => compressImage(Buffer.from('not an image')));
  await assert.rejects(() =>
    compressImage(
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>',
      ),
    ),
  );
});
