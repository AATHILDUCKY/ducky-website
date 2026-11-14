import { getSitemapXml } from '@/lib/sitemaps';
import { sitemapResponse } from '@/lib/sitemap-response';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, { params }: { params: Promise<{ file: string }> }) {
  const xml = await getSitemapXml((await params).file);
  return xml ? sitemapResponse(request, xml) : new Response('Sitemap not found', { status: 404 });
}
