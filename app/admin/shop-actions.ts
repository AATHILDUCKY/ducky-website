'use server';
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath, updateTag } from 'next/cache';
import { pool } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { productSchema, shopSettingsSchema } from '@/lib/shop-validation';
import type { ShopState } from '@/lib/shop-types';
function invalidate() {
  updateTag('sitemaps');
  revalidatePath('/shop', 'layout');
  revalidatePath('/admin/shop', 'layout');
}
export async function saveProduct(_: ShopState, form: FormData): Promise<ShopState> {
  await requireAdmin();
  let images;
  try {
    images = JSON.parse(String(form.get('images')));
  } catch {
    return { error: 'Please check the images.' };
  }
  const parsed = productSchema.safeParse({
    ...Object.fromEntries(form),
    id: form.get('id') || undefined,
    price: Math.round(Number(form.get('price')) * 100),
    images,
  });
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join(' ') };
  const p = parsed.data;
  let savedId: string;
  try {
    if (p.images.length) {
      const found = await pool.query('SELECT id FROM media WHERE id=ANY($1::uuid[])', [p.images]);
      if (found.rowCount !== new Set(p.images).size)
        return { error: 'An image is missing. Please upload it again.' };
    }
    const values = [
      p.name,
      p.slug,
      p.description,
      p.category,
      p.price,
      p.stock,
      p.images,
      p.status,
      p.seo_title,
      p.seo_description,
    ];
    const saved = p.id
      ? await pool.query(
          'UPDATE shop_products SET name=$1,slug=$2,description=$3,category=$4,price=$5,stock=$6,images=$7,status=$8,seo_title=$9,seo_description=$10,updated_at=now() WHERE id=$11 AND updated_at::text=$12 RETURNING id',
          [...values, p.id, p.revision],
        )
      : await pool.query(
          'INSERT INTO shop_products(name,slug,description,category,price,stock,images,status,seo_title,seo_description) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id',
          values,
        );
    if (!saved.rowCount)
      return {
        error:
          'This product changed while you were editing, possibly because an order was placed. Refresh before saving again.',
      };
    savedId = saved.rows[0].id;
  } catch (e) {
    return {
      error:
        (e as { code?: string }).code === '23505'
          ? 'That URL is already used. Choose another slug.'
          : 'Could not save the product.',
    };
  }
  invalidate();
  if (!p.id) redirect(`/admin/shop/products/${savedId}`);
  return { success: true };
}
export async function saveShopSettings(_: ShopState, form: FormData): Promise<ShopState> {
  await requireAdmin();
  const p = shopSettingsSchema.safeParse({
    ...Object.fromEntries(form),
    payment: 'manual',
    cod_enabled: form.get('cod_enabled') === 'yes',
    shipping: Math.round(Number(form.get('shipping')) * 100),
  });
  if (!p.success) return { error: p.error.issues.map((i) => i.message).join(' ') };
  await pool.query("UPDATE settings SET value=$1,updated_at=now() WHERE key='shop'", [
    JSON.stringify(p.data),
  ]);
  invalidate();
  return { success: true };
}
