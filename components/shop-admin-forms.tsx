'use client';
import { startTransition, useActionState, useState } from 'react';
import Link from 'next/link';
import { saveProduct, saveShopSettings } from '@/app/admin/shop-actions';
import { IMAGE_ACCEPT } from '@/lib/image-upload';
import type { Product, ShopSettings, ShopState } from '@/lib/shop-types';
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
  async function upload(files: File[]) {
    if (files.length > 6 - images.length) {
      setError(
        `You can add ${6 - images.length} more photos. Each product supports up to 6 photos.`,
      );
      return;
    }
    setUploading(true);
    setError('');
    try {
      // Process sequentially: the image optimizer accepts one upload at a time.
      for (const file of files) {
        const data = new FormData();
        data.set('file', file);
        data.set('alt', file.name);
        const res = await fetch('/api/upload', { method: 'POST', body: data });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setImages((v) => [...v, json.id]);
      }
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
        Select up to 6 photos at once. Choose “Use as cover” to set the main image shown first on
        the product page and in the shop. Images are automatically optimized.
      </p>
      <div className="shop-admin-images">
        {images.map((id, i) => (
          <div key={id}>
            <img src={`/media/${id}`} alt={`Product photo ${i + 1}`} />
            {i === 0 && <span className="shop-main-image-label">Main image</span>}
            <button
              type="button"
              disabled={uploading || pending}
              onClick={() => setImages(images.filter((v) => v !== id))}
            >
              Remove photo {i + 1}
            </button>
            {i > 0 && (
              <button
                type="button"
                disabled={uploading || pending}
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
          multiple
          disabled={uploading || pending || images.length >= 6}
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            if (files.length) void upload(files);
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
