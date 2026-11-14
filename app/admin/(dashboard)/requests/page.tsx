import Link from 'next/link';
import { Mail, ArrowUpRight, Search } from 'lucide-react';
import { pool } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { requestStatuses, statusLabels } from '@/lib/contact-validation';
import { requestDate } from '@/lib/contact-requests';
import { InboxRefresh } from '@/components/inbox-refresh';
export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q.trim().slice(0, 120) : '';
  const status = requestStatuses.includes(params.status as (typeof requestStatuses)[number])
    ? String(params.status)
    : '';
  const pageValue = typeof params.page === 'string' ? Number(params.page) : 1;
  const requestedPage =
    Number.isSafeInteger(pageValue) && pageValue > 0 ? Math.min(pageValue, 100000) : 1;
  const where =
    "WHERE ($1='' OR status=$1) AND ($2='' OR strpos(lower(concat_ws(' ',name,email,subject,message)),lower($2))>0)";
  const [countResult, summary] = await Promise.all([
    pool.query(`SELECT count(*)::int AS count FROM contact_requests ${where}`, [status, q]),
    pool.query('SELECT status,count(*)::int AS count FROM contact_requests GROUP BY status'),
  ]);
  const total = countResult.rows[0].count;
  const pages = Math.max(1, Math.ceil(total / 25));
  const page = Math.min(requestedPage, pages);
  const result = await pool.query(
    `SELECT id,name,email,subject,left(message,200) AS preview,status,created_at FROM contact_requests ${where} ORDER BY created_at DESC,id DESC LIMIT 25 OFFSET $3`,
    [status, q, (page - 1) * 25],
  );
  const counts = Object.fromEntries(summary.rows.map((r) => [r.status, r.count]));
  const href = (s: string, p = 1) =>
    '/admin/requests?' +
    new URLSearchParams({
      ...(q ? { q } : {}),
      ...(s ? { status: s } : {}),
      ...(p > 1 ? { page: String(p) } : {}),
    }).toString();
  return (
    <>
      <div className="admin-heading">
        <div>
          <span className="eyebrow">YOUR CONVERSATIONS</span>
          <h1>
            Contact requests<span className="accent">.</span>
          </h1>
          <p>Messages from your website, ready for your next step.</p>
        </div>
        <InboxRefresh />
      </div>
      <div className="request-summary" aria-label="Request totals">
        {requestStatuses.map((s) => (
          <Link key={s} href={href(s)} className={`request-summary-card request-${s}`}>
            <span>{statusLabels[s]}</span>
            <strong>{counts[s] || 0}</strong>
          </Link>
        ))}
      </div>
      <section className="admin-panel request-inbox">
        <div className="request-toolbar">
          <nav aria-label="Filter requests">
            <Link href={href('')} aria-current={!status ? 'page' : undefined}>
              All
            </Link>
            {requestStatuses.map((s) => (
              <Link href={href(s)} key={s} aria-current={status === s ? 'page' : undefined}>
                {statusLabels[s]}
              </Link>
            ))}
          </nav>
          <form action="/admin/requests" className="request-search">
            <input type="hidden" name="status" value={status} />
            <label className="sr-only" htmlFor="request-search">
              Search requests
            </label>
            <input
              id="request-search"
              type="search"
              name="q"
              defaultValue={q}
              maxLength={120}
              placeholder="Search name, email, or message"
            />
            <button className="icon-button" aria-label="Search requests">
              <Search size={20} />
            </button>
            {q && (
              <Link href={href(status).split('?')[0] + (status ? '?status=' + status : '')}>
                Clear
              </Link>
            )}
          </form>
        </div>
        <div className="request-list">
          {result.rows.map((r) => (
            <Link
              className={`request-row ${r.status === 'new' ? 'is-new' : ''}`}
              key={r.id}
              href={`/admin/requests/${r.id}`}
            >
              <span className="request-avatar">
                <Mail size={21} />
              </span>
              <div className="request-row-content">
                <div className="request-row-title">
                  <h2>{r.subject}</h2>
                  <span className={`request-status request-${r.status}`}>
                    {statusLabels[r.status as keyof typeof statusLabels]}
                  </span>
                </div>
                <p className="request-sender">
                  {r.name} <span>· {r.email}</span>
                </p>
                <p className="request-preview">{r.preview}</p>
                <time dateTime={new Date(r.created_at).toISOString()}>
                  {requestDate(r.created_at)}
                </time>
              </div>
              <ArrowUpRight size={19} />
            </Link>
          ))}
        </div>
        {!result.rowCount && (
          <div className="request-empty">
            <Mail size={32} />
            <h2>{q || status ? 'No matching requests' : 'Your inbox is ready'}</h2>
            <p>
              {q || status
                ? 'Try another search or view all requests.'
                : 'Messages sent through your contact form will appear here.'}
            </p>
            <Link className="text-link" href={q || status ? '/admin/requests' : '/contact'}>
              {q || status ? 'View all requests' : 'View contact form'} →
            </Link>
          </div>
        )}
        <div className="request-pagination">
          <span>
            {total} {total === 1 ? 'request' : 'requests'} · Page {page} of {pages}
          </span>
          <div>
            {page > 1 && (
              <Link className="button" href={href(status, page - 1)}>
                Previous
              </Link>
            )}
            {page < pages && (
              <Link className="button" href={href(status, page + 1)}>
                Next
              </Link>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
