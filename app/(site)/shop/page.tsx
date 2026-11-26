import { ShoppingBag, PackageCheck, ReceiptText, MessageCircle } from 'lucide-react';
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
      <header className="shop-hero">
        <div>
          <p className="shop-kicker">A LITTLE SOMETHING FROM DUCKY</p>
          <h1>
            Good finds.
            <br />
            <em>Great possibilities.</em>
          </h1>
          <p>
            A collection worth exploring. Find something you love, take a closer look, and make it
            yours.
          </p>
          <a href="#collection" className="shop-button">
            <ShoppingBag size={19} /> Explore the collection
          </a>
        </div>
        <div className="shop-hero-art" aria-hidden="true">
          <div className="shop-orbit" />
          <ShoppingBag strokeWidth={1} size={150} />
          <span>
            HANDPICKED.
            <br />
            READY FOR YOU.
          </span>
          <i>✳</i>
        </div>
      </header>
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
