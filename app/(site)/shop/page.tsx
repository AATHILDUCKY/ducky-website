import { PackageCheck, ReceiptText, MessageCircle } from 'lucide-react';
import { getProducts, getShopSettings } from '@/lib/shop';
import { ShopCatalog } from '@/components/shop-catalog';
export const metadata = {
  title: 'Shop',
  description:
    'Explore the Ducky collection. Discover available products, see every detail, and order in a few simple steps.',
  alternates: { canonical: '/shop' },
};
export default async function Shop() {
  const [products, s] = await Promise.all([getProducts(), getShopSettings()]);
  return (
    <>
      <div className="shop-benefits">
        <span>
          <PackageCheck size={22} /> Clear product details
        </span>
        <span>
          <ReceiptText size={22} /> Simple, transparent checkout
        </span>
        <span>
          <MessageCircle size={22} /> A real person to help
        </span>
      </div>
      <ShopCatalog products={products} currency={s.currency} />
      <div className="shop-info">
        <div>
          <h3>Delivery, made clear.</h3>
          <p>{s.delivery}</p>
        </div>
        <div>
          <h3>Need a hand?</h3>
          <p>{s.returns}</p>
          <a href="/contact">Get in touch</a>
        </div>
      </div>
    </>
  );
}
