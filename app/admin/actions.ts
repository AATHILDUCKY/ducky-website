'use server';
import { z } from 'zod';
import { articleAuthorSchema, postSchema, socialLinksSchema } from '@/lib/validation';
import { createHash } from 'node:crypto';
import { revalidatePath, updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { pool } from '@/lib/db';
import { clearSession, requireAdmin, secureEqual, setSession } from '@/lib/auth';
import { normalizeMarkdownFences } from '@/lib/markdown-tools';
import type { Profile } from '@/lib/types';
export type ActionResult = { error?: string; success?: boolean; id?: string };
function invalidate() {
  updateTag('content');
  revalidatePath('/', 'layout');
}
export async function login(_previous: ActionResult, form: FormData): Promise<ActionResult> {
  // A shared account limit is independent of potentially forged forwarding headers.
  const key = createHash('sha256').update('admin-login').digest('hex');
  await pool.query("DELETE FROM login_attempts WHERE window_start < now()-interval '1 day'");
  const attempts = await pool.query(
    `INSERT INTO login_attempts(key) VALUES($1) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN login_attempts.window_start<now()-interval '15 minutes' THEN 1 ELSE login_attempts.attempts+1 END,window_start=CASE WHEN login_attempts.window_start<now()-interval '15 minutes' THEN now() ELSE login_attempts.window_start END RETURNING attempts`,
    [key],
  );
  if (attempts.rows[0].attempts > 10)
    return { error: 'Too many sign-in attempts. Please try again in 15 minutes.' };
  const username = String(form.get('username') || '');
  const password = String(form.get('password') || '');
  if (
    username.length > 200 ||
    password.length > 500 ||
    !process.env.ADMIN_PASSWORD ||
    !process.env.ADMIN_USERNAME
  )
    return { error: 'Unable to sign in. Check your credentials.' };
  if (
    !secureEqual(username, process.env.ADMIN_USERNAME) ||
    !secureEqual(password, process.env.ADMIN_PASSWORD)
  )
    return { error: 'That username or password isn’t right. Please try again.' };
  await pool.query('DELETE FROM login_attempts WHERE key=$1', [key]);
  await setSession();
  redirect('/admin');
}
export async function logout() {
  await clearSession();
  redirect('/admin/login');
}
export async function savePost(raw: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = postSchema.safeParse(raw);
  if (!parsed.success)
    return { error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(' ') };
  const p = parsed.data;
  p.content = normalizeMarkdownFences(p.content);
  try {
    if (p.cover_id) {
      const cover = await pool.query('SELECT id FROM media WHERE id=$1', [p.cover_id]);
      if (!cover.rowCount) return { error: 'The cover image could not be found. Upload it again.' };
    }
    let result;
    if (p.id) {
      result = await pool.query(
        `UPDATE posts SET title=$2,slug=$3,excerpt=$4,content=$5,category=$6,tags=$7,status=$8,seo_title=$9,seo_description=$10,cover_id=$11,published_at=CASE WHEN $8='published' THEN COALESCE(published_at,now()) ELSE published_at END,updated_at=now() WHERE id=$1 RETURNING id`,
        [
          p.id,
          p.title,
          p.slug,
          p.excerpt,
          p.content,
          p.category,
          p.tags,
          p.status,
          p.seo_title,
          p.seo_description,
          p.cover_id || null,
        ],
      );
    } else {
      result = await pool.query(
        `INSERT INTO posts(title,slug,excerpt,content,category,tags,status,seo_title,seo_description,cover_id,published_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,CASE WHEN $7='published' THEN now() ELSE NULL END) RETURNING id`,
        [
          p.title,
          p.slug,
          p.excerpt,
          p.content,
          p.category,
          p.tags,
          p.status,
          p.seo_title,
          p.seo_description,
          p.cover_id || null,
        ],
      );
    }
    if (!result.rowCount) return { error: 'This post no longer exists.' };
    invalidate();
    return { success: true, id: result.rows[0].id };
  } catch (error) {
    if ((error as { code?: string }).code === '23505')
      return { error: 'That URL slug is already in use. Choose another.' };
    console.error('Post save failed', error);
    return { error: 'Could not save the post. Please try again.' };
  }
}
export async function deletePost(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!z.uuid().safeParse(id).success) return { error: 'Invalid post.' };
  await pool.query('DELETE FROM posts WHERE id=$1', [id]);
  invalidate();
  return { success: true };
}
export async function saveProfile(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(100),
      handle: z.string().min(2).max(50),
      role: z.string().min(2).max(120),
      company: z.string().max(100),
      location: z.string().max(80),
      email: z.email(),
      github: socialLinksSchema.shape.github,
      linkedin: socialLinksSchema.shape.linkedin,
      youtube: socialLinksSchema.shape.youtube.optional(),
      instagram: socialLinksSchema.shape.instagram.optional(),
      x: socialLinksSchema.shape.x.optional(),
      bio: z.string().min(20).max(3000),
      availability: z.string().max(80),
      skills: z.array(z.string().max(50)).max(40),
    })
    .safeParse({
      ...Object.fromEntries(form),
      skills: String(form.get('skills') || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    });
  if (!parsed.success)
    return { error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(' ') };
  const previous: Profile = (await pool.query("SELECT value FROM settings WHERE key='profile'"))
    .rows[0].value;
  const author = articleAuthorSchema.safeParse({
    name: form.has('authorName') ? form.get('authorName') : previous.articleAuthor?.name || '',
    portrait: form.has('authorPortrait')
      ? form.get('authorPortrait')
      : previous.articleAuthor?.portrait || '',
  });
  if (!author.success)
    return { error: author.error.issues.map((issue) => issue.message).join(' ') };
  if (author.data.portrait) {
    const image = await pool.query('SELECT id FROM media WHERE id=$1', [
      author.data.portrait.slice(7),
    ]);
    if (!image.rowCount) return { error: 'Author photo not found. Please upload it again.' };
  }
  let experience;
  try {
    experience = z
      .array(
        z.object({
          role: z.string().min(1).max(120),
          company: z.string().min(1).max(120),
          dates: z.string().max(80),
          description: z.string().max(1000),
        }),
      )
      .max(20)
      .parse(JSON.parse(String(form.get('experience') || '[]')));
  } catch {
    return { error: 'Please check the experience entries.' };
  }
  const portrait = String(form.get('portrait') || '');
  if (!/^\/media\/[0-9a-f-]{36}$/.test(portrait) && portrait !== previous.portrait)
    return { error: 'Please use the portrait upload button.' };
  if (portrait.startsWith('/media/')) {
    const media = await pool.query('SELECT id FROM media WHERE id=$1', [portrait.split('/')[2]]);
    if (!media.rowCount) return { error: 'Portrait image not found.' };
  }
  await pool.query("UPDATE settings SET value=$1,updated_at=now() WHERE key='profile'", [
    JSON.stringify({
      ...previous,
      ...parsed.data,
      experience,
      portrait,
      articleAuthor: author.data,
    }),
  ]);
  invalidate();
  return { success: true };
}
export async function saveSocialLinks(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = socialLinksSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      error: parsed.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(' '),
    };
  try {
    const saved = await pool.query(
      "UPDATE settings SET value=value || $1::jsonb,updated_at=now() WHERE key='profile'",
      [JSON.stringify(parsed.data)],
    );
    if (!saved.rowCount)
      return { error: 'Your profile could not be found. Please refresh and try again.' };
    invalidate();
    return { success: true };
  } catch (error) {
    console.error('Social links save failed', error);
    return { error: 'Could not save your social links. Please try again.' };
  }
}
export async function saveSeo(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = z
    .object({
      title: z.string().min(5).max(100),
      description: z.string().min(20).max(170),
      googleVerification: z
        .string()
        .max(200)
        .regex(/^[a-zA-Z0-9_-]*$/, 'Paste only the verification token, not the whole HTML tag.'),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join(' ') };
  await pool.query("UPDATE settings SET value=$1,updated_at=now() WHERE key='seo'", [
    JSON.stringify(parsed.data),
  ]);
  invalidate();
  return { success: true };
}
