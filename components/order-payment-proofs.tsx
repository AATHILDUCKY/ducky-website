import { getPaymentProofs } from '@/lib/payment-proofs';
import { orderDate } from '@/lib/order-utils';
import { PaymentProofReview } from './payment-proof-review';
export async function OrderPaymentProofs({
  orderId,
  canApprove,
}: {
  orderId: string;
  canApprove: boolean;
}) {
  const proofs = await getPaymentProofs(orderId);
  return (
    <section className="order-payment-proofs shop-order-controls">
      <div className="orders-preview-heading">
        <h2>Payment proofs</h2>
        <span>{proofs.filter((p) => p.status === 'pending').length} awaiting review</span>
      </div>
      {!proofs.length ? (
        <div className="proof-empty">
          <p>No customer payment proof has been uploaded for this order.</p>
        </div>
      ) : (
        proofs.map((proof) => (
          <article key={proof.id} className="admin-payment-proof">
            <header>
              <div>
                <strong>{proof.filename}</strong>
                <p>{orderDate(proof.created_at)}</p>
              </div>
              <span className={`payment-proof-status proof-${proof.status}`}>
                {proof.status === 'pending'
                  ? 'Awaiting verification'
                  : proof.status === 'approved'
                    ? 'Verified'
                    : 'Rejected'}
              </span>
            </header>
            {proof.mime === 'image/webp' && (
              <a href={`/api/shop/payment-proofs/${proof.id}`} target="_blank" rel="noreferrer">
                <img
                  src={`/api/shop/payment-proofs/${proof.id}`}
                  alt="Customer-submitted payment proof"
                  loading="lazy"
                />
              </a>
            )}
            <a
              className="proof-download"
              href={`/api/shop/payment-proofs/${proof.id}?download`}
              download
            >
              Download {proof.mime === 'application/pdf' ? 'PDF receipt' : 'payment image'}
            </a>
            {proof.status === 'pending' ? (
              <PaymentProofReview proof={proof} canApprove={canApprove} />
            ) : (
              <div className="proof-review-result">
                <p>{proof.review_note || 'Review recorded.'}</p>
                {proof.reviewed_at && <small>Reviewed {orderDate(proof.reviewed_at)}</small>}
              </div>
            )}
          </article>
        ))
      )}
    </section>
  );
}
