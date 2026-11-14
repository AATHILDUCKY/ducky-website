import Link from 'next/link';
import { getPost, getPosts, getProfile, siteUrl, readTime } from '@/lib/db';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Markdown } from '@/components/markdown';
import { articleAuthor } from '@/lib/article-author';
import { AuthorAvatar } from '@/components/author-avatar';
import { ShareButton } from '@/components/share-button';
import { RelatedWriteups } from '@/components/related-writeups';
import { relatedWriteups } from '@/lib/related-writeups';
import { PageAd } from '@/components/page-ad';
import type { Metadata } from 'next';
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getPost((await params).slug);
  if (!p) return {};
  return {
    title: p.seo_title || p.title,
    description: p.seo_description || p.excerpt,
    alternates: { canonical: `/blog/${p.slug}` },
    openGraph: {
      type: 'article',
      title: p.seo_title || p.title,
      description: p.seo_description || p.excerpt,
      url: `/blog/${p.slug}`,
      publishedTime: new Date(p.published_at!).toISOString(),
      modifiedTime: new Date(p.updated_at).toISOString(),
      ...(p.cover_id ? { images: [`/media/${p.cover_id}`] } : {}),
    },
  };
}
export default async function Article({ params }: Props) {
  const p = await getPost((await params).slug);
  if (!p) notFound();
  const [profile, posts] = await Promise.all([getProfile(), getPosts()]);
  const suggestions = relatedWriteups(p, posts);
  const author = articleAuthor(profile);
  return (
    <article className="article">
      <Link className="text-link" href="/blog">
        <ArrowLeft size={15} /> All writing
      </Link>
      <header className="article-heading">
        <span className="eyebrow">
          {p.category} · {readTime(p.content)} MIN READ
        </span>
        <h1>{p.title}</h1>
        <p>{p.excerpt}</p>
        <div className="article-author">
          <AuthorAvatar name={author.name} portrait={author.portrait} />
          <div>
            <strong>{author.name}</strong>
            <time dateTime={new Date(p.published_at!).toISOString()}>
              {new Date(p.published_at!).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: 'Asia/Colombo',
              })}
            </time>
          </div>
          <ShareButton />
        </div>
      </header>
      {p.cover_id && (
        <img
          className="article-cover"
          src={`/media/${p.cover_id}`}
          alt={p.title}
          width={1200}
          height={675}
        />
      )}
      <Markdown content={p.content} />
      <PageAd />
      <div className="article-tags tags">
        {p.tags.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
      <Link className="text-link" href="/about">
        About the author <span>↗</span>
      </Link>
      <RelatedWriteups suggestions={suggestions} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: p.title,
            description: p.excerpt,
            datePublished: p.published_at,
            dateModified: p.updated_at,
            image: [
              new URL(p.cover_id ? `/media/${p.cover_id}` : '/opengraph-image', siteUrl()).href,
            ],
            author: {
              '@type': 'Person',
              name: author.name,
              url: `${siteUrl()}/about`,
              ...(author.portrait ? { image: new URL(author.portrait, siteUrl()).href } : {}),
            },
            mainEntityOfPage: `${siteUrl()}/blog/${p.slug}`,
          }).replace(/</g, '\\u003c'),
        }}
      />
    </article>
  );
}
