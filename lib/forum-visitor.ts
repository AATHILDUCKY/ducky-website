import 'server-only';
import { cookies } from 'next/headers';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
const cookieName = 'forum_visitor';
function signature(id: string) {
  return createHmac('sha256', process.env.SESSION_SECRET!)
    .update('forum-visitor:' + id)
    .digest('hex');
}
export async function forumVisitor(create = false): Promise<string | null> {
  const jar = await cookies();
  const [id, sig] = (jar.get(cookieName)?.value || '').split('.');
  if (
    id &&
    /^[0-9a-f-]{36}$/.test(id) &&
    sig &&
    /^[0-9a-f]{64}$/.test(sig) &&
    timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(signature(id), 'hex'))
  )
    return id;
  if (!create) return null;
  const next = randomUUID();
  jar.set(cookieName, `${next}.${signature(next)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
    maxAge: 31536000,
  });
  return next;
}
