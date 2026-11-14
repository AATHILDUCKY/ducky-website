import sharp from 'sharp';
sharp.cache({ memory: 16, files: 0, items: 20 });
sharp.concurrency(1);
export async function compressImage(input: Buffer) {
  const source = sharp(input, { limitInputPixels: 20000000, animated: false, failOn: 'error' });
  const meta = await source.metadata();
  if (!['jpeg', 'png', 'webp', 'avif', 'gif', 'heif', 'tiff'].includes(meta.format || ''))
    throw new Error('Please choose a JPEG, PNG, WebP, AVIF, GIF or TIFF image.');
  for (const width of [1600, 1280, 1024, 800, 640, 480, 320, 160]) {
    for (const quality of [78, 60, 42, 25]) {
      const { data, info } = await source
        .clone()
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality, effort: 4 })
        .toBuffer({ resolveWithObject: true });
      if (data.length < 50000) return { data, width: info.width, height: info.height };
    }
  }
  throw new Error('This image could not be compressed below 50 KB. Please choose a simpler image.');
}
