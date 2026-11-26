import Link from 'next/link';
import { pool } from '@/lib/db';
import { money, type Order } from '@/lib/shop-types';
import { requestDate } from '@/lib/contact-requests';
export default async function Orders({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const status = ['new', 'confirmed', 'shipped', 'completed', 'cancelled'].includes(
    params.status || '',
  )
    ? params.status
    : '';
  const q = (params.q || '').slice(0, 150);
  const page = Math.max(1, Math.min(100000, Math.floor(Number(params.page)) || 1));
  const where =
    "WHERE ($1='' OR status=$1) AND ($2='' OR name ILIKE '%'||$2||'%' OR email ILIKE '%'||$2||'%' OR number::text=$2)";
  const [orders, count] = await Promise.all([
    pool.query<Order>(
      `SELECT * FROM shop_orders ${where} ORDER BY created_at DESC LIMIT 50 OFFSET $3`,
      [status, q, (page - 1) * 50],
    ),
    pool.query(`SELECT count(*)::int AS count FROM shop_orders ${where}`, [status, q]),
  ]);
  return (
    <>
      <Link href="/admin/shop">Shop management</Link>
      <div className="shop-admin-heading">
        <div>
          <p className="shop-kicker">ORDER MANAGEMENT</p>
          <h1>Every order. One place.</h1>
          <p>{count.rows[0].count} orders found</p>
        </div>
      </div>
      <form className="shop-filters">
        <input
          name="q"
          placeholder="Search name, email or order number"
          aria-label="Search orders"
          defaultValue={q}
        />
        <select name="status" defaultValue={status} aria-label="Filter by status">
          <option value="">All statuses</option>
          {['new', 'confirmed', 'shipped', 'completed', 'cancelled'].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <button className="shop-button">Filter</button>
      </form>
      <div className="shop-table-wrap">
        <table className="shop-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Placed</th>
            </tr>
          </thead>
          <tbody>
            {orders.rows.map((o) => (
              <tr key={o.id}>
                <td>
                  <Link href={`/admin/shop/orders/${o.id}`}>DK-{o.number}</Link>
                </td>
                <td>
                  {o.name}
                  <small>{o.email}</small>
                </td>
                <td>{money(o.subtotal + o.shipping, o.currency)}</td>
                <td>{o.status}</td>
                <td>{o.payment_status}</td>
                <td>{requestDate(o.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!orders.rows.length && <p className="shop-empty">No orders match these filters.</p>}
      </div>
      <div className="shop-admin-actions">
        {page > 1 && (
          <Link
            href={`?${new URLSearchParams({ status: status || '', q, page: String(page - 1) })}`}
          >
            Previous page
          </Link>
        )}
        {page * 50 < count.rows[0].count && (
          <Link
            href={`?${new URLSearchParams({ status: status || '', q, page: String(page + 1) })}`}
          >
            Next page
          </Link>
        )}
      </div>
    </>
  );
}
