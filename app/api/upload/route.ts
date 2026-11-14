import { isAdmin } from '@/lib/auth';
import { pool } from '@/lib/db';
import { compressImage } from '@/lib/images';
export const runtime = 'nodejs';
const MAX_SIZE = 10 * 1024 * 1024;
let processing = false;
export async function POST(request: Request) {
  if (!(await isAdmin()))
    return Response.json({ error: 'Sign in to upload images.' }, { status: 401 });
  const origin = request.headers.get('origin');
  const canonical = new URL(process.env.SITE_URL || request.url);
  let allowed = origin === canonical.origin;
  if (origin) {
    try {
      const incoming = new URL(origin);
      const local = ['localhost', '127.0.0.1'];
      allowed ||=
        local.includes(canonical.hostname) &&
        local.includes(incoming.hostname) &&
        incoming.protocol === canonical.protocol &&
        incoming.port === canonical.port;
    } catch {}
  }
  if (!allowed) return Response.json({ error: 'Upload origin is not allowed.' }, { status: 403 });
  const length = Number(request.headers.get('content-length') || 0);
  if (length > MAX_SIZE + 65536)
    return Response.json({ error: 'Please choose an image smaller than 10 MB.' }, { status: 413 });
  if (processing)
    return Response.json(
      { error: 'Another image is being optimized. Try again in a moment.' },
      { status: 429 },
    );
  processing = true;
  try {
    // Bound the streamed request too, including chunked requests without Content-Length.
    const reader = request.body?.getReader();
    if (!reader) return Response.json({ error: 'Choose an image to upload.' }, { status: 400 });
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_SIZE + 65536) {
        await reader.cancel();
        return Response.json({ error: 'The upload exceeds 10 MB.' }, { status: 413 });
      }
      chunks.push(value);
    }
    const form = await new Request(request.url, {
      method: 'POST',
      headers: { 'content-type': request.headers.get('content-type') || '' },
      body: Buffer.concat(chunks),
    }).formData();
    const file = form.get('file');
    if (!(file instanceof File) || !file.size)
      return Response.json({ error: 'Choose an image to upload.' }, { status: 400 });
    if (file.size > MAX_SIZE)
      return Response.json(
        { error: 'Please choose an image smaller than 10 MB.' },
        { status: 413 },
      );
    const alt = String(form.get('alt') || '').slice(0, 300);
    const result = await compressImage(Buffer.from(await file.arrayBuffer()));
    const saved = await pool.query(
      'INSERT INTO media(data,alt,width,height) VALUES($1,$2,$3,$4) RETURNING id',
      [result.data, alt, result.width, result.height],
    );
    const id = saved.rows[0].id;
    return Response.json(
      {
        id,
        url: `/media/${id}`,
        bytes: result.data.length,
        width: result.width,
        height: result.height,
      },
      { status: 201 },
    );
  } catch (e) {
    console.error('Image upload:', (e as Error).message);
    return Response.json(
      {
        error:
          'Could not process this image. Use a valid JPEG, PNG, WebP, AVIF, GIF, or TIFF under 10 MB.',
      },
      { status: 400 },
    );
  } finally {
    processing = false;
  }
}
