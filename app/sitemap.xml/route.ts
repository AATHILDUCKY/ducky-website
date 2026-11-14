import { getSitemapFiles } from '@/lib/sitemaps';
import { siteUrl } from '@/lib/db';
import { sitemapIndex } from '@/lib/sitemap-xml';
import { sitemapResponse } from '@/lib/sitemap-response';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const files = await getSitemapFiles();
  return sitemapResponse(
    request,
    sitemapIndex(
      files.map((entry) => ({
        url: `${siteUrl()}/sitemaps/${entry.file}`,
        modified: entry.modified,
      })),
    ),
  );
}
