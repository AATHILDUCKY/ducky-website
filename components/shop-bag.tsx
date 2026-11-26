'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, Check } from 'lucide-react';
import type { Product } from '@/lib/shop-types';
type BagItem = { id: string; quantity: number };
const BagContext = createContext<{
  items: BagItem[];
  ready: boolean;
  set: (items: BagItem[]) => void;
}>({ items: [], ready: false, set: () => {} });
export function BagProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<BagItem[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('ducky-bag') || '[]');
      if (Array.isArray(raw))
        setItems(
          raw
            .filter(
              (i) =>
                typeof i.id === 'string' &&
                Number.isInteger(i.quantity) &&
                i.quantity > 0 &&
                i.quantity <= 99,
            )
            .slice(0, 30),
        );
    } catch {}
    setReady(true);
  }, []);
  function set(value: BagItem[]) {
    setItems(value);
    try {
      localStorage.setItem('ducky-bag', JSON.stringify(value));
    } catch {}
  }
  return <BagContext.Provider value={{ items, ready, set }}>{children}</BagContext.Provider>;
}
export const useBag = () => useContext(BagContext);
export function BagLink() {
  const { items } = useBag();
  return (
    <Link className="shop-button shop-secondary" href="/shop/checkout">
      <ShoppingBag size={18} /> Bag ({items.reduce((s, i) => s + i.quantity, 0)})
    </Link>
  );
}
export function AddToBag({ product }: { product: Product }) {
  const bag = useBag();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const current = bag.items.find((i) => i.id === product.id)?.quantity || 0;
  const remaining = Math.min(99, product.stock) - current;
  return (
    <div className="shop-purchase">
      <label>
        Quantity
        <input
          aria-label="Quantity"
          type="number"
          min="1"
          max={Math.max(1, remaining)}
          value={quantity}
          onChange={(e) =>
            setQuantity(Math.max(1, Math.min(remaining, Number(e.target.value) || 1)))
          }
        />
      </label>
      <button
        className="shop-button"
        disabled={!bag.ready || remaining <= 0}
        onClick={() => {
          bag.set([
            ...bag.items.filter((i) => i.id !== product.id),
            { id: product.id, quantity: current + Math.min(quantity, remaining) },
          ]);
          setAdded(true);
        }}
      >
        {added ? <Check size={18} /> : <ShoppingBag size={18} />}{' '}
        {product.stock === 0
          ? 'Sold out'
          : remaining <= 0
            ? 'Maximum added'
            : added
              ? 'Added to bag'
              : 'Add to bag'}
      </button>
      <span role="status">{added && <Link href="/shop/checkout">Continue to checkout</Link>}</span>
    </div>
  );
}
