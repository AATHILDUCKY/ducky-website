export const SITEMAP_SHARD_SIZE = 10000;
export const publicPaths = ['', '/about', '/research', '/tools', '/blog', '/forum', '/contact'];
export function xmlEscape(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!,
  );
}
export function sitemapIndex(urls: (string | { url: string; modified?: Date | string | null })[]) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls
    .map((value) => {
      const entry = typeof value === 'string' ? { url: value } : value;
      return `<sitemap><loc>${xmlEscape(entry.url)}</loc>${entry.modified ? `<lastmod>${new Date(entry.modified).toISOString()}</lastmod>` : ''}</sitemap>`;
    })
    .join('')}</sitemapindex>`;
}
export function sitemapUrls(
  entries: { url: string; modified?: Date | string; images?: string[] }[],
) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${entries.map((entry) => `<url><loc>${xmlEscape(entry.url)}</loc>${entry.modified ? `<lastmod>${new Date(entry.modified).toISOString()}</lastmod>` : ''}${(entry.images || []).map((image) => `<image:image><image:loc>${xmlEscape(image)}</image:loc></image:image>`).join('')}</url>`).join('')}</urlset>`;
}
export const sitemapHeaders = {
  'Content-Type': 'application/xml; charset=utf-8',
  'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=60',
  'X-Content-Type-Options': 'nosniff',
};
