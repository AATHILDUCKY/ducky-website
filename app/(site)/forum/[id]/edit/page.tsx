import Link from 'next/link';
import { forumPostPath } from '@/lib/forum-slugs.mjs';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { getForumPost } from '@/lib/forum';
import { ForumEditor } from '@/components/forum-editor';
export const metadata = { title: 'Edit forum post', robots: { index: false, follow: false } };
export default async function EditForumPost({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const post = await getForumPost((await params).id, true);
  if (!post) notFound();
  return (
    <div className="forum-editor-page">
      <Link className="forum-back" href={forumPostPath(post)}>
        ← Back to the post
      </Link>
      <span className="forum-eyebrow">YOUR OPEN NOTEBOOK</span>
      <h1>A little fine-tuning.</h1>
      <p>Update your post or change its visibility.</p>
      <ForumEditor id={post.id} post={post} />
    </div>
  );
}
