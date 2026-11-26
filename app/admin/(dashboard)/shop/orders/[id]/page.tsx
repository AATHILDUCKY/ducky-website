import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { pool, getProfile } from '@/lib/db';
import { money, type Order } from '@/lib/shop-types';
import { requestDate } from '@/lib/contact-requests';
import { OrderForm, PrintReceipt } from '@/components/shop-admin-forms';
export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [result, profile] = await Promise.all([
    pool.query<Order>('SELECT * FROM shop_orders WHERE id=$1', [id]),
    getProfile(),
  ]);
  const o = result.rows[0];
  if (!o) notFound();
  return (
    <>
      <div className="shop-admin-actions shop-order-controls">
        <Link href="/admin/shop/orders">All orders</Link>
        <PrintReceipt />
      </div>
      <article className="shop-receipt">
        <header>
          <p className="shop-kicker">{profile.name} · SHOP</p>
          <h1>Order receipt</h1>
          <h2>DK-{o.number}</h2>
          <p>{requestDate(o.created_at)}</p>
          <p>{profile.email}</p>
        </header>
        <div className="shop-fields">
          <section>
            <h3>Customer & delivery</h3>
            <p>
              {o.name}
              <br />
              {o.email}
              <br />
              {o.phone}
            </p>
            <p className="shop-description">
              {o.address}
              <br />
              {o.city} {o.postal_code}
              <br />
              {o.country}
            </p>
          </section>
          <section>
            <h3>Order information</h3>
            <p>
              Status: {o.status}
              <br />
              Payment: {o.payment_status}
              <br />
              Method: {o.payment_method === 'cod' ? 'Cash on delivery' : 'Arranged payment'}
            </p>
            {o.tracking && <p>Tracking: {o.tracking}</p>}
            <p>Currency: {o.currency}</p>
          </section>
        </div>
        <table className="shop-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Unit price</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {o.items.map((i) => (
              <tr key={i.id}>
                <td>{i.name}</td>
                <td>{i.quantity}</td>
                <td>{money(i.price, o.currency)}</td>
                <td>{money(i.price * i.quantity, o.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="shop-receipt-totals">
          <div>
            <dt>Subtotal</dt>
            <dd>{money(o.subtotal, o.currency)}</dd>
          </div>
          <div>
            <dt>Delivery</dt>
            <dd>{money(o.shipping, o.currency)}</dd>
          </div>
          <div className="shop-total">
            <dt>Total</dt>
            <dd>{money(o.subtotal + o.shipping, o.currency)}</dd>
          </div>
        </dl>
        {o.notes && (
          <section>
            <h3>Customer note</h3>
            <p className="shop-description">{o.notes}</p>
          </section>
        )}
        <p className="shop-fine">
          {o.payment_status === 'paid'
            ? 'Payment recorded as received.'
            : o.payment_status === 'refunded'
              ? 'Payment recorded as refunded.'
              : 'This receipt acknowledges the order. Payment has not been recorded as received.'}
        </p>
      </article>
      <OrderForm order={o} />
    </>
  );
}
