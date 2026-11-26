'use server';
import { z } from 'zod';
import { revalidatePath, updateTag } from 'next/cache';
import { pool } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { orderStatuses, paymentStatuses } from '@/lib/order-utils';
import type { OrderItem, ShopState } from '@/lib/shop-types';
export async function updateOrder(_: ShopState, form: FormData): Promise<ShopState> {
  await requireAdmin();
  const parsed = z
    .object({
      id: z.uuid(),
      revision: z.string().min(1).max(100),
      status: z.enum(orderStatuses),
      payment_status: z.enum(paymentStatuses),
      admin_note: z.string().max(2000),
      tracking: z.string().trim().max(300),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { error: 'Please check the order fields and refresh if this tab is out of date.' };
  const v = parsed.data;
  const client = await pool.connect().catch(() => null);
  if (!client) return { error: 'Orders are temporarily unavailable. Please try again.' };
  let restored = false;
  try {
    await client.query('BEGIN');
    const order = (
      await client.query(
        'SELECT id,status,items,updated_at::text AS revision FROM shop_orders WHERE id=$1 FOR UPDATE',
        [v.id],
      )
    ).rows[0];
    if (!order) throw new Error('Order not found.');
    if (order.revision !== v.revision)
      throw new Error(
        'This order changed in another tab. Refresh to review the latest details before saving.',
      );
    if (order.status === 'cancelled' && v.status !== 'cancelled')
      throw new Error('Cancelled orders cannot be reopened.');
    if (v.status === 'cancelled' && order.status !== 'cancelled') {
      for (const item of [...(order.items as OrderItem[])].sort((a, b) => a.id.localeCompare(b.id)))
        await client.query('UPDATE shop_products SET stock=stock+$2,updated_at=now() WHERE id=$1', [
          item.id,
          item.quantity,
        ]);
      restored = true;
    }
    await client.query(
      'UPDATE shop_orders SET status=$2,payment_status=$3,admin_note=$4,tracking=$5,updated_at=clock_timestamp() WHERE id=$1',
      [v.id, v.status, v.payment_status, v.admin_note, v.tracking],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    const message = error instanceof Error ? error.message : '';
    return {
      error: /not found|changed in another|cannot be reopened/.test(message)
        ? message
        : 'Could not update this order. Please try again.',
    };
  } finally {
    client.release();
  }
  revalidatePath('/admin/orders', 'layout');
  if (restored) {
    updateTag('sitemaps');
    revalidatePath('/shop', 'layout');
    revalidatePath('/admin/shop');
  }
  return { success: true };
}

export async function reviewPaymentProof(_: ShopState, form: FormData): Promise<ShopState> {
  await requireAdmin();
  const parsed = z
    .object({
      order_id: z.uuid(),
      proof_id: z.uuid(),
      decision: z.enum(['approve', 'reject']),
      review_note: z.string().trim().max(500),
    })
    .refine((v) => v.decision !== 'reject' || v.review_note.length >= 3, {
      message: 'Give a short reason so the customer knows what to correct.',
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join(' ') };
  const v = parsed.data;
  const client = await pool.connect().catch(() => null);
  if (!client) return { error: 'Could not connect. Please try again.' };
  try {
    await client.query('BEGIN');
    const order = (
      await client.query('SELECT status,payment_status FROM shop_orders WHERE id=$1 FOR UPDATE', [
        v.order_id,
      ])
    ).rows[0];
    const proof = (
      await client.query(
        'SELECT status FROM shop_payment_proofs WHERE id=$1 AND order_id=$2 FOR UPDATE',
        [v.proof_id, v.order_id],
      )
    ).rows[0];
    if (!order || !proof) throw new Error('Payment proof not found.');
    if (proof.status !== 'pending')
      throw new Error('This proof has already been reviewed. Refresh to see the result.');
    if (
      v.decision === 'approve' &&
      (order.status === 'cancelled' || order.payment_status !== 'unpaid')
    )
      throw new Error('Only an unpaid, active order can be marked paid.');
    await client.query(
      'UPDATE shop_payment_proofs SET status=$2,review_note=$3,reviewed_at=clock_timestamp() WHERE id=$1',
      [v.proof_id, v.decision === 'approve' ? 'approved' : 'rejected', v.review_note],
    );
    if (v.decision === 'approve')
      await client.query(
        "UPDATE shop_orders SET payment_status='paid',updated_at=clock_timestamp() WHERE id=$1",
        [v.order_id],
      );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    const message = error instanceof Error ? error.message : '';
    return {
      error: /not found|already been reviewed|Only an unpaid/.test(message)
        ? message
        : 'Could not save this review. Please try again.',
    };
  } finally {
    client.release();
  }
  revalidatePath('/admin/orders', 'layout');
  revalidatePath(`/shop/orders/${v.order_id}`);
  return { success: true };
}
