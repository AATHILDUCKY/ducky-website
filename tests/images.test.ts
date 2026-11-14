import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { compressImage } from '../lib/images';
import { IMAGE_ACCEPT, isImageFile, MAX_IMAGE_BYTES } from '../lib/image-upload';
import { isHeifImage } from '../lib/heif';
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

test('HEVC photos decode without native HEIC support and preserve visible image content', async () => {
  const input = await readFile(new URL('./fixtures/sample.heic', import.meta.url));
  assert.equal(isHeifImage(input), true);
  const result = await compressImage(input);
  const meta = await sharp(result.data).metadata();
  assert.equal(meta.format, 'webp');
  assert.ok(result.data.length < 50000);
  assert.ok(Math.abs(result.width / result.height - 1280 / 854) < 0.01);
  assert.equal(meta.exif, undefined);
  assert.ok((await sharp(result.data).stats()).channels.some((channel) => channel.stdev > 1));
  await assert.rejects(() => compressImage(input.subarray(0, 200)), /HEIC\/HEIF/);
});

test('JPEG, PNG, WebP, AVIF, GIF and TIFF still convert to bounded WebP images', async () => {
  for (const format of ['jpeg', 'png', 'webp', 'avif', 'gif', 'tiff'] as const) {
    const input = await sharp({
      create: { width: 64, height: 48, channels: 4, background: '#4677aa' },
    })
      .toFormat(format)
      .toBuffer();
    assert.equal(isHeifImage(input), false, format);
    const result = await compressImage(input);
    assert.equal((await sharp(result.data).metadata()).format, 'webp', format);
    assert.ok(result.data.length < 50000, format);
    assert.equal(result.width, 64, format);
    assert.equal(result.height, 48, format);
  }
});

test('48 MP photos are accepted while oversized files and images fail clearly', async () => {
  const photo = await sharp({
    create: { width: 8000, height: 6000, channels: 3, background: '#4677aa' },
  })
    .jpeg()
    .toBuffer();
  assert.ok((await compressImage(photo)).data.length < 50000);
  const oversized = await sharp({
    create: { width: 8000, height: 6500, channels: 3, background: '#4677aa' },
  })
    .png()
    .toBuffer();
  await assert.rejects(() => compressImage(oversized), /50 megapixels/);
  await assert.rejects(() => compressImage(Buffer.alloc(MAX_IMAGE_BYTES + 1)), /10 MB/);
});

test('iPhone picker, paste and drop recognize photos with missing or generic MIME types', () => {
  assert.ok(IMAGE_ACCEPT.includes('.heic'));
  assert.ok(IMAGE_ACCEPT.includes('.heif'));
  for (const name of ['IMG_1001.HEIC', 'photo.heif', 'burst.heics', 'photo.hif', 'scan.TIF']) {
    assert.equal(isImageFile({ name, type: '' }), true);
    assert.equal(isImageFile({ name, type: 'application/octet-stream' }), true);
  }
  assert.equal(isImageFile({ name: 'clipboard', type: 'image/png' }), true);
  assert.equal(isImageFile({ name: 'document.pdf', type: 'application/pdf' }), false);
  assert.equal(isImageFile({ name: 'photo.heic.exe', type: '' }), false);
});
