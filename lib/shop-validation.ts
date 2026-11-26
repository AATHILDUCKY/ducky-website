import { z } from 'zod';
const minor = z.coerce.number().int().min(0).max(100000000);
export const productSchema = z
  .object({
    id: z.uuid().optional(),
    revision: z.string().max(100).optional(),
    name: z.string().trim().min(2).max(160),
    slug: z
      .string()
      .trim()
      .min(2)
      .max(160)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    description: z.string().trim().min(10).max(12000),
    category: z.string().trim().min(1).max(60),
    price: minor.refine((n) => n > 0),
    stock: z.coerce.number().int().min(0).max(100000),
    images: z.array(z.uuid()).max(6),
    status: z.enum(['draft', 'published']),
    seo_title: z.string().trim().max(100),
    seo_description: z.string().trim().max(170),
  })
  .refine((p) => p.status === 'draft' || p.images.length > 0, {
    message: 'Upload at least one image before publishing.',
  });
export const shopSettingsSchema = z.object({
  currency: z.enum(['LKR', 'USD', 'EUR', 'GBP', 'INR']),
  shipping: minor,
  payment: z.enum(['cod', 'manual']),
  delivery: z.string().trim().min(5).max(1000),
  returns: z.string().trim().min(5).max(1000),
});
export const checkoutSchema = z
  .object({
    submission_id: z.uuid(),
    name: z.string().trim().min(2).max(100),
    email: z
      .email()
      .max(254)
      .transform((s) => s.toLowerCase()),
    phone: z
      .string()
      .trim()
      .min(7)
      .max(30)
      .regex(/^[+\d\s().-]+$/),
    address: z.string().trim().min(5).max(500),
    city: z.string().trim().min(2).max(100),
    postal_code: z.string().trim().min(2).max(20),
    country: z.literal('Sri Lanka'),
    notes: z.string().trim().max(1000),
    consent: z.literal('yes'),
    items: z
      .array(z.object({ id: z.uuid(), quantity: z.number().int().min(1).max(99), price: minor }))
      .min(1)
      .max(30),
  })
  .refine((v) => new Set(v.items.map((i) => i.id)).size === v.items.length, {
    message: 'The bag contains duplicate items. Please refresh.',
  });
