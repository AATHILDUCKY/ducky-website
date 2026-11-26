import 'server-only';
import { cache } from 'react';
import { pool } from './db';
import { requireAdmin } from './auth';
import { ORDER_PAGE_SIZE, orderFilters } from './order-utils';
import type { Order } from './shop-types';
export const getOrder = cache(
  async (id: string): Promise<(Order & { revision: string }) | undefined> => {
    await requireAdmin();
    return (
      await pool.query('SELECT *,updated_at::text AS revision FROM shop_orders WHERE id=$1', [id])
    ).rows[0];
  },
);
export type OrderSummary = Pick<
  Order,
  | 'id'
  | 'number'
  | 'name'
  | 'email'
  | 'phone'
  | 'city'
  | 'subtotal'
  | 'shipping'
  | 'currency'
  | 'status'
  | 'payment_status'
  | 'created_at'
> & { item_count: number };
export async function getOrderList(filters: ReturnType<typeof orderFilters>) {
  await requireAdmin();
  const search = filters.q.replace(/[\\%_]/g, '\\$&');
  const number = filters.q.replace(/^DK-/i, '');
  const where =
    "WHERE ($1='' OR status=$1 OR ($1='active' AND status IN ('confirmed','shipped'))) AND ($2='' OR payment_status=$2 OR ($2='due' AND payment_status='unpaid' AND status<>'cancelled')) AND ($3='' OR name ILIKE '%'||$3||'%' OR email ILIKE '%'||$3||'%' OR phone ILIKE '%'||$3||'%' OR number::text=$4)";
  const values = [filters.status, filters.payment, search, number];
  const [count, summary] = await Promise.all([
    pool.query(`SELECT count(*)::int AS count FROM shop_orders ${where}`, values),
    pool.query(
      "SELECT count(*)::int AS total,count(*) FILTER(WHERE status='new')::int AS new,count(*) FILTER(WHERE status IN ('confirmed','shipped'))::int AS active,count(*) FILTER(WHERE payment_status='unpaid' AND status<>'cancelled')::int AS unpaid,count(*) FILTER(WHERE status='completed')::int AS completed FROM shop_orders",
    ),
  ]);
  const total = count.rows[0].count as number;
  const pages = Math.max(1, Math.ceil(total / ORDER_PAGE_SIZE));
  const page = Math.min(pages, filters.page);
  const result = await pool.query<OrderSummary>(
    `SELECT id,number,name,email,phone,city,subtotal,shipping,currency,status,payment_status,created_at,jsonb_array_length(items) AS item_count FROM shop_orders ${where} ORDER BY created_at ${filters.sort === 'oldest' ? 'ASC' : 'DESC'},id ${filters.sort === 'oldest' ? 'ASC' : 'DESC'} LIMIT $5 OFFSET $6`,
    [...values, ORDER_PAGE_SIZE, (page - 1) * ORDER_PAGE_SIZE],
  );
  return {
    orders: result.rows,
    total,
    pages,
    page,
    summary: summary.rows[0] as {
      total: number;
      new: number;
      active: number;
      unpaid: number;
      completed: number;
    },
  };
}
