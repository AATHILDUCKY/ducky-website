'use server';
import { createHash } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { pool } from '@/lib/db';
import { checkoutSchema } from '@/lib/shop-validation';
import type { OrderItem, ShopSettings, ShopState } from '@/lib/shop-types';
export async function placeOrder(_: ShopState, form: FormData): Promise<ShopState> {
  let items;
  try {
    items = JSON.parse(String(form.get('items')));
  } catch {
    return { error: 'Please refresh your shopping bag.' };
  }
  const parsed = checkoutSchema.safeParse({ ...Object.fromEntries(form), items });
  if (!parsed.success)
    return { error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(' ') };
  const p = parsed.data;
  const client = await pool.connect().catch(() => null);
  if (!client)
    return {
      error:
        'The shop is temporarily unavailable. Your order has not been placed. Please try again.',
    };
  let result: ShopState;
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [p.submission_id]);
    const existing = (
      await client.query(
        'SELECT number,subtotal+shipping AS total,currency FROM shop_orders WHERE submission_id=$1',
        [p.submission_id],
      )
    ).rows[0];
    if (existing) {
      await client.query('COMMIT');
      return { success: true, order: existing };
    }
    const key = createHash('sha256').update(p.email).digest('hex');
    const rate = await client.query(
      `INSERT INTO shop_order_limits(key) VALUES($1) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN shop_order_limits.window_start<now()-interval '1 hour' THEN 1 ELSE shop_order_limits.attempts+1 END,window_start=CASE WHEN shop_order_limits.window_start<now()-interval '1 hour' THEN now() ELSE shop_order_limits.window_start END RETURNING attempts`,
      [key],
    );
    if (rate.rows[0].attempts > 5) {
      await client.query('COMMIT');
      return { error: 'Too many orders from this email. Please try again in an hour.' };
    }
    const settings: ShopSettings = (
      await client.query("SELECT value FROM settings WHERE key='shop' FOR SHARE")
    ).rows[0].value;
    if (
      String(form.get('currency')) !== settings.currency ||
      Number(form.get('shipping')) !== settings.shipping ||
      form.get('payment') !== settings.payment
    )
      throw new Error('Delivery or currency has changed. Refresh to review the updated total.');
    const products = (
      await client.query(
        'SELECT * FROM shop_products WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE',
        [p.items.map((i) => i.id)],
      )
    ).rows;
    const snapshot: OrderItem[] = p.items.map((item) => {
      const product = products.find((v) => v.id === item.id);
      if (!product || product.status !== 'published')
        throw new Error('An item is no longer available. Please update your bag.');
      if (product.stock < item.quantity)
        throw new Error(
          `${product.name}: only ${product.stock} available. Please update your bag.`,
        );
      if (product.price !== item.price)
        throw new Error(
          `${product.name}: the price has changed. Refresh to review the updated price.`,
        );
      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        quantity: item.quantity,
      };
    });
    const subtotal = snapshot.reduce((sum, i) => sum + i.price * i.quantity, 0);
    if (subtotal + settings.shipping > 2000000000)
      throw new Error('This order exceeds the order limit. Please contact us.');
    const saved = await client.query(
      `INSERT INTO shop_orders(submission_id,name,email,phone,address,city,postal_code,country,notes,items,subtotal,shipping,currency,payment_method) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING number,subtotal+shipping AS total,currency`,
      [
        p.submission_id,
        p.name,
        p.email,
        p.phone,
        p.address,
        p.city,
        p.postal_code,
        p.country,
        p.notes,
        JSON.stringify(snapshot),
        subtotal,
        settings.shipping,
        settings.currency,
        settings.payment,
      ],
    );
    for (const i of snapshot)
      await client.query('UPDATE shop_products SET stock=stock-$2,updated_at=now() WHERE id=$1', [
        i.id,
        i.quantity,
      ]);
    await client.query("DELETE FROM shop_order_limits WHERE window_start<now()-interval '1 day'");
    await client.query('COMMIT');
    result = { success: true, order: saved.rows[0] };
  } catch (e) {
    await client.query('ROLLBACK');
    const message = e instanceof Error ? e.message : '';
    result = {
      error: /available|changed|limit/.test(message)
        ? message
        : 'Your order could not be saved. Please try again.',
    };
  } finally {
    client.release();
  }
  revalidatePath('/shop', 'layout');
  revalidatePath('/admin/shop', 'layout');
  return result;
}
