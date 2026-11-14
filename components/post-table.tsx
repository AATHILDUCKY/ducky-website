'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Search, ArrowUpRight, Trash2, FileText } from 'lucide-react';
import { deletePost } from '@/app/admin/actions';
import type { Post } from '@/lib/types';
export function PostTable({
  posts,
}: {
  posts: Pick<Post, 'id' | 'title' | 'slug' | 'status' | 'category' | 'updated_at'>[];
}) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('All posts');
  const [error, setError] = useState('');
  const [pending, start] = useTransition();
  const [deleting, setDeleting] = useState<string | null>(null);
  const filtered = posts.filter(
    (p) =>
      (filter === 'All posts' || p.status === filter.toLowerCase()) &&
      `${p.title} ${p.category}`.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      <div className="filter-bar">
        <div className="filter-pills">
          {['All posts', 'Published', 'Draft'].map((s) => (
            <button className={filter === s ? 'selected' : ''} key={s} onClick={() => setFilter(s)}>
              {s}{' '}
              <small>
                {posts.filter((p) => s === 'All posts' || p.status === s.toLowerCase()).length}
              </small>
            </button>
          ))}
        </div>
        <label className="search-box">
          <Search size={16} />
          <input
            aria-label="Search posts"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find a post…"
          />
        </label>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="admin-panel table-scroll">
        <table className="posts-table">
          <thead>
            <tr>
              <th>POST</th>
              <th>STATUS</th>
              <th>LAST EDITED</th>
              <th>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link href={`/admin/posts/${p.id}`}>
                    <FileText size={19} />
                    <div>
                      <strong>{p.title}</strong>
                      <small>
                        {p.category} · /blog/{p.slug}
                      </small>
                    </div>
                  </Link>
                </td>
                <td>
                  <span className={`status-badge ${p.status}`}>{p.status}</span>
                </td>
                <td>
                  {new Date(p.updated_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    timeZone: 'Asia/Colombo',
                  })}
                </td>
                <td>
                  <div className="table-actions">
                    <Link
                      className="icon-button"
                      href={`/admin/posts/${p.id}`}
                      aria-label={`Edit ${p.title}`}
                    >
                      <ArrowUpRight size={18} />
                    </Link>
                    <button
                      className="icon-button"
                      aria-label={`Delete ${p.title}`}
                      onClick={() => setDeleting(p.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && (
          <div className="empty-state">
            <FileText />
            No posts here yet.
            <Link className="text-link" href="/admin/posts/new">
              Write something new →
            </Link>
          </div>
        )}
      </div>
      {deleting && (
        <div className="modal-backdrop">
          <div
            className="modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
          >
            <h2 id="delete-title">Delete this post?</h2>
            <p>
              This permanently removes the post and its public URL. You can unpublish it by saving
              as a draft instead.
            </p>
            <div className="modal-actions">
              <button className="button" onClick={() => setDeleting(null)}>
                Keep post
              </button>
              <button
                className="button button-danger"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    try {
                      const r = await deletePost(deleting);
                      if (r.error) setError(r.error);
                      else router.refresh();
                      setDeleting(null);
                    } catch {
                      setError('Could not delete this post. Try again.');
                      setDeleting(null);
                    }
                  })
                }
              >
                {pending ? 'Deleting…' : 'Delete post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
