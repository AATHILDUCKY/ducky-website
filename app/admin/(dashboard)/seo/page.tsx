import { getSeo, getPosts, siteUrl } from '@/lib/db';
import { SeoForm } from '@/components/settings-forms';
import { Check, ArrowUpRight, FileCode2, Search, Globe, Info } from 'lucide-react';
import Link from 'next/link';
export const metadata = { title: 'Search & SEO' };
export default async function Seo() {
  const [seo, posts] = await Promise.all([getSeo(), getPosts()]);
  const base = siteUrl();
  return (
    <>
      <div className="admin-heading">
        <div>
          <span className="eyebrow">HELP YOUR WORK FIND ITS PEOPLE</span>
          <h1>
            Good to be found<span className="accent">.</span>
          </h1>
          <p>A simple home for search, sharing, and the details that matter.</p>
        </div>
        <a
          className="button"
          href="https://search.google.com/search-console"
          target="_blank"
          rel="noreferrer"
        >
          Search Console <ArrowUpRight size={16} />
        </a>
      </div>
      <div className="seo-status-grid">
        {[
          [FileCode2, 'Sitemap', 'Updates on publish'],
          [Globe, 'Canonical URLs', 'One clear URL per page'],
          [Search, 'Article schema', 'Built into every post'],
        ].map(([Icon, title, desc]) => {
          const I = Icon as typeof Search;
          return (
            <div className="seo-status-card" key={title as string}>
              <I size={22} />
              <div>
                <strong>{title as string}</strong>
                <span>{desc as string}</span>
              </div>
              <Check size={17} />
            </div>
          );
        })}
      </div>
      <div className="seo-columns">
        <div>
          <SeoForm seo={seo} baseUrl={base} />
          <section className="admin-panel form-panel">
            <h2>Your published posts</h2>
            <p className="muted">
              {posts.length} {posts.length === 1 ? 'article is' : 'articles are'} included in your
              sitemap. Drafts stay private.
            </p>
            {posts.map((p) => (
              <Link className="seo-post-row" key={p.id} href={`/admin/posts/${p.id}`}>
                <div>
                  <strong>{p.title}</strong>
                  <span>
                    {(p.seo_description || p.excerpt).length} description characters ·{' '}
                    {p.cover_id ? 'Cover image set' : 'Default sharing image'}
                  </span>
                </div>
                <ArrowUpRight size={16} />
              </Link>
            ))}
          </section>
        </div>
        <div>
          <section className="admin-panel form-panel search-guide">
            <span className="eyebrow">A ONE-TIME SETUP</span>
            <h2>Meet Google Search Console.</h2>
            <p>See how people find your website and ask Google to discover your pages.</p>
            <ol>
              <li>
                <strong>Add your website</strong>
                <p>
                  Open Search Console and add a Domain property for your production domain. Verify
                  it with a DNS TXT record. Or use a URL-prefix property and the HTML verification
                  token on this page.
                </p>
              </li>
              <li>
                <strong>Submit your sitemap</strong>
                <p>
                  In the Sitemaps section, submit <code>{base}/sitemap.xml</code>. It always
                  reflects your published posts.
                </p>
                <a className="text-link" href="/sitemap.xml" target="_blank">
                  Open sitemap <ArrowUpRight size={14} />
                </a>
              </li>
              <li>
                <strong>Inspect a published URL</strong>
                <p>
                  Paste a post URL into URL Inspection. Run “Test live URL,” then request indexing
                  if appropriate.
                </p>
              </li>
              <li>
                <strong>Give it time</strong>
                <p>
                  Check the Page indexing and Performance reports over the following days.
                  Publishing and sitemap inclusion do not guarantee indexing or ranking.
                </p>
              </li>
            </ol>
            <a
              className="text-link"
              href="https://support.google.com/webmasters/answer/9008080"
              target="_blank"
              rel="noreferrer"
            >
              Google’s verification guide <ArrowUpRight size={14} />
            </a>
          </section>
          <section className="seo-tip">
            <Info size={20} />
            <div>
              <strong>Write for people first.</strong>
              <p>
                Use a descriptive title, one clear topic, helpful headings, and meaningful image alt
                text. Link to related writing and cite sources.
              </p>
              <a
                href="https://developers.google.com/search/docs/appearance/structured-data/article"
                target="_blank"
                rel="noreferrer"
              >
                About article structured data ↗
              </a>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
