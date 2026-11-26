import 'server-only';
import { cache } from 'react';
import { pool } from './db';
import type { Product, ShopSettings } from './shop-types';
export const getShopSettings = cache(
  async (): Promise<ShopSettings> =>
    (await pool.query("SELECT value FROM settings WHERE key='shop'")).rows[0].value,
);
export const getProducts = cache(
  async (): Promise<Product[]> =>
    (
      await pool.query(
        "SELECT * FROM shop_products WHERE status='published' ORDER BY created_at DESC LIMIT 1000",
      )
    ).rows,
);
export const getProduct = cache(
  async (slug: string): Promise<Product | undefined> =>
    (await pool.query("SELECT * FROM shop_products WHERE slug=$1 AND status='published'", [slug]))
      .rows[0],
);
