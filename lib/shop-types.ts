export type Product = {
  revision?: string;
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  images: string[];
  status: 'draft' | 'published';
  seo_title: string;
  seo_description: string;
  updated_at: string;
};
export type ShopSettings = {
  currency: string;
  shipping: number;
  payment: 'cod' | 'manual';
  delivery: string;
  returns: string;
};
export type OrderItem = { id: string; name: string; slug: string; price: number; quantity: number };
export type Order = {
  id: string;
  number: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  notes: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  currency: string;
  status: string;
  payment_method: string;
  payment_status: string;
  admin_note: string;
  tracking: string;
  created_at: string;
};
export type ShopState = {
  error?: string;
  success?: boolean;
  order?: { number: string; total: number; currency: string };
};
export function money(value: number, currency = 'LKR') {
  return new Intl.NumberFormat('en-LK', { style: 'currency', currency }).format(value / 100);
}
