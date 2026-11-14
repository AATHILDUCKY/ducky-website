import { Worker } from 'node:worker_threads';
import { resolve } from 'node:path';
import { ImageUploadError, MAX_IMAGE_PIXELS } from './image-upload';

export function isHeifImage(input: Buffer) {
  if (input.length < 16 || input.toString('ascii', 4, 8) !== 'ftyp') return false;
  const end = input.readUInt32BE(0);
  if (end < 16 || end > input.length) return false;
  const brands = [input.toString('ascii', 8, 12)];
  for (let offset = 16; offset + 4 <= end; offset += 4) {
    brands.push(input.toString('ascii', offset, offset + 4));
  }
  // AVIF shares the HEIF container, but Sharp can decode it natively.
  return (
    !brands.some((brand) => ['avif', 'avis'].includes(brand)) &&
    brands.some((brand) => /^(heic|heix|hevc|hevx|heim|heis|hevm|hevs|mif1|msf1)$/.test(brand))
  );
}

export async function decodeHeif(input: Buffer) {
  // Isolate synchronous WASM decoding so large photos cannot block requests.
  // Terminating the worker releases its WASM memory after every conversion.
  const worker = new Worker(resolve(process.cwd(), 'scripts/decode-heif.cjs'), {
    workerData: { input: Uint8Array.from(input), maxPixels: MAX_IMAGE_PIXELS },
    execArgv: [],
    resourceLimits: { maxOldGenerationSizeMb: 128 },
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await new Promise<Buffer>((resolve, reject) => {
      timer = setTimeout(
        () =>
          reject(new ImageUploadError('This photo took too long to process. Try a smaller image.')),
        30_000,
      );
      worker.once('message', (message: { data?: Uint8Array; error?: string }) => {
        if (message.data) resolve(Buffer.from(message.data));
        else {
          reject(
            new ImageUploadError(
              message.error === 'IMAGE_DIMENSIONS'
                ? 'Please choose an image with at most 50 megapixels.'
                : 'Could not decode this HEIC/HEIF photo. Try exporting it as JPEG or PNG.',
            ),
          );
        }
      });
      worker.once('error', () =>
        reject(new ImageUploadError('Could not process this photo. Try a smaller image.')),
      );
      worker.once('exit', () =>
        reject(new ImageUploadError('The photo conversion stopped. Please try again.')),
      );
    });
  } finally {
    clearTimeout(timer);
    await worker.terminate();
  }
}
