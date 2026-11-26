import Link from 'next/link';
import { pool } from '@/lib/db';
import { getShopSettings } from '@/lib/shop';
import { money, type Product } from '@/lib/shop-types';
import { ShopSettingsForm } from '@/components/shop-admin-forms';
export const metadata = { title: 'Shop management' };
export default async function ShopAdmin() {
  const [products, stats, s] = await Promise.all([
    pool.query<Product>('SELECT * FROM shop_products ORDER BY created_at DESC'),
    pool.query(
      "SELECT count(*)::int AS total,count(*) FILTER(WHERE status='new')::int AS new,count(*) FILTER(WHERE status IN ('confirmed','shipped'))::int AS active FROM shop_orders",
    ),
    getShopSettings(),
  ]);
  return (
    <>
      <div className="shop-admin-heading">
        <div>
          <p className="shop-kicker">YOUR STORE</p>
          <h1>Shop management</h1>
          <p>Products, orders and the details that make your shop yours.</p>
        </div>
        <Link className="shop-button" href="/admin/shop/products/new">
          Add product
        </Link>
      </div>
      <div className="shop-admin-stats">
        <Link href="/admin/shop/orders">
          <strong>{stats.rows[0].new}</strong> New orders
        </Link>
        <Link href="/admin/shop/orders">
          <strong>{stats.rows[0].active}</strong> In progress
        </Link>
        <Link href="/admin/shop/orders">
          <strong>{stats.rows[0].total}</strong> All orders
        </Link>
        <Link href="/shop">View storefront</Link>
      </div>
      <div className="shop-section-title">
        <h2>Your products</h2>
        <Link href="/admin/shop/orders">Manage orders</Link>
      </div>
      <div className="shop-table-wrap">
        <table className="shop-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Visibility</th>
              <th>Edit</th>
            </tr>
          </thead>
          <tbody>
            {products.rows.map((p) => (
              <tr key={p.id}>
                <td>
                  {p.name}
                  <small>{p.category}</small>
                </td>
                <td>{money(p.price, s.currency)}</td>
                <td>{p.stock}</td>
                <td>{p.status}</td>
                <td>
                  <Link href={`/admin/shop/products/${p.id}`}>Edit product</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!products.rows.length && (
          <div className="shop-empty">
            <h3>Your collection starts here.</h3>
            <p>Add a product with photos, a price and the details customers need.</p>
            <Link className="shop-button" href="/admin/shop/products/new">
              Add your first product
            </Link>
          </div>
        )}
      </div>
      <ShopSettingsForm settings={s} />
    </>
  );
}
