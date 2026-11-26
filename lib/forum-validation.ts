import { z } from 'zod';
import { normalizeForumLinkInput, safeForumUrl } from './forum-links';

export const forumImageSchema = z.object({
  id: z.uuid(),
  alt: z.string().trim().max(300),
  width: z.number().int().positive().max(20000),
  height: z.number().int().positive().max(20000),
});
export const forumPostSchema = z.object({
  id: z.uuid(),
  revision: z.string().max(64),
  title: z.string().trim().min(3, 'Give your post a title of at least 3 characters.').max(160),
  content: z.string().trim().min(1, 'Write something to share.').max(20000),
  link_url: z
    .string()
    .trim()
    .max(2000)
    .transform(normalizeForumLinkInput)
    .refine((v) => !v || safeForumUrl(v), 'Use a complete http or https link.'),
  images: z.array(forumImageSchema).max(4),
  status: z.enum(['published', 'draft']),
});
export const forumReplySchema = z.object({
  postId: z.uuid(),
  parentId: z.preprocess((v) => v || null, z.uuid().nullable()).optional(),
  submissionId: z.uuid(),
  name: z
    .string()
    .trim()
    .max(80)
    .transform((v) => v || 'Guest'),
  content: z.string().trim().min(2, 'Write at least 2 characters.').max(2000),
});
export function forumSearch(value: string) {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').slice(0, 160);
}
export function forumExcerpt(content: string, length = 180) {
  return content
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#*_`>~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, length);
}
export type ForumCursor = {
  date: string;
  id: string;
  rank: number;
  q: string;
  snapshot?: string;
  position?: number;
  tail?: boolean;
};
const cursorSchema = z.object({
  date: z.iso.datetime({ offset: true }),
  id: z.uuid(),
  rank: z.number().finite().nonnegative(),
  q: z.string().max(160),
  snapshot: z.uuid().optional(),
  position: z.number().int().min(0).max(500).optional(),
  tail: z.boolean().optional(),
});
export function encodeForumCursor(cursor: ForumCursor) {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}
export function decodeForumCursor(value: string, q = ''): ForumCursor | null {
  if (!value || value.length > 1200) return null;
  try {
    const result = cursorSchema.safeParse(
      JSON.parse(Buffer.from(value, 'base64url').toString('utf8')),
    );
    return result.success && result.data.q === q ? result.data : null;
  } catch {
    return null;
  }
}
export function forumPageHref(q: string, after = '', sort: 'top' | 'latest' = 'top') {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (after) params.set('after', after);
  if (sort === 'latest') params.set('sort', 'latest');
  return '/forum' + (params.size ? '?' + params.toString() : '');
}
