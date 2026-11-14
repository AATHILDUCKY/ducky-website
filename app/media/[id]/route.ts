import { pool } from '@/lib/db';
import { z } from 'zod';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new Response('Not found', { status: 404 });
  const etag = `"${id}"`;
  if (request.headers.get('if-none-match') === etag)
    return new Response(null, { status: 304, headers: { ETag: etag } });
  const r = await pool.query('SELECT data FROM media WHERE id=$1', [id]);
  if (!r.rowCount) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(r.rows[0].data), {
    headers: {
      'Content-Type': 'image/webp',
      'Content-Length': String(r.rows[0].data.length),
      'Cache-Control': 'public, max-age=31536000, immutable',
      ETag: etag,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
