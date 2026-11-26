import Link from 'next/link';
import {
  ClipboardList,
  PackageCheck,
  Wallet,
  Truck,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { getOrderList } from '@/lib/orders';
import {
  orderFilters,
  orderHref,
  orderLabels,
  paymentStatuses,
  ORDER_PAGE_SIZE,
} from '@/lib/order-utils';
import { money } from '@/lib/shop-types';
import { requestDate } from '@/lib/contact-requests';
export default async function Orders({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = orderFilters(await searchParams);
  const { orders, total, pages, page, summary } = await getOrderList(filters);
  const f = { ...filters, page };
  const stats = [
    ['New orders', summary.new, 'new', ClipboardList],
    ['In fulfilment', summary.active, 'active', Truck],
    ['Awaiting payment', summary.unpaid, 'unpaid', Wallet],
    ['Completed', summary.completed, 'completed', PackageCheck],
  ] as const;
  return (
    <>
      <header className="orders-heading">
        <div>
          <p className="shop-kicker">YOUR OPERATIONS DESK</p>
          <h1>Orders</h1>
          <p>From first order to final delivery. Everything you need, in one place.</p>
        </div>
        <Link className="shop-button shop-secondary" href="/admin/shop">
          Manage products
        </Link>
      </header>
      <div className="orders-stats">
        {stats.map(([label, value, status, Icon]) => (
          <Link
            href={
              status === 'unpaid' ? '/admin/orders?payment=due' : `/admin/orders?status=${status}`
            }
            key={label}
          >
            <span>
              <Icon size={20} />
              {label}
            </span>
            <strong>{value}</strong>
            <small>{status === 'active' ? 'Confirmed & shipped' : 'View orders'}</small>
          </Link>
        ))}
      </div>
      <section className="orders-panel">
        <div className="orders-panel-heading">
          <div>
            <h2>Order inbox</h2>
            <p>
              {summary.total} total orders · {total} matching your filters
            </p>
          </div>
          <span className="orders-live-label">
            {f.sort === 'oldest' ? 'Oldest orders appear first' : 'Newest orders appear first'}
          </span>
        </div>
        <nav className="orders-tabs" aria-label="Order status views">
          <Link
            href={orderHref(f, { status: '', page: 1 })}
            aria-current={!f.status ? 'page' : undefined}
          >
            All orders
          </Link>
          {['new', 'active', 'confirmed', 'shipped', 'completed', 'cancelled'].map((status) => (
            <Link
              key={status}
              href={orderHref(f, { status, page: 1 })}
              aria-current={f.status === status ? 'page' : undefined}
            >
              {orderLabels[status]}
            </Link>
          ))}
        </nav>
        <form className="orders-filters" role="search">
          <div className="orders-search">
            <Search size={18} />
            <input
              aria-label="Search orders"
              name="q"
              defaultValue={f.q}
              placeholder="Order reference, customer, email or phone"
              maxLength={150}
            />
          </div>
          <input type="hidden" name="status" value={f.status} />
          <select aria-label="Payment filter" name="payment" defaultValue={f.payment}>
            <option value="">All payments</option>
            <option value="due">Awaiting payment (active)</option>
            <option value="review">Payment proof to review</option>
            {paymentStatuses.map((s) => (
              <option key={s} value={s}>
                {orderLabels[s]}
              </option>
            ))}
          </select>
          <select aria-label="Order sort" name="sort" defaultValue={f.sort}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
          <button className="shop-button">
            <SlidersHorizontal size={16} />
            Apply
          </button>
          {(f.q || f.status || f.payment) && (
            <Link href="/admin/orders" className="orders-clear">
              Clear
            </Link>
          )}
        </form>
        <div className="orders-table-wrap">
          <table className="shop-table orders-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Fulfilment</th>
                <th>Payment</th>
                <th>Placed</th>
                <th>Manage</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td data-label="Order">
                    <Link href={`/admin/orders/${o.id}`}>DK-{o.number}</Link>
                    <small>
                      {o.item_count} {o.item_count === 1 ? 'item' : 'items'}
                    </small>
                  </td>
                  <td data-label="Customer">
                    <strong>{o.name}</strong>
                    <small>{o.email}</small>
                    <small>{o.city}</small>
                  </td>
                  <td data-label="Total">
                    <strong>{money(o.subtotal + o.shipping, o.currency)}</strong>
                  </td>
                  <td data-label="Fulfilment">
                    <span className={`order-badge order-${o.status}`}>{orderLabels[o.status]}</span>
                  </td>
                  <td data-label="Payment">
                    <span className={`order-badge order-${o.payment_status}`}>
                      {orderLabels[o.payment_status]}
                    </span>
                    {o.proof_pending &&
                      o.payment_status === 'unpaid' &&
                      o.status !== 'cancelled' && (
                        <small className="proof-inbox-label">Proof to review</small>
                      )}
                  </td>
                  <td data-label="Placed">
                    <time dateTime={new Date(o.created_at).toISOString()}>
                      {requestDate(o.created_at)}
                    </time>
                  </td>
                  <td data-label="Manage">
                    <Link
                      className="order-open"
                      href={`/admin/orders/${o.id}`}
                      aria-label={`Manage order DK-${o.number}`}
                    >
                      Open order
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!orders.length && (
          <div className="orders-empty">
            <ClipboardList size={40} />
            <h3>
              {f.q || f.status || f.payment ? 'No matching orders' : 'Ready for your first order'}
            </h3>
            <p>
              {f.q || f.status || f.payment
                ? 'Try a different search or clear your filters.'
                : 'Orders placed in your shop will appear here automatically.'}
            </p>
            <Link href={f.q || f.status || f.payment ? '/admin/orders' : '/shop'}>
              {f.q || f.status || f.payment ? 'Clear filters' : 'Visit your shop'}
            </Link>
          </div>
        )}
        <footer className="orders-pagination">
          <span>
            {total
              ? `${(page - 1) * ORDER_PAGE_SIZE + 1}–${Math.min(page * ORDER_PAGE_SIZE, total)} of ${total}`
              : '0 orders'}{' '}
            · Page {page} of {pages}
          </span>
          <div>
            {page > 1 && <Link href={orderHref(f, { page: page - 1 })}>Previous</Link>}
            {page < pages && <Link href={orderHref(f, { page: page + 1 })}>Next</Link>}
          </div>
        </footer>
      </section>
    </>
  );
}
