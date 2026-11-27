import { randomBytes } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { isAdPage } from './lib/adsense';
import { adsenseContentSecurityPolicy } from './lib/content-security-policy';

export function proxy(request: NextRequest) {
  if (!isAdPage(request.nextUrl.pathname)) return NextResponse.next();

  const nonce = randomBytes(16).toString('base64');
  const policy = adsenseContentSecurityPolicy(process.env.NODE_ENV === 'development', nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('Content-Security-Policy', policy);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', policy);
  // A cached HTML response must never reuse another request's nonce.
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export const config = {
  matcher: ['/about', '/tools', '/contact', '/research', '/blog/:path*', '/forum/:path*'],
};
