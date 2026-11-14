import 'server-only';
import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual, createHash } from 'node:crypto';
import { redirect } from 'next/navigation';
const cookieName = 'ducky_session';
export function secureEqual(a: string, b: string) {
  return timingSafeEqual(
    createHash('sha256').update(a).digest(),
    createHash('sha256').update(b).digest(),
  );
}
function sign(value: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32)
    throw new Error('SESSION_SECRET must contain at least 32 characters.');
  return createHmac('sha256', secret)
    .update(`${value}:${process.env.ADMIN_USERNAME}:${process.env.ADMIN_PASSWORD}`)
    .digest('base64url');
}
export async function isAdmin() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return false;
  const [expiry, signature] = token.split('.');
  return (
    !!signature &&
    /^\d+$/.test(expiry) &&
    Number(expiry) > Date.now() &&
    Number(expiry) < Date.now() + 86401000 &&
    secureEqual(signature, sign(expiry))
  );
}
export async function requireAdmin() {
  if (!(await isAdmin())) redirect('/admin/login');
}
export async function setSession() {
  const expiry = String(Date.now() + 86400000);
  (await cookies()).set(cookieName, `${expiry}.${sign(expiry)}`, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax',
    path: '/',
    maxAge: 86400,
  });
}
export async function clearSession() {
  (await cookies()).delete(cookieName);
}
