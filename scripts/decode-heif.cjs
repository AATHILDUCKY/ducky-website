const { parentPort, workerData } = require('node:worker_threads');
const libheif = require('libheif-js/wasm-bundle');
const sharp = require('sharp');

sharp.cache(false);
sharp.concurrency(1);

(async () => {
  await libheif.ready;
  const decoder = new libheif.HeifDecoder();
  let images = [];
  try {
    images = decoder.decode(workerData.input);
    const image = images.find((item) => item.is_primary()) || images[0];
    if (!image) throw new Error('HEIF_IMAGE_MISSING');
    const width = image.get_width();
    const height = image.get_height();
    // Check before allocating RGBA pixels or calling the HEVC decoder.
    if (width <= 0 || height <= 0 || width * height > workerData.maxPixels) {
      throw new Error('IMAGE_DIMENSIONS');
    }
    const pixels = await new Promise((resolve, reject) => {
      image.display(
        { data: new Uint8ClampedArray(width * height * 4), width, height },
        (result) => {
          if (result) resolve(result.data);
          else reject(new Error('HEIF_DECODE_FAILED'));
        },
      );
    });
    const data = await sharp(pixels, { raw: { width, height, channels: 4 } })
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer();
    parentPort.postMessage({ data });
  } finally {
    for (const image of images) image.free();
    decoder.decoder?.delete();
  }
})().catch((error) => parentPort.postMessage({ error: error.message }));
