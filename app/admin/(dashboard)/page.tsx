import Link from 'next/link';
import { pool, getProfile } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { InboxRefresh } from '@/components/inbox-refresh';
import { FileText, Send, ArrowUpRight, Plus, ArrowRight, Check, Feather } from 'lucide-react';
import type { Post } from '@/lib/types';
export const metadata = { title: 'Overview' };
export default async function Dashboard() {
  await requireAdmin();
  const [profile, counts, recent] = await Promise.all([
    getProfile(),
    pool.query(
      "SELECT (SELECT count(*) FROM posts)::int AS posts,(SELECT count(*) FROM posts WHERE status='published')::int AS published,(SELECT count(*) FROM posts WHERE status='draft')::int AS drafts",
    ),
    pool.query(
      'SELECT id,title,status,category,updated_at FROM posts ORDER BY updated_at DESC LIMIT 5',
    ),
  ]);
  const c = counts.rows[0];
  const newRequests = (
    await pool.query("SELECT count(*)::int AS count FROM contact_requests WHERE status='new'")
  ).rows[0].count;
  return (
    <>
      <div className="admin-heading">
        <div>
          <span className="eyebrow">MAKE YOURSELF AT HOME</span>
          <h1>
            Hey, {profile.name.split(' ')[0]}
            <span className="accent">.</span> <span className="heading-spark">✳</span>
          </h1>
          <p>A fresh thought or field note. What will you share today?</p>
        </div>
        <div className="dashboard-heading-actions">
          <InboxRefresh />
          <Link className="button button-dark" href="/admin/posts/new">
            <Plus size={17} /> New post
          </Link>
        </div>
      </div>
      <Link className="homepage-quick-link" href="/admin/homepage">
        <span>
          <strong>Make your homepage yours.</strong>
          <small>Edit every section, adjust the layout, and preview before saving.</small>
        </span>
        <span>
          Edit homepage <ArrowUpRight size={17} />
        </span>
      </Link>
      <Link className="contact-inbox-shortcut" href="/admin/requests">
        <span>
          <strong>
            {newRequests} new contact {newRequests === 1 ? 'request' : 'requests'}
          </strong>
          <small>Read messages, track progress, and reply from your inbox.</small>
        </span>
        <span>
          Open inbox <ArrowRight size={18} />
        </span>
      </Link>
      <Link className="homepage-quick-link" href="/admin/socials">
        <span>
          <strong>Your profiles, one place.</strong>
          <small>Add Instagram, X, YouTube, GitHub, and LinkedIn to your homepage.</small>
        </span>
        <span>
          Manage social links <ArrowUpRight size={17} />
        </span>
      </Link>
      <div className="stats-grid">
        {[
          [FileText, 'Total posts', c.posts],
          [Send, 'Published', c.published],
          [Feather, 'Drafts', c.drafts],
        ].map(([Icon, label, value]) => {
          const I = Icon as typeof FileText;
          return (
            <div className="stat-card" key={label as string}>
              <div>
                <span>{label as string}</span>
                <I size={19} />
              </div>
              <strong>{value as number}</strong>
              <small>
                {label === 'Drafts'
                  ? 'Ideas taking shape'
                  : label === 'Published'
                    ? 'Out in the world'
                    : 'Your growing collection'}
              </small>
            </div>
          );
        })}
      </div>
      <div className="dashboard-columns">
        <section className="admin-panel">
          <div className="panel-heading">
            <div>
              <h2>Recent writing</h2>
              <p>Your latest ideas, all in one place.</p>
            </div>
            <Link className="text-link" href="/admin/posts">
              View all <ArrowRight size={15} />
            </Link>
          </div>
          <div className="recent-posts">
            {recent.rows.map((p: Post) => (
              <Link key={p.id} href={`/admin/posts/${p.id}`}>
                <span className="post-icon">
                  <FileText size={20} />
                </span>
                <div>
                  <h3>{p.title}</h3>
                  <span>
                    {new Date(p.updated_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      timeZone: 'Asia/Colombo',
                    })}{' '}
                    <span className="muted">·</span> {p.category}
                  </span>
                </div>
                <span className={`status-badge ${p.status}`}>{p.status}</span>
                <ArrowUpRight size={16} />
              </Link>
            ))}
            {!recent.rowCount && (
              <div className="empty-state">
                Your next idea belongs here.
                <Link className="text-link" href="/admin/posts/new">
                  Write your first post →
                </Link>
              </div>
            )}
          </div>
          <Link className="panel-bottom-link" href="/admin/posts/new">
            <Plus size={16} /> Make room for a new idea
          </Link>
        </section>
        <section className="seo-summary">
          <span className="eyebrow">GOOD TO BE FOUND</span>
          <h2>
            A little SEO.
            <br />A lot more reach.
          </h2>
          <p>Your content deserves to be discovered. The essentials are already in place.</p>
          <ul>
            {['Automatic XML sitemap', 'Article structured data', 'Social sharing previews'].map(
              (s) => (
                <li key={s}>
                  <Check size={15} />
                  {s}
                </li>
              ),
            )}
          </ul>
          <Link className="text-link" href="/admin/seo">
            Open SEO center <ArrowUpRight size={16} />
          </Link>
          <span className="seo-decoration" aria-hidden="true">
            ↗
          </span>
        </section>
      </div>
      <section className="studio-note">
        <span>✳</span>
        <div>
          <h3>Your ideas don’t have to be perfect to be worth sharing.</h3>
          <p>Start with a draft. Add a little curiosity. Make it yours.</p>
        </div>
        <Link className="text-link" href="/admin/posts/new">
          Start writing <ArrowRight size={16} />
        </Link>
      </section>
    </>
  );
}
