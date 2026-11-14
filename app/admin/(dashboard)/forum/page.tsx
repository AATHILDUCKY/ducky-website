import Link from 'next/link';
import { forumPostPath } from '@/lib/forum-slugs.mjs';
import { Plus, ArrowUpRight, MessageCircle } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { pool } from '@/lib/db';
export const metadata = { title: 'Manage forum' };
export default async function AdminForum({
  searchParams,
}: {
  searchParams: Promise<{ before?: string }>;
}) {
  await requireAdmin();
  const before = (await searchParams).before || '';
  const valid = /^\d{1,18}$/.test(before) ? before : null;
  const rows = (
    await pool.query(
      `SELECT p.id,p.slug,p.title,p.status,p.sitemap_id::text AS cursor,p.created_at,
    (SELECT count(*)::int FROM forum_replies r WHERE r.post_id=p.id AND NOT r.hidden) AS replies
    FROM forum_posts p ${valid ? 'WHERE p.sitemap_id<$1::bigint' : ''} ORDER BY p.sitemap_id DESC LIMIT 26`,
      valid ? [valid] : [],
    )
  ).rows;
  const posts = rows.slice(0, 25);
  return (
    <>
      <div className="admin-heading">
        <div>
          <span className="eyebrow">THOUGHTS, FINDS & CONVERSATIONS</span>
          <h1>
            Your forum<span className="accent">.</span>
          </h1>
          <p>Publish a discovery, edit a post, or open its conversation to moderate replies.</p>
        </div>
        <Link className="button button-dark" href="/forum/new">
          <Plus size={17} /> New post
        </Link>
      </div>
      <section className="admin-panel">
        <div className="panel-heading">
          <h2>Posts & conversations</h2>
          <Link className="text-link" href="/forum">
            View forum <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="recent-posts">
          {posts.map((post) => (
            <Link href={forumPostPath(post)} key={post.id}>
              <span className="post-icon">
                <MessageCircle size={20} />
              </span>
              <div>
                <h3>{post.title}</h3>
                <span>
                  {post.replies} replies ·{' '}
                  {new Date(post.created_at).toLocaleDateString('en-US', {
                    timeZone: 'Asia/Colombo',
                  })}
                </span>
              </div>
              <span className={`status-badge ${post.status}`}>{post.status}</span>
              <ArrowUpRight size={16} />
            </Link>
          ))}
          {!posts.length && (
            <div className="empty-state">
              Your next discovery belongs here.
              <Link href="/forum/new">Write your first forum post →</Link>
            </div>
          )}
        </div>
        {rows.length > 25 && (
          <Link className="panel-bottom-link" href={`/admin/forum?before=${posts.at(-1)!.cursor}`}>
            Older posts →
          </Link>
        )}
      </section>
    </>
  );
}
