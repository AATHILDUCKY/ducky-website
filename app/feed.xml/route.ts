import { getPosts, getProfile, siteUrl } from '@/lib/db';
function escape(value: string) {
  return value.replace(
    /[<>&"']/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!,
  );
}
export const dynamic = 'force-dynamic';
export async function GET() {
  const [posts, p] = await Promise.all([getPosts(), getProfile()]);
  const base = siteUrl();
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${escape(p.name)} — Writing</title><link>${escape(base)}/blog</link><description>Notes on security, software, and learning.</description><language>en</language>${posts
    .slice(0, 30)
    .map(
      (post) =>
        `<item><title>${escape(post.title)}</title><link>${escape(base)}/blog/${post.slug}</link><guid isPermaLink="true">${escape(base)}/blog/${post.slug}</guid><description>${escape(post.excerpt)}</description><pubDate>${new Date(post.published_at!).toUTCString()}</pubDate></item>`,
    )
    .join('')}</channel></rss>`;
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
