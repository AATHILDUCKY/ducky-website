import { money, type Order } from '@/lib/shop-types';
import type { DocumentKind } from '@/lib/order-utils';
import { documentModel, type DocumentSeller } from '@/lib/order-document-model';
export function OrderDocument({
  order: o,
  kind,
  seller,
}: {
  order: Order;
  kind: DocumentKind;
  seller: DocumentSeller;
}) {
  const d = documentModel(o, kind, seller);
  return (
    <article className={`shop-receipt order-document commerce-document document-${kind}`}>
      <header className="commerce-header">
        <div className="commerce-brand">
          <span className="commerce-monogram" aria-hidden="true">
            {d.initials}
          </span>
          <div>
            <strong>{d.storeName}</strong>
            {seller.name.trim().toLowerCase() !== d.storeName.trim().toLowerCase() && (
              <span>{seller.name}</span>
            )}
            {seller.location && <span>{seller.location}</span>}
            <span>{seller.email}</span>
          </div>
        </div>
        <div className="commerce-identity">
          <p className="commerce-eyebrow">{d.subtitle}</p>
          <h1>{d.title}</h1>
          <p className="commerce-reference">{d.reference}</p>
        </div>
      </header>
      <div className="commerce-meta">
        <div>
          <span>Order reference</span>
          <strong>{d.orderReference}</strong>
        </div>
        <div>
          <span>Order placed</span>
          <strong>{d.dateLabel}</strong>
          <small>{d.timeLabel} · Sri Lanka time</small>
        </div>
        <div>
          <span>Payment method</span>
          <strong>{d.method}</strong>
        </div>
        <div>
          <span>Currency</span>
          <strong>{o.currency}</strong>
        </div>
      </div>
      <section
        className={`commerce-summary ${o.payment_status === 'paid' && o.status !== 'cancelled' ? 'commerce-settled' : ''}`}
        aria-label="Document summary"
      >
        <div>
          <span className="commerce-eyebrow">{d.summaryLabel}</span>
          <strong>{d.summaryValue}</strong>
          <small>{d.summaryDetail}</small>
        </div>
        <div className="commerce-summary-status">
          <span className="commerce-status">{d.shipping ? d.fulfilment : d.status}</span>
          <p>{d.shipping ? 'Check quantities against the items below.' : d.paymentInstruction}</p>
        </div>
      </section>
      <div className={`commerce-parties ${d.shipping ? 'commerce-shipping-parties' : ''}`}>
        <section>
          <h2>
            {d.shipping
              ? 'Deliver to'
              : kind === 'invoice'
                ? 'Bill to / deliver to'
                : 'Customer / deliver to'}
          </h2>
          <strong>{o.name}</strong>
          <p className="commerce-address">
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
          <h2>{d.shipping ? 'Shipment details' : 'Order details'}</h2>
          <dl>
            <div>
              <dt>Fulfilment</dt>
              <dd>{d.fulfilment}</dd>
            </div>
            <div>
              <dt>Payment</dt>
              <dd>{d.payment}</dd>
            </div>
            <div>
              <dt>Tracking reference</dt>
              <dd>{o.tracking || 'Not assigned'}</dd>
            </div>
          </dl>
          {d.collect && (
            <p className="commerce-collect">
              Collect on delivery <strong>{d.collect}</strong>
            </p>
          )}
        </section>
      </div>
      <section className="commerce-items" aria-label={d.shipping ? 'Packing list' : 'Order items'}>
        <div className="commerce-section-heading">
          <h2>{d.shipping ? 'Packing list' : 'Order items'}</h2>
          <span>
            {d.units} {d.units === 1 ? 'unit' : 'units'} · {o.items.length} product{' '}
            {o.items.length === 1 ? 'line' : 'lines'}
          </span>
        </div>
        <div className="document-table-wrap">
          <table className="shop-table commerce-table">
            <thead>
              <tr>
                <th scope="col">{d.shipping ? 'Check' : '#'}</th>
                <th scope="col">Product / description</th>
                <th scope="col">Qty</th>
                {!d.shipping && (
                  <>
                    <th scope="col">Unit price</th>
                    <th scope="col">Amount</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {o.items.map((item, index) => (
                <tr key={item.id}>
                  <td>
                    {d.shipping ? (
                      <span className="commerce-pack-box" aria-label="Packing check: unmarked" />
                    ) : (
                      String(index + 1).padStart(2, '0')
                    )}
                  </td>
                  <td>
                    <strong>{item.name}</strong>
                    {item.slug && <small>Ref. {item.slug}</small>}
                  </td>
                  <td>{item.quantity}</td>
                  {!d.shipping && (
                    <>
                      <td>{money(item.price, o.currency)}</td>
                      <td>{money(item.quantity * item.price, o.currency)}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {d.shipping ? (
        <section className="commerce-handover">
          <h2>Package handover</h2>
          <p>Confirm the contents before handing over this order.</p>
          <div>
            <span>
              Packed by
              <strong aria-label="Packed by signature line" />
            </span>
            <span>
              Received by
              <strong aria-label="Received by signature line" />
            </span>
            <span>
              Date
              <strong aria-label="Handover date line" />
            </span>
          </div>
        </section>
      ) : (
        <div className="commerce-financial">
          <section className="commerce-payment-note">
            <h2>{kind === 'receipt' ? 'Payment acknowledgement' : 'Payment information'}</h2>
            <p>{d.note}</p>
            <p>{d.paymentInstruction}</p>
            <span>Please use {d.orderReference} as your order reference.</span>
          </section>
          <dl className="commerce-totals">
            <div>
              <dt>Subtotal</dt>
              <dd>{money(o.subtotal, o.currency)}</dd>
            </div>
            <div>
              <dt>Delivery</dt>
              <dd>{money(o.shipping, o.currency)}</dd>
            </div>
            <div className="commerce-order-total">
              <dt>Order total</dt>
              <dd>{money(d.total, o.currency)}</dd>
            </div>
            <div className="commerce-balance">
              <dt>Amount due</dt>
              <dd>{money(d.due, o.currency)}</dd>
            </div>
          </dl>
        </div>
      )}
      {o.notes && (
        <section className="commerce-note">
          <h2>{d.shipping ? 'Delivery instructions' : 'Customer note'}</h2>
          <p>{o.notes}</p>
        </section>
      )}
      <footer className="commerce-footer">
        <div>
          <strong>{d.shipping ? 'Packed with care.' : 'Thank you for your order.'}</strong>
          <p>{d.shipping ? d.note : 'For any questions, please quote ' + d.orderReference + '.'}</p>
        </div>
        <div>
          {seller.website && <span>{seller.website.replace(/^https?:\/\//, '')}</span>}
          <span>{seller.email}</span>
          <small>
            {d.reference} · {o.currency}
          </small>
        </div>
      </footer>
    </article>
  );
}
