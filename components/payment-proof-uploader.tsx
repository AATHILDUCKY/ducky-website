'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, CheckCircle, FileCheck } from 'lucide-react';
import { MAX_PROOF_BYTES, PROOF_ACCEPT } from '@/lib/payment-proof-types';
export function PaymentProofUploader({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [filename, setFilename] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const retry = useRef<{ file: File; id: string } | null>(null);
  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = input.current?.files?.[0];
    if (!file) {
      setError('Choose your payment receipt or transfer screenshot.');
      return;
    }
    if (file.size > MAX_PROOF_BYTES) {
      setError('Choose a file smaller than 5 MB.');
      return;
    }
    setBusy(true);
    setError('');
    setSuccess(false);
    const id = retry.current?.file === file ? retry.current.id : crypto.randomUUID();
    retry.current = { file, id };
    const form = new FormData();
    form.set('file', file);
    form.set('upload_id', id);
    try {
      const response = await fetch(`/api/shop/orders/${orderId}/proof`, {
        method: 'POST',
        body: form,
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Upload failed.');
      setSuccess(true);
      retry.current = null;
      if (input.current) input.current.value = '';
      setFilename('');
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="payment-proof-upload">
      <div className="payment-proof-title">
        <FileCheck size={24} />
        <div>
          <h2>Upload payment proof</h2>
          <p>Send your bank receipt, payment invoice or transfer screenshot for review.</p>
        </div>
      </div>
      <form onSubmit={upload}>
        <label className="payment-file-picker">
          <Upload size={25} />
          <strong>{filename || 'Choose a receipt or payment image'}</strong>
          <span>PDF, JPEG, PNG, WebP or HEIC · up to 5 MB</span>
          <input
            ref={input}
            type="file"
            accept={PROOF_ACCEPT}
            aria-label="Payment proof file"
            disabled={busy}
            onChange={(event) => {
              setFilename(event.target.files?.[0]?.name || '');
              setSuccess(false);
              setError('');
            }}
          />
        </label>
        <button className="shop-button" disabled={busy || !filename}>
          {busy ? 'Uploading securely…' : 'Submit payment proof'}
        </button>
        {error && (
          <p role="alert" className="shop-error">
            {error}
          </p>
        )}
        {success && (
          <p role="status" className="payment-proof-success">
            <CheckCircle size={18} />
            Payment proof submitted. Awaiting verification.
          </p>
        )}
        <p className="shop-fine">
          Only you and the shop administrator can access this file. Your order is marked paid after
          the administrator verifies the payment.
        </p>
      </form>
    </section>
  );
}
