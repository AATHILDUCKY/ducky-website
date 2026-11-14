export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 50_000_000;
export const IMAGE_ACCEPT = 'image/*,.heic,.heif,.heics,.heifs,.hif,.tif,.tiff';
export const SUPPORTED_IMAGE_FORMATS = 'JPEG, PNG, WebP, AVIF, GIF, TIFF, or HEIC/HEIF';

// Files from iOS Files and drag-and-drop can have an empty or generic MIME type.
// This is only a picker hint; the server validates the actual image bytes.
export function isImageFile(file: { name: string; type: string }) {
  return (
    file.type.startsWith('image/') ||
    /\.(?:jpe?g|jpe|jfif|png|apng|webp|avif|gif|tiff?|heic|heif|heics|heifs|hif)$/i.test(file.name)
  );
}

export class ImageUploadError extends Error {}
