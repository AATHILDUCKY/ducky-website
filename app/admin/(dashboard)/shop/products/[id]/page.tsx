import { notFound } from 'next/navigation';
import { z } from 'zod';
import { pool } from '@/lib/db';
import { ProductForm } from '@/components/shop-admin-forms';
export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const p = (
    await pool.query('SELECT *,updated_at::text AS revision FROM shop_products WHERE id=$1', [id])
  ).rows[0];
  if (!p) notFound();
  return (
    <>
      <h1>Edit product</h1>
      <ProductForm product={p} />
    </>
  );
}
