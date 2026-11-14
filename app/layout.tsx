import type { Metadata, Viewport } from 'next';
import './globals.css';
import './reference.css';
import './polish.css';
import './code.css';
import './theme.css';
import './spacing.css';
import './home-landing.css';
import './mobile.css';
import { getSeo, siteUrl } from '@/lib/db';
export const viewport: Viewport = { themeColor: '#F8F9FB', colorScheme: 'light' };
export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeo();
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: seo.title, template: '%s · Aathilducky' },
    description: seo.description,
    openGraph: {
      title: seo.title,
      description: seo.description,
      siteName: 'Aathilducky',
      type: 'website',
      locale: 'en_US',
      images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image' },
    verification: { google: seo.googleVerification || undefined },
    alternates: { types: { 'application/rss+xml': '/feed.xml' } },
    robots: { index: true, follow: true },
    icons: { icon: '/reference/favicon.png', apple: '/reference/ducky-badge.webp' },
  };
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" data-scroll-behavior="smooth" suppressHydrationWarning>
      {/* Extensions can inject attributes on html and body before React hydrates. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
