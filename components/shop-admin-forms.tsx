'use client';
import { startTransition, useActionState, useState } from 'react';
import Link from 'next/link';
import { saveProduct, saveShopSettings, updateOrder } from '@/app/admin/shop-actions';
import { IMAGE_ACCEPT } from '@/lib/image-upload';
import type { Product, Order, ShopSettings, ShopState } from '@/lib/shop-types';
function Feedback({ state }: { state: ShopState }) {
  return (
    <>
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
    </>
  );
}
export function ProductForm({ product: p }: { product?: Product }) {
  const [state, action, pending] = useActionState(saveProduct, {});
  const [images, setImages] = useState<string[]>(p?.images || []);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [slug, setSlug] = useState(p?.slug || '');
  async function upload(file: File) {
    setUploading(true);
    setError('');
    try {
      const data = new FormData();
      data.set('file', file);
      data.set('alt', file.name);
      const res = await fetch('/api/upload', { method: 'POST', body: data });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setImages((v) => [...v, json.id].slice(0, 6));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        startTransition(() => action(form));
      }}
      className="shop-form"
    >
      <input type="hidden" name="id" value={p?.id || ''} />
      {p && <input type="hidden" name="revision" value={p.revision} />}
      <input type="hidden" name="images" value={JSON.stringify(images)} />
      <div className="shop-admin-actions">
        <Link href="/admin/shop">Back to shop management</Link>
        <button className="shop-button" disabled={pending || uploading}>
          {pending ? 'Saving…' : 'Save product'}
        </button>
      </div>
      <Feedback state={state} />
      {state.success && !p && <Link href="/admin/shop">Product created. Return to products</Link>}
      <div className="shop-fields">
        <label>
          Product name
          <input
            name="name"
            required
            defaultValue={p?.name}
            maxLength={160}
            onChange={(e) => {
              if (!p)
                setSlug(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, ''),
                );
            }}
          />
        </label>
        <label>
          URL slug
          <input
            name="slug"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            maxLength={160}
          />
        </label>
      </div>
      <label>
        Description & specifications
        <textarea
          name="description"
          required
          minLength={10}
          maxLength={12000}
          defaultValue={p?.description}
          rows={8}
        />
      </label>
      <div className="shop-fields">
        <label>
          Price (shop currency)
          <input
            name="price"
            type="number"
            min="0.01"
            max="1000000"
            step="0.01"
            required
            defaultValue={p ? p.price / 100 : undefined}
          />
        </label>
        <label>
          Available stock
          <input
            name="stock"
            type="number"
            min="0"
            max="100000"
            step="1"
            required
            defaultValue={p?.stock || 0}
          />
        </label>
        <label>
          Category
          <input
            name="category"
            maxLength={60}
            required
            defaultValue={p?.category || 'Collection'}
          />
        </label>
        <label>
          Visibility
          <select name="status" defaultValue={p?.status || 'draft'}>
            <option value="draft">Draft · hidden</option>
            <option value="published">Published · visible in shop</option>
          </select>
        </label>
      </div>
      <h2>Product photos</h2>
      <p>
        The first image is the cover. Upload up to 6 photos; images are automatically optimized.
      </p>
      <div className="shop-admin-images">
        {images.map((id, i) => (
          <div key={id}>
            <img src={`/media/${id}`} alt={`Product photo ${i + 1}`} />
            <button type="button" onClick={() => setImages(images.filter((v) => v !== id))}>
              Remove photo {i + 1}
            </button>
            {i > 0 && (
              <button
                type="button"
                onClick={() => setImages([id, ...images.filter((v) => v !== id)])}
              >
                Use as cover
              </button>
            )}
          </div>
        ))}
      </div>
      <label>
        Upload photo
        <input
          type="file"
          accept={IMAGE_ACCEPT}
          disabled={uploading || images.length >= 6}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = '';
          }}
        />
      </label>
      {uploading && <p role="status">Optimizing photo…</p>}
      {error && <p role="alert">{error}</p>}
      <h2>Search appearance</h2>
      <p>
        Leave these blank to use the product name and description. Published products appear in the
        product sitemap automatically.
      </p>
      <label>
        SEO title
        <input name="seo_title" maxLength={100} defaultValue={p?.seo_title} />
      </label>
      <label>
        SEO description
        <textarea
          name="seo_description"
          maxLength={170}
          rows={3}
          defaultValue={p?.seo_description}
        />
      </label>
      <button className="shop-button" disabled={pending || uploading}>
        {pending ? 'Saving…' : 'Save product'}
      </button>
    </form>
  );
}
export function ShopSettingsForm({ settings: s }: { settings: ShopSettings }) {
  const [state, action, pending] = useActionState(saveShopSettings, {});
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        startTransition(() => action(form));
      }}
      className="shop-form"
    >
      <h2>Shop settings</h2>
      <p>
        Currency changes apply to the numeric prices of all products. Review product prices before
        changing currency. Existing orders keep their original currency and totals.
      </p>
      <div className="shop-fields">
        <label>
          Currency
          <select name="currency" defaultValue={s.currency}>
            {['LKR', 'USD', 'EUR', 'GBP', 'INR'].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Delivery fee per order
          <input
            required
            name="shipping"
            type="number"
            min="0"
            max="1000000"
            step="0.01"
            defaultValue={s.shipping / 100}
          />
        </label>
        <label>
          Payment method
          <select name="payment" defaultValue={s.payment}>
            <option value="cod">Cash on delivery</option>
            <option value="manual">Arrange payment after ordering</option>
          </select>
        </label>
      </div>
      <label>
        Delivery information
        <textarea
          name="delivery"
          required
          minLength={5}
          maxLength={1000}
          defaultValue={s.delivery}
        />
      </label>
      <label>
        Returns information
        <textarea name="returns" required minLength={5} maxLength={1000} defaultValue={s.returns} />
      </label>
      <Feedback state={state} />
      <button className="shop-button" disabled={pending}>
        Save settings
      </button>
    </form>
  );
}
export function OrderForm({ order: o }: { order: Order }) {
  const [state, action, pending] = useActionState(updateOrder, {});
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        startTransition(() => action(form));
      }}
      className="shop-form shop-order-controls"
    >
      <input type="hidden" name="id" value={o.id} />
      <div className="shop-fields">
        <label>
          Order status
          <select name="status" defaultValue={o.status}>
            {['new', 'confirmed', 'shipped', 'completed', 'cancelled'].map((s) => (
              <option key={s} disabled={o.status === 'cancelled' && s !== 'cancelled'}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          Payment status
          <select name="payment_status" defaultValue={o.payment_status}>
            {['unpaid', 'paid', 'refunded'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Tracking number / delivery reference
        <input name="tracking" maxLength={300} defaultValue={o.tracking} />
      </label>
      <label>
        Internal note
        <textarea name="admin_note" maxLength={2000} defaultValue={o.admin_note} />
      </label>
      <p>
        Cancelling restores stock once. Cancelled orders cannot be reopened. Refunds must be
        arranged separately; changing payment status records the result.
      </p>
      <Feedback state={state} />
      <button className="shop-button" disabled={pending}>
        {pending ? 'Saving…' : 'Update order'}
      </button>
    </form>
  );
}
export function PrintReceipt() {
  return (
    <button className="shop-button shop-print-button" onClick={() => window.print()}>
      Print receipt / Save PDF
    </button>
  );
}
