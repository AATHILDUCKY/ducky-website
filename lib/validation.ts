import { z } from 'zod';
export const slugSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens.');
export const postSchema = z.object({
  id: z.union([z.literal(''), z.uuid()]),
  title: z.string().trim().min(3).max(180),
  slug: slugSchema,
  excerpt: z.string().trim().min(10).max(320),
  content: z.string().min(10).max(200000),
  category: z.string().trim().min(1).max(50),
  tags: z.array(z.string().trim().min(1).max(40)).max(12),
  status: z.enum(['draft', 'published']),
  seo_title: z.string().max(70),
  seo_description: z.string().max(170),
  cover_id: z.union([z.uuid(), z.literal('')]),
});
export const safeExternal = z.union([
  z.literal(''),
  z.url().refine((v) => /^https?:\/\//.test(v), 'Use an HTTP or HTTPS URL.'),
]);
const socialUrl = z
  .string()
  .trim()
  .max(500, 'Use 500 characters or fewer.')
  .pipe(safeExternal)
  .refine((value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return !url.username && !url.password;
    } catch {
      return false;
    }
  }, 'Use a public profile URL without a username or password in the address.');
export const socialLinksSchema = z.object({
  github: socialUrl,
  linkedin: socialUrl,
  youtube: socialUrl,
  instagram: socialUrl,
  x: socialUrl,
});

export const articleAuthorSchema = z.object({
  name: z
    .string()
    .trim()
    .max(100)
    .refine(
      (value) => !value || value.length >= 2,
      'Use at least 2 characters or leave the author name blank.',
    ),
  portrait: z
    .string()
    .refine(
      (value) =>
        value === '' || (value.startsWith('/media/') && z.uuid().safeParse(value.slice(7)).success),
      'Use the author photo upload button.',
    ),
});
