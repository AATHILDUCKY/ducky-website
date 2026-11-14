import Link from 'next/link';
import { Plus } from 'lucide-react';
import { pool } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { PostTable } from '@/components/post-table';
export const metadata = { title: 'Writeups' };
export default async function Posts() {
  await requireAdmin();
  const posts = await pool.query(
    'SELECT id,title,slug,status,category,updated_at FROM posts ORDER BY updated_at DESC',
  );
  return (
    <>
      <div className="admin-heading">
        <div>
          <span className="eyebrow">THINK IT. WRITE IT. SHARE IT.</span>
          <h1>
            Your writeups<span className="accent">.</span>
          </h1>
          <p>A home for your notes, stories, and the things you’re learning.</p>
        </div>
        <Link className="button button-dark" href="/admin/posts/new">
          <Plus size={17} /> New writeup
        </Link>
      </div>
      <PostTable posts={posts.rows} />
    </>
  );
}
