import Link from 'next/link';
import { randomUUID } from 'node:crypto';
import { requireAdmin } from '@/lib/auth';
import { ForumEditor } from '@/components/forum-editor';
export const metadata = { title: 'New forum post', robots: { index: false, follow: false } };
export default async function NewForumPost() {
  await requireAdmin();
  return (
    <div className="forum-editor-page">
      <Link className="forum-back" href="/forum">
        ← Back to the forum
      </Link>
      <span className="forum-eyebrow">YOUR OPEN NOTEBOOK</span>
      <h1>Something worth sharing.</h1>
      <p>A thought, a link, a small discovery. Make it yours.</p>
      <ForumEditor id={randomUUID()} />
    </div>
  );
}
