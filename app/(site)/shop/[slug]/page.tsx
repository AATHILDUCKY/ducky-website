import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProduct, getShopSettings } from '@/lib/shop';
import { siteUrl } from '@/lib/db';
import { money } from '@/lib/shop-types';
import { AddToBag } from '@/components/shop-bag';
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProduct((await params).slug);
  if (!p) return { title: 'Product not found', robots: { index: false } };
  return {
    title: p.seo_title || p.name,
    description: p.seo_description || p.description.slice(0, 170),
    alternates: { canonical: `/shop/${p.slug}` },
    openGraph: {
      title: p.name,
      description: p.description.slice(0, 170),
      url: `/shop/${p.slug}`,
      images: p.images.map((id) => ({ url: `/media/${id}`, alt: p.name })),
    },
    twitter: {
      card: 'summary_large_image',
      title: p.name,
      images: p.images.map((id) => `/media/${id}`),
    },
  };
}
export default async function ProductPage({ params }: Props) {
  const [p, s] = await Promise.all([getProduct((await params).slug), getShopSettings()]);
  if (!p) notFound();
  return (
    <>
      <nav className="shop-breadcrumb" aria-label="Breadcrumb">
        <Link href="/shop">Shop</Link>
        <span>/</span>
        <span>{p.name}</span>
      </nav>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: p.name,
            description: p.description,
            image: p.images.map((id) => `${siteUrl()}/media/${id}`),
            sku: p.id,
            offers: {
              '@type': 'Offer',
              url: `${siteUrl()}/shop/${p.slug}`,
              price: (p.price / 100).toFixed(2),
              priceCurrency: s.currency,
              availability: `https://schema.org/${p.stock ? 'InStock' : 'OutOfStock'}`,
              itemCondition: 'https://schema.org/NewCondition',
            },
          }).replace(/</g, '\\u003c'),
        }}
      />
      <div className="shop-detail">
        <div className="shop-gallery">
          {p.images.map((id, i) => (
            <div className="shop-detail-image" key={id}>
              <Image
                src={`/media/${id}`}
                alt={`${p.name}${i ? ` — view ${i + 1}` : ''}`}
                fill
                priority={i === 0}
                sizes="(max-width:800px) 90vw, 50vw"
              />
            </div>
          ))}
        </div>
        <div className="shop-detail-copy">
          <p className="shop-kicker">{p.category}</p>
          <h1>{p.name}</h1>
          <div className="shop-price">{money(p.price, s.currency)}</div>
          <p className="shop-availability">
            {p.stock ? `${p.stock} in stock` : 'Currently sold out'}
          </p>
          <p className="shop-description">{p.description}</p>
          <AddToBag product={p} />
          <div className="shop-info">
            <div>
              <h3>Delivery</h3>
              <p>{s.delivery}</p>
              <p>Delivery fee: {money(s.shipping, s.currency)} per order.</p>
            </div>
            <div>
              <h3>Payment & returns</h3>
              <p>
                {s.payment === 'cod'
                  ? 'Pay cash when your order arrives.'
                  : 'We will contact you to arrange payment after ordering.'}
              </p>
              <p>{s.returns}</p>
            </div>
          </div>
          <Link href="/shop">Continue exploring</Link>
        </div>
      </div>
    </>
  );
}
