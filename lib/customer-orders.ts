import 'server-only';
import { cookies } from 'next/headers';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { pool } from './db';
import { secureEqual } from './auth';
export function customerAccessHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
export async function setCustomerOrderAccess(id: string, token: string) {
  (await cookies()).set(`ducky_order_${id}`, token, {
    httpOnly: true,
    secure:
      process.env.COOKIE_SECURE === 'true' || process.env.SITE_URL?.startsWith('https://') === true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}
export async function canAccessCustomerOrder(id: string, hash: string | null, active: boolean) {
  if (!active || !hash || !z.uuid().safeParse(id).success) return false;
  const token = (await cookies()).get(`ducky_order_${id}`)?.value;
  return !!token && /^[a-f0-9]{64}$/.test(token) && secureEqual(customerAccessHash(token), hash);
}
export async function customerOrder(id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const result = await pool.query(
    'SELECT id,number,name,subtotal,shipping,currency,status,payment_method,payment_status,customer_access_hash,(customer_access_expires_at>now()) AS access_active FROM shop_orders WHERE id=$1',
    [id],
  );
  const order = result.rows[0];
  if (
    !order ||
    !(await canAccessCustomerOrder(id, order.customer_access_hash, order.access_active))
  )
    return null;
  const { customer_access_hash: _, access_active: __, ...safe } = order;
  return safe as {
    id: string;
    number: string;
    name: string;
    subtotal: number;
    shipping: number;
    currency: string;
    status: string;
    payment_method: string;
    payment_status: string;
  };
}
