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
