import { getProducts, getShopSettings } from '@/lib/shop';
import { ShopCheckout } from '@/components/shop-checkout';
export const metadata = { title: 'Checkout', robots: { index: false, follow: false } };
export default async function Checkout() {
  const [products, settings] = await Promise.all([getProducts(), getShopSettings()]);
  return <ShopCheckout products={products} settings={settings} />;
}
