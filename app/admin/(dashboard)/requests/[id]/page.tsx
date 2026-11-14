import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { ArrowLeft, Mail } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { pool } from '@/lib/db';
import { requestDate } from '@/lib/contact-requests';
import { statusLabels } from '@/lib/contact-validation';
import { RequestEditor } from '@/components/request-editor';
export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const r = (
    await pool.query('SELECT *,updated_at::text AS revision FROM contact_requests WHERE id=$1', [
      id,
    ])
  ).rows[0];
  if (!r) notFound();
  return (
    <>
      <Link className="text-link request-back" href="/admin/requests">
        <ArrowLeft size={18} />
        All requests
      </Link>
      <div className="admin-heading">
        <div>
          <span className="eyebrow">CONTACT REQUEST</span>
          <h1>{r.subject}</h1>
          <p>Received {requestDate(r.created_at)} · Sri Lanka time</p>
        </div>
        <span className={`request-status request-${r.status}`}>
          {statusLabels[r.status as keyof typeof statusLabels]}
        </span>
      </div>
      <div className="request-detail-grid">
        <section className="admin-panel request-message">
          <div className="request-contact">
            <span className="request-avatar">
              <Mail size={24} />
            </span>
            <div>
              <h2>{r.name}</h2>
              <a href={`mailto:${r.email}`}>{r.email}</a>
            </div>
          </div>
          <div className="request-message-body">{r.message}</div>
          <a
            className="button button-dark"
            href={`mailto:${r.email}?subject=${encodeURIComponent('Re: ' + r.subject)}`}
          >
            <Mail size={17} />
            Reply by email
          </a>
          <small className="request-reply-help">
            Opens your email app. Update the request status after replying.
          </small>
        </section>
        <RequestEditor id={id} revision={r.revision} status={r.status} note={r.admin_note} />
      </div>
    </>
  );
}
