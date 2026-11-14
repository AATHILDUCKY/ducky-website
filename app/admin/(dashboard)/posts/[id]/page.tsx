import { PostEditor } from '@/components/post-editor';
import { pool, siteUrl } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { notFound } from 'next/navigation';
import { z } from 'zod';
export const metadata = { title: 'Edit post' };
export default async function Edit({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const result = await pool.query('SELECT * FROM posts WHERE id=$1', [id]);
  if (!result.rowCount) notFound();
  return <PostEditor post={result.rows[0]} baseUrl={siteUrl()} />;
}
