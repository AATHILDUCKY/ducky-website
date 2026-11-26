import '@/app/(site)/shop/shop.css';
export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className="shop shop-admin">{children}</div>;
}
