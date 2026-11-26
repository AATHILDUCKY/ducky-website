'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Package, Search } from 'lucide-react';
import { money, type Product } from '@/lib/shop-types';
export function ShopCatalog({ products, currency }: { products: Product[]; currency: string }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('newest');
  const categories = ['All', ...new Set(products.map((p) => p.category))];
  const filtered = products
    .filter(
      (p) =>
        (category === 'All' || p.category === category) &&
        `${p.name} ${p.description} ${p.category}`.toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) => (sort === 'low' ? a.price - b.price : sort === 'high' ? b.price - a.price : 0));
  return (
    <section id="collection">
      <div className="shop-section-title">
        <div>
          <p className="shop-kicker">THE COLLECTION</p>
          <h2>Find your next favourite.</h2>
        </div>
        <span>{products.length} products</span>
      </div>
      <div className="shop-filters">
        <div className="shop-search">
          <Search size={18} />
          <input
            aria-label="Search products"
            placeholder="Find something good…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select aria-label="Sort products" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="newest">Newest first</option>
          <option value="low">Price: low to high</option>
          <option value="high">Price: high to low</option>
        </select>
      </div>
      <div className="shop-categories" aria-label="Product categories">
        {categories.map((c) => (
          <button aria-pressed={c === category} onClick={() => setCategory(c)} key={c}>
            {c}
          </button>
        ))}
      </div>
      <div className="shop-grid">
        {filtered.map((p) => (
          <Link className="shop-card" href={`/shop/${p.slug}`} key={p.id}>
            <div className="shop-card-image">
              {p.images[0] ? (
                <Image
                  src={`/media/${p.images[0]}`}
                  alt={p.name}
                  fill
                  sizes="(max-width:520px) 90vw, (max-width:1000px) 45vw, 23vw"
                />
              ) : (
                <Package size={64} />
              )}
              <span className="shop-stock">{p.stock ? 'Available' : 'Sold out'}</span>
            </div>
            <div className="shop-card-copy">
              <span className="shop-kicker">{p.category}</span>
              <h3>{p.name}</h3>
              <p>{p.description.slice(0, 100)}</p>
              <strong>{money(p.price, currency)}</strong>
              <span className="shop-card-view">View product</span>
            </div>
          </Link>
        ))}
      </div>
      {!filtered.length && (
        <div className="shop-empty">
          <Package size={44} />
          <h3>{products.length ? 'No matches just yet.' : 'Good things are on the way.'}</h3>
          <p>
            {products.length
              ? 'Try another search or category.'
              : 'The collection is being prepared. Come back soon to explore what’s available.'}
          </p>
          {products.length > 0 && (
            <button
              className="shop-button"
              onClick={() => {
                setQuery('');
                setCategory('All');
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </section>
  );
}
