import Link from 'next/link';
import { BagProvider, BagLink } from '@/components/shop-bag';
import './shop.css';
export const dynamic = 'force-dynamic';
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <BagProvider>
      <div className="shop">
        <div className="shop-topline">
          <Link href="/shop" className="shop-wordmark">
            DUCKY<span> / SHOP</span>
          </Link>
          <BagLink />
        </div>
        {children}
      </div>
    </BagProvider>
  );
}
