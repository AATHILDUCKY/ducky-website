import { getPosts } from '@/lib/db';
import { BlogFilter } from '@/components/blog-filter';
export const metadata = {
  title: 'Writeups',
  description:
    'Notes on security engineering, software development, open-source projects, and learning by Aathil Ahamed.',
  alternates: { canonical: '/blog' },
};
export default async function Blog() {
  const posts = await getPosts();
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">WRITEUPS / RESEARCH, PROJECTS & NOTES</span>
        <h1>
          Learning
          <br />
          out loud<span className="accent">.</span>
        </h1>
        <p>What I’m building. What I’m breaking. What I’m learning from both.</p>
      </div>
      <BlogFilter posts={posts} />
    </>
  );
}
