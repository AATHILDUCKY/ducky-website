import sharp from 'sharp';
import { decodeHeif, isHeifImage } from './heif';
import {
  ImageUploadError,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_PIXELS,
  SUPPORTED_IMAGE_FORMATS,
} from './image-upload';
sharp.cache({ memory: 16, files: 0, items: 20 });
sharp.concurrency(1);
export async function compressImage(input: Buffer) {
  if (input.length > MAX_IMAGE_BYTES)
    throw new ImageUploadError('Please choose an image smaller than 10 MB.');
  const decoded = isHeifImage(input) ? await decodeHeif(input) : input;
  const source = sharp(decoded, {
    limitInputPixels: MAX_IMAGE_PIXELS,
    animated: false,
    failOn: 'error',
  });
  let meta;
  try {
    meta = await source.metadata();
  } catch (error) {
    throw new ImageUploadError(
      (error as Error).message.includes('pixel limit')
        ? 'Please choose an image with at most 50 megapixels.'
        : `Could not read this image. Choose a valid ${SUPPORTED_IMAGE_FORMATS} image.`,
    );
  }
  if (!['jpeg', 'png', 'webp', 'avif', 'gif', 'heif', 'tiff'].includes(meta.format || ''))
    throw new ImageUploadError(`Please choose a ${SUPPORTED_IMAGE_FORMATS} image.`);
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
  throw new ImageUploadError(
    'This image could not be compressed below 50 KB. Please choose a simpler image.',
  );
}
