'use client';
import { startTransition, useActionState } from 'react';
import { Save, Truck, Wallet } from 'lucide-react';
import { updateOrder } from '@/app/admin/order-actions';
import { orderStatuses, paymentStatuses, orderLabels } from '@/lib/order-utils';
import type { Order } from '@/lib/shop-types';
export function OrderForm({ order: o }: { order: Order & { revision: string } }) {
  const [state, action, pending] = useActionState(updateOrder, {});
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => action(data));
      }}
      className="shop-form order-editor shop-order-controls"
    >
      <input type="hidden" name="id" value={o.id} />
      <input type="hidden" name="revision" value={o.revision} />
      <div className="order-editor-heading">
        <h2>Manage this order</h2>
        <p>Save fulfilment, payment and delivery updates together.</p>
      </div>
      <label>
        <span className="order-field-label">
          <Truck size={17} />
          Order status
        </span>
        <select name="status" defaultValue={o.status}>
          {orderStatuses.map((s) => (
            <option key={s} value={s} disabled={o.status === 'cancelled' && s !== 'cancelled'}>
              {orderLabels[s]}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="order-field-label">
          <Wallet size={17} />
          Payment status
        </span>
        <select name="payment_status" defaultValue={o.payment_status}>
          {paymentStatuses.map((s) => (
            <option key={s} value={s}>
              {orderLabels[s]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Tracking number / delivery reference
        <input
          name="tracking"
          maxLength={300}
          defaultValue={o.tracking}
          placeholder="Courier tracking or delivery reference"
        />
      </label>
      <label>
        Internal note
        <textarea
          name="admin_note"
          rows={4}
          maxLength={2000}
          defaultValue={o.admin_note}
          placeholder="Notes for you. Excluded from customer documents."
        />
      </label>
      <details className="order-help">
        <summary>Cancellation & payment information</summary>
        <p>
          Cancelling restores stock once and cannot be undone. Marking a payment as paid or refunded
          records your update; arrange payment or refunds separately.
        </p>
      </details>
      {state.error && (
        <p role="alert" className="shop-error">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="shop-success">
          Changes saved.
        </p>
      )}
      <button className="shop-button" disabled={pending}>
        <Save size={17} />
        {pending ? 'Saving…' : 'Update order'}
      </button>
    </form>
  );
}
