import { money, type Order } from '@/lib/shop-types';
import { documentTitles, paymentNote, type DocumentKind } from '@/lib/order-utils';
import { orderDate } from '@/lib/order-utils';
export function OrderDocument({
  order: o,
  kind,
  seller,
}: {
  order: Order;
  kind: DocumentKind;
  seller: { name: string; email: string };
}) {
  const shipping = kind === 'shipping';
  return (
    <article className="shop-receipt order-document">
      <header className="document-header">
        <div>
          <p className="shop-kicker">{seller.name} · SHOP</p>
          <h1>{documentTitles[kind]}</h1>
          <p>{seller.email}</p>
        </div>
        <div>
          <h2>
            {kind === 'invoice' ? 'INV' : kind === 'shipping' ? 'SHP' : 'REC'}-{o.number}
          </h2>
          <p>
            Order DK-{o.number}
            <br />
            {orderDate(o.created_at)}
          </p>
          <span className={`order-badge order-${o.status}`}>{o.status}</span>
        </div>
      </header>
      <div className="shop-fields document-addresses">
        <section>
          <p className="document-label">{shipping ? 'DELIVER TO' : 'CUSTOMER / BILL TO'}</p>
          <h3>{o.name}</h3>
          <p className="shop-description">
            {o.address}
            <br />
            {o.city} {o.postal_code}
            <br />
            {o.country}
          </p>
          <p>
            {o.email}
            <br />
            {o.phone}
          </p>
        </section>
        <section>
          <p className="document-label">{shipping ? 'DISPATCH DETAILS' : 'PAYMENT DETAILS'}</p>
          <p>
            Payment: {o.payment_status}
            <br />
            Method: {o.payment_method === 'cod' ? 'Cash on delivery' : 'Arranged payment'}
            <br />
            Currency: {o.currency}
          </p>
          {o.tracking && (
            <p>
              Tracking / delivery reference:
              <br />
              <strong>{o.tracking}</strong>
            </p>
          )}
          {shipping && <p>Dispatch document for the items below.</p>}
        </section>
      </div>
      <div className="document-table-wrap">
        <table className="shop-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              {!shipping && (
                <>
                  <th>Unit price</th>
                  <th>Amount</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {o.items.map((i) => (
              <tr key={i.id}>
                <td>{i.name}</td>
                <td>{i.quantity}</td>
                {!shipping && (
                  <>
                    <td>{money(i.price, o.currency)}</td>
                    <td>{money(i.price * i.quantity, o.currency)}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!shipping ? (
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
          <div>
            <dt>
              {o.payment_status === 'paid'
                ? 'Amount due'
                : o.status === 'cancelled'
                  ? 'Cancelled order'
                  : 'Amount due'}
            </dt>
            <dd>
              {money(
                o.payment_status === 'unpaid' && o.status !== 'cancelled'
                  ? o.subtotal + o.shipping
                  : 0,
                o.currency,
              )}
            </dd>
          </div>
        </dl>
      ) : (
        <div className="shipping-handover">
          <p>
            <strong>{o.items.reduce((sum, i) => sum + i.quantity, 0)} total units</strong> ·{' '}
            {o.items.length} product lines
          </p>
          {o.payment_method === 'cod' &&
            o.payment_status === 'unpaid' &&
            o.status !== 'cancelled' && (
              <p>
                Collect on delivery: <strong>{money(o.subtotal + o.shipping, o.currency)}</strong>
              </p>
            )}
          <div>
            <span>Packed by: __________________</span>
            <span>Received by: __________________</span>
          </div>
        </div>
      )}
      {o.notes && (
        <section className="document-notes">
          <h3>{shipping ? 'Delivery note' : 'Customer note'}</h3>
          <p className="shop-description">{o.notes}</p>
        </section>
      )}
      <footer className="document-footer">
        <p>
          {o.status === 'cancelled' ? 'This order is cancelled. ' : ''}
          {paymentNote(o.payment_status)}
        </p>
        <p>
          {shipping
            ? 'Shipping and packing document.'
            : 'Please quote your order reference when contacting us.'}
        </p>
      </footer>
    </article>
  );
}
