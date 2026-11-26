import { z } from 'zod';
import { pool } from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import { canAccessCustomerOrder } from '@/lib/customer-orders';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "sandbox; default-src 'none'",
};
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new Response('Not found', { status: 404, headers });
  const meta = (
    await pool.query(
      'SELECT p.order_id,p.mime,o.customer_access_hash,(o.customer_access_expires_at>now()) AS access_active FROM shop_payment_proofs p JOIN shop_orders o ON o.id=p.order_id WHERE p.id=$1',
      [id],
    )
  ).rows[0];
  if (
    !meta ||
    (!(await isAdmin()) &&
      !(await canAccessCustomerOrder(meta.order_id, meta.customer_access_hash, meta.access_active)))
  )
    return new Response('Not found', { status: 404, headers });
  const proof = (await pool.query('SELECT data FROM shop_payment_proofs WHERE id=$1', [id]))
    .rows[0];
  if (!proof) return new Response('Not found', { status: 404, headers });
  const pdf = meta.mime === 'application/pdf';
  const attachment = pdf || new URL(request.url).searchParams.has('download');
  return new Response(new Uint8Array(proof.data), {
    headers: {
      ...headers,
      'Content-Type': meta.mime,
      'Content-Disposition': `${attachment ? 'attachment' : 'inline'}; filename="payment-proof-${id}.${pdf ? 'pdf' : 'webp'}"`,
    },
  });
}
