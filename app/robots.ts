import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/db';
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/shop/checkout'] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
