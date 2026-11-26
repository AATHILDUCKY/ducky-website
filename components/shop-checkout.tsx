'use client';
import { startTransition, useActionState, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle, Trash2 } from 'lucide-react';
import { useBag } from './shop-bag';
import { PaymentProofUploader } from './payment-proof-uploader';
import { placeOrder } from '@/app/shop-actions';
import { money, type Product, type ShopSettings } from '@/lib/shop-types';
export function ShopCheckout({
  products,
  settings: s,
}: {
  products: Product[];
  settings: ShopSettings;
}) {
  const bag = useBag();
  const [state, action, pending] = useActionState(placeOrder, {});
  const [submission, setSubmission] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [payment, setPayment] = useState<'manual' | 'cod'>('manual');
  useEffect(() => {
    setAccessToken(
      Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) =>
        n.toString(16).padStart(2, '0'),
      ).join(''),
    );
  }, []);
  useEffect(() => setSubmission(crypto.randomUUID()), []);
  useEffect(() => {
    if (state.success) bag.set([]);
  }, [state.success]); // Clear only after the database confirms the order.
  const rows = bag.items.map((i) => ({ ...i, product: products.find((p) => p.id === i.id) }));
  const invalid = rows.some((i) => !i.product || i.quantity > i.product.stock);
  const selectedPayment = s.cod_enabled ? payment : 'manual';
  const subtotal = rows.reduce((sum, i) => sum + (i.product?.price || 0) * i.quantity, 0);
  if (state.success && state.order)
    return (
      <div className="shop-confirmation">
        <CheckCircle size={54} />
        <p className="shop-kicker">ORDER RECEIVED</p>
        <h1>Thank you. You’re all set.</h1>
        <p>
          Your order reference is <strong>DK-{state.order.number}</strong>. Keep this reference for
          any questions about your order.
        </p>
        <p>
          Total: <strong>{money(state.order.total, state.order.currency)}</strong>
        </p>
        <p>
          {state.order.payment_method === 'cod'
            ? 'Payment is due on delivery.'
            : 'We will contact you to arrange payment.'}{' '}
          We’ll contact you using the details you provided to confirm your order and delivery.
        </p>
        <p>No payment has been collected online.</p>
        <Link className="shop-button" href={`/shop/orders/${state.order.id}`}>
          Manage payment & view your order
        </Link>
        {state.order.payment_method === 'manual' && (
          <>
            {s.payment_instructions && (
              <div className="shop-payment">
                <h2>Payment instructions</h2>
                <p className="shop-description">{s.payment_instructions}</p>
              </div>
            )}
            <PaymentProofUploader orderId={state.order.id} />
          </>
        )}
        <Link className="shop-button" href="/shop">
          Back to the shop
        </Link>
      </div>
    );
  if (!bag.ready) return <p role="status">Loading your bag…</p>;
  if (!rows.length)
    return (
      <div className="shop-empty">
        <h1>Your bag is waiting.</h1>
        <p>Find something you love and add it here.</p>
        <Link className="shop-button" href="/shop">
          Explore the collection
        </Link>
      </div>
    );
  return (
    <>
      <header className="shop-checkout-heading">
        <p className="shop-kicker">ONE LAST THING</p>
        <h1>Make it yours.</h1>
        <p>No account needed. Just your details and a final review.</p>
      </header>
      <div className="shop-checkout">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            startTransition(() => action(form));
          }}
          className="shop-form"
        >
          <h2>Your details</h2>
          <input type="hidden" name="submission_id" value={submission} />
          <input type="hidden" name="access_token" value={accessToken} />
          <input type="hidden" name="payment" value={selectedPayment} />
          <input type="hidden" name="currency" value={s.currency} />
          <input type="hidden" name="shipping" value={s.shipping} />
          <input
            type="hidden"
            name="items"
            value={JSON.stringify(
              rows.map((i) => ({ id: i.id, quantity: i.quantity, price: i.product?.price || 0 })),
            )}
          />
          <label>
            Full name
            <input required name="name" autoComplete="name" minLength={2} maxLength={100} />
          </label>
          <div className="shop-fields">
            <label>
              Email
              <input required type="email" name="email" autoComplete="email" maxLength={254} />
            </label>
            <label>
              Phone number
              <input
                required
                type="tel"
                name="phone"
                autoComplete="tel"
                minLength={7}
                maxLength={30}
              />
            </label>
          </div>
          <h2>Where should it go?</h2>
          <label>
            Street address
            <input
              required
              name="address"
              autoComplete="street-address"
              minLength={5}
              maxLength={500}
            />
          </label>
          <div className="shop-fields">
            <label>
              City
              <input
                required
                name="city"
                autoComplete="address-level2"
                minLength={2}
                maxLength={100}
              />
            </label>
            <label>
              Postal code
              <input
                required
                name="postal_code"
                autoComplete="postal-code"
                minLength={2}
                maxLength={20}
              />
            </label>
          </div>
          <label>
            Country
            <select name="country" autoComplete="country-name">
              <option>Sri Lanka</option>
            </select>
          </label>
          <label>
            Order notes <span>(optional)</span>
            <textarea
              name="notes"
              rows={3}
              maxLength={1000}
              placeholder="Anything we should know about your delivery?"
            />
          </label>
          <h2>Payment</h2>
          <div className="shop-payment">
            <strong>
              {selectedPayment === 'cod' ? 'Cash on delivery' : 'Payment arranged after ordering'}
            </strong>
            <p>
              {selectedPayment === 'cod'
                ? 'Pay when your order arrives. No payment proof is needed for COD.'
                : 'Pay using the shop’s instructions, then upload your receipt or payment screenshot for verification.'}
            </p>
            {s.cod_enabled && (
              <fieldset className="shop-payment-options">
                <legend>Choose your payment method</legend>
                <label>
                  <input
                    type="radio"
                    name="payment_choice"
                    checked={payment === 'manual'}
                    onChange={() => setPayment('manual')}
                  />
                  Arrange payment / upload proof
                </label>
                <label>
                  <input
                    type="radio"
                    name="payment_choice"
                    checked={payment === 'cod'}
                    onChange={() => setPayment('cod')}
                  />
                  Cash on delivery
                </label>
              </fieldset>
            )}
            {s.payment_instructions && selectedPayment === 'manual' && (
              <p className="shop-description">{s.payment_instructions}</p>
            )}
          </div>
          <label className="shop-consent">
            <input type="checkbox" name="consent" value="yes" required />
            <span>
              I have reviewed my items, total, delivery and return information. My details can be
              used to fulfil and contact me about this order.
            </span>
          </label>
          {state.error && (
            <p role="alert" className="shop-error">
              {state.error}
            </p>
          )}
          <button
            className="shop-button"
            disabled={pending || invalid || !submission || !accessToken}
          >
            {pending
              ? 'Placing your order…'
              : `Place order · ${money(subtotal + s.shipping, s.currency)}`}
          </button>
          <p className="shop-fine">
            Your order is saved when you see your order reference on the next screen.
          </p>
        </form>
        <aside className="shop-summary">
          <h2>
            Your bag <span>({rows.length})</span>
          </h2>
          {rows.map((i) => (
            <div className="shop-bag-row" key={i.id}>
              <div>
                <strong>{i.product?.name || 'Unavailable product'}</strong>
                <p>
                  {i.product ? money(i.product.price, s.currency) : 'Remove this item to continue'}
                </p>
                {i.product && i.quantity > i.product.stock && (
                  <p className="shop-error">Only {i.product.stock} available.</p>
                )}
                <label>
                  Quantity
                  <input
                    type="number"
                    aria-label={`Quantity for ${i.product?.name || 'unavailable item'}`}
                    min="1"
                    max={Math.min(99, i.product?.stock || 1)}
                    value={i.quantity}
                    onChange={(e) =>
                      bag.set(
                        bag.items.map((v) =>
                          v.id === i.id
                            ? {
                                ...v,
                                quantity: Math.max(1, Math.min(99, Number(e.target.value) || 1)),
                              }
                            : v,
                        ),
                      )
                    }
                  />
                </label>
              </div>
              <button
                type="button"
                aria-label={`Remove ${i.product?.name || 'item'}`}
                onClick={() => bag.set(bag.items.filter((v) => v.id !== i.id))}
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          <dl>
            <div>
              <dt>Subtotal</dt>
              <dd>{money(subtotal, s.currency)}</dd>
            </div>
            <div>
              <dt>Delivery</dt>
              <dd>{money(s.shipping, s.currency)}</dd>
            </div>
            <div className="shop-total">
              <dt>Total</dt>
              <dd>{money(subtotal + s.shipping, s.currency)}</dd>
            </div>
          </dl>
          {invalid && (
            <p className="shop-error" role="alert">
              Update unavailable quantities or remove items before ordering.
            </p>
          )}
          <p>{s.delivery}</p>
          <p>{s.returns}</p>
          <Link href="/shop">Continue shopping</Link>
        </aside>
      </div>
    </>
  );
}
