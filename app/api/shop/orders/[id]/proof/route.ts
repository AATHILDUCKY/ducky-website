import { z } from 'zod';
import { pool } from '@/lib/db';
import { customerOrder } from '@/lib/customer-orders';
import { preparePaymentProof } from '@/lib/payment-proof-file';
import { MAX_PROOF_BYTES, MAX_ORDER_PROOFS } from '@/lib/payment-proof-types';
import { revalidatePath } from 'next/cache';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' };
function reply(error: string, status: number) {
  return Response.json({ error }, { status, headers });
}
async function handleUpload(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return reply('Order not found.', 404);
  const origin = request.headers.get('origin');
  const expected = new URL(process.env.SITE_URL || request.url);
  let allowed = origin === expected.origin;
  if (origin) {
    try {
      const incoming = new URL(origin);
      allowed ||=
        ['localhost', '127.0.0.1'].includes(expected.hostname) &&
        ['localhost', '127.0.0.1'].includes(incoming.hostname) &&
        incoming.protocol === expected.protocol &&
        incoming.port === expected.port;
    } catch {}
  }
  if (!allowed) return reply('Upload origin is not allowed.', 403);
  const order = await customerOrder(id);
  if (!order)
    return reply('Open this order in the browser used at checkout to upload payment proof.', 403);
  if (
    order.payment_method === 'cod' ||
    order.status === 'cancelled' ||
    order.payment_status !== 'unpaid'
  )
    return reply('This order is not accepting payment proof.', 409);
  const rate = await pool.query(
    `INSERT INTO shop_proof_limits(key) VALUES($1) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN shop_proof_limits.window_start<now()-interval '1 hour' THEN 1 ELSE shop_proof_limits.attempts+1 END,window_start=CASE WHEN shop_proof_limits.window_start<now()-interval '1 hour' THEN now() ELSE shop_proof_limits.window_start END RETURNING attempts`,
    [id],
  );
  if (rate.rows[0].attempts > 10)
    return reply('Too many upload attempts. Please try again in an hour.', 429);
  if (Number(request.headers.get('content-length') || 0) > MAX_PROOF_BYTES + 65536)
    return reply('Choose a file smaller than 5 MB.', 413);
  let form: FormData;
  try {
    const reader = request.body?.getReader();
    if (!reader) return reply('Choose a payment proof to upload.', 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_PROOF_BYTES + 65536) {
        await reader.cancel();
        return reply('Choose a file smaller than 5 MB.', 413);
      }
      chunks.push(value);
    }
    form = await new Request(request.url, {
      method: 'POST',
      headers: { 'content-type': request.headers.get('content-type') || '' },
      body: Buffer.concat(chunks),
    }).formData();
  } catch {
    return reply('The upload could not be read. Please choose the file again.', 400);
  }
  const uploadId = z.uuid().safeParse(form.get('upload_id'));
  const file = form.get('file');
  if (!uploadId.success || !(file instanceof File) || !file.size)
    return reply('Choose a payment proof to upload.', 400);
  if (file.size > MAX_PROOF_BYTES) return reply('Choose a file smaller than 5 MB.', 413);
  let prepared;
  try {
    prepared = await preparePaymentProof(Buffer.from(await file.arrayBuffer()));
  } catch (error) {
    return reply((error as Error).message, 400);
  }
  const filename = (file.name || 'Payment proof')
    .replace(/[^\p{L}\p{N} ._()-]/gu, '_')
    .slice(0, 160);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = (
      await client.query(
        'SELECT status,payment_status,payment_method FROM shop_orders WHERE id=$1 FOR UPDATE',
        [id],
      )
    ).rows[0];
    if (
      !current ||
      current.status === 'cancelled' ||
      current.payment_status !== 'unpaid' ||
      current.payment_method === 'cod'
    ) {
      await client.query('ROLLBACK');
      return reply('This order is not accepting payment proof.', 409);
    }
    const duplicate = await client.query(
      'SELECT id FROM shop_payment_proofs WHERE upload_id=$1 AND order_id=$2',
      [uploadId.data, id],
    );
    if (duplicate.rowCount) {
      await client.query('COMMIT');
      return Response.json({ success: true }, { headers });
    }
    const count = (
      await client.query(
        'SELECT count(*)::int AS count FROM shop_payment_proofs WHERE order_id=$1',
        [id],
      )
    ).rows[0].count;
    if (count >= MAX_ORDER_PROOFS) {
      await client.query('ROLLBACK');
      return reply('This order has reached the upload limit. Please contact the shop.', 409);
    }
    await client.query(
      'INSERT INTO shop_payment_proofs(order_id,upload_id,filename,mime,data) VALUES($1,$2,$3,$4,$5)',
      [id, uploadId.data, filename, prepared.mime, prepared.data],
    );
    await client.query('COMMIT');
  } catch {
    await client.query('ROLLBACK');
    return reply('Could not save your proof. Please try again.', 503);
  } finally {
    client.release();
  }
  revalidatePath('/admin/orders', 'layout');
  revalidatePath(`/shop/orders/${id}`);
  return Response.json({ success: true }, { status: 201, headers });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    return await handleUpload(request, context);
  } catch (error) {
    console.error(
      'Payment proof upload failed',
      error instanceof Error ? error.message : 'Unknown error',
    );
    return reply('Payment uploads are temporarily unavailable. Please try again.', 503);
  }
}
