import 'server-only';
import { createHash } from 'node:crypto';
import { sitemapHeaders } from './sitemap-xml';
export function sitemapResponse(request: Request, xml: string) {
  const etag = '"' + createHash('sha256').update(xml).digest('base64url') + '"';
  const headers = { ...sitemapHeaders, ETag: etag };
  const match = request.headers.get('if-none-match');
  if (
    match
      ?.split(',')
      .some((value) => value.trim().replace(/^W\//, '') === etag || value.trim() === '*')
  )
    return new Response(null, { status: 304, headers });
  return new Response(xml, { headers });
}
