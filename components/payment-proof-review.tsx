'use client';
import { startTransition, useActionState } from 'react';
import { reviewPaymentProof } from '@/app/admin/order-actions';
import type { PaymentProof } from '@/lib/payment-proof-types';
export function PaymentProofReview({
  proof,
  canApprove,
}: {
  proof: PaymentProof;
  canApprove: boolean;
}) {
  const [state, action, pending] = useActionState(reviewPaymentProof, {});
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        if (submitter?.value) data.set('decision', submitter.value);
        startTransition(() => action(data));
      }}
      className="proof-review-form"
    >
      <input type="hidden" name="order_id" value={proof.order_id} />
      <input type="hidden" name="proof_id" value={proof.id} />
      <label>
        Review note for customer
        <textarea
          name="review_note"
          maxLength={500}
          rows={2}
          placeholder="Required when rejecting: explain what the customer should correct."
        />
      </label>
      <div>
        <button
          className="shop-button"
          name="decision"
          value="approve"
          disabled={pending || !canApprove}
        >
          Verify payment & mark paid
        </button>
        <button
          className="shop-button shop-secondary"
          name="decision"
          value="reject"
          disabled={pending}
        >
          Reject proof
        </button>
      </div>
      {state.error && (
        <p role="alert" className="shop-error">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="shop-success">
          Payment proof reviewed.
        </p>
      )}
      <p>
        The uploaded image is evidence to check against your bank or payment records. Approval
        records your verification; it does not process a payment.
      </p>
    </form>
  );
}
