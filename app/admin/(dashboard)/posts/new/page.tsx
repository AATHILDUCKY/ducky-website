import { PostEditor } from '@/components/post-editor';
import { siteUrl } from '@/lib/db';
export const metadata = { title: 'New post' };
export default function NewPost() {
  return <PostEditor baseUrl={siteUrl()} />;
}
