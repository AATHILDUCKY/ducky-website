import '@/app/(site)/shop/shop.css';
import './orders.css';
export const metadata = { title: 'Orders' };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className="shop shop-admin orders-workspace">{children}</div>;
}
