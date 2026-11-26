import Link from 'next/link';
import { notFound } from 'next/navigation';
import { customerOrder } from '@/lib/customer-orders';
import { getPaymentProofs } from '@/lib/payment-proofs';
import { getShopSettings } from '@/lib/shop';
import { money } from '@/lib/shop-types';
import { orderLabels, orderDate } from '@/lib/order-utils';
import { MAX_ORDER_PROOFS } from '@/lib/payment-proof-types';
import { PaymentProofUploader } from '@/components/payment-proof-uploader';
export const metadata = { title: 'Your order', robots: { index: false, follow: false } };
export default async function CustomerOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await customerOrder(id);
  if (!order) notFound();
  const [proofs, settings] = await Promise.all([getPaymentProofs(id), getShopSettings()]);
  const canUpload =
    order.payment_method === 'manual' &&
    order.payment_status === 'unpaid' &&
    order.status !== 'cancelled' &&
    proofs.length < MAX_ORDER_PROOFS;
  return (
    <div className="customer-order">
      <p className="shop-kicker">YOUR ORDER</p>
      <h1>DK-{order.number}</h1>
      <p>Keep this page bookmarked. You can return in this browser to submit your payment proof.</p>
      <div className="customer-order-summary">
        <div>
          <span>Order total</span>
          <strong>{money(order.subtotal + order.shipping, order.currency)}</strong>
        </div>
        <div>
          <span>Order status</span>
          <strong>{orderLabels[order.status]}</strong>
        </div>
        <div>
          <span>Payment</span>
          <strong>{orderLabels[order.payment_status]}</strong>
        </div>
      </div>
      {order.payment_method === 'manual' && settings.payment_instructions && (
        <section className="shop-payment">
          <h2>Payment instructions</h2>
          <p className="shop-description">{settings.payment_instructions}</p>
        </section>
      )}
      {order.payment_method === 'cod' && <p>Cash on delivery was selected for this order.</p>}
      {order.status === 'cancelled' && (
        <p>This order is cancelled. It is not accepting payment proof.</p>
      )}
      {order.payment_status === 'paid' && (
        <p className="payment-proof-success">Your payment has been recorded as paid.</p>
      )}
      {canUpload && <PaymentProofUploader orderId={id} />}
      <section className="customer-proofs">
        <h2>Your submitted proofs</h2>
        {!proofs.length ? (
          <p>No payment proof submitted yet.</p>
        ) : (
          proofs.map((proof) => (
            <article key={proof.id}>
              <div>
                <strong>{proof.filename}</strong>
                <p>{orderDate(proof.created_at)}</p>
                <span className={`payment-proof-status proof-${proof.status}`}>
                  {proof.status === 'pending'
                    ? 'Awaiting verification'
                    : proof.status === 'approved'
                      ? 'Verified'
                      : 'Not accepted'}
                </span>
                {proof.review_note && <p>{proof.review_note}</p>}
              </div>
              <a href={`/api/shop/payment-proofs/${proof.id}?download`} download>
                Download your proof
              </a>
            </article>
          ))
        )}
        {proofs.length >= MAX_ORDER_PROOFS && (
          <p>You have reached the upload limit. Contact the shop if you need help.</p>
        )}
      </section>
      <p className="shop-fine">
        Private order access lasts 30 days in the browser you used at checkout. If you use another
        device or clear cookies, contact the shop for help.
      </p>
      <Link href="/shop">Continue shopping</Link>
    </div>
  );
}
