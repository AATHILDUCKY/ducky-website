import sharp from 'sharp';
import { decodeHeif, isHeifImage } from './heif';
import { MAX_PROOF_BYTES } from './payment-proof-types';
export async function preparePaymentProof(
  input: Buffer,
): Promise<{ data: Buffer; mime: 'application/pdf' | 'image/webp' }> {
  if (!input.length || input.length > MAX_PROOF_BYTES)
    throw new Error('Choose a payment proof smaller than 5 MB.');
  if (input.subarray(0, 5).toString() === '%PDF-') {
    if (!input.subarray(-2048).includes(Buffer.from('%%EOF')))
      throw new Error('This PDF is incomplete. Please export it again.');
    return { data: input, mime: 'application/pdf' };
  }
  try {
    const decoded = isHeifImage(input) ? await decodeHeif(input) : input;
    const image = sharp(decoded, {
      limitInputPixels: 25_000_000,
      animated: false,
      failOn: 'error',
    });
    const metadata = await image.metadata();
    if (!['jpeg', 'png', 'webp', 'heif'].includes(metadata.format || ''))
      throw new Error('Unsupported image');
    // Keep receipt text legible; this deliberately avoids the 50 KB product-photo budget.
    const data = await image
      .rotate()
      .resize({ width: 2400, height: 3200, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 90, effort: 3 })
      .toBuffer();
    if (data.length > MAX_PROOF_BYTES) throw new Error('Image too large');
    return { data, mime: 'image/webp' };
  } catch {
    throw new Error(
      'Use a valid PDF, JPEG, PNG, WebP or HEIC image under 5 MB (up to 25 megapixels).',
    );
  }
}
