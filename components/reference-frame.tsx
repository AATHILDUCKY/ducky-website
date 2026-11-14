'use client';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { SignatureBrand } from './signature-brand';
import type { HomepageSite } from '@/lib/homepage-schema';
function Icon({ name }: { name: string }) {
  return (
    <svg className="icon" aria-hidden="true">
      <use href={`#i-${name}`} />
    </svg>
  );
}
export function ReferenceFrame({
  children,
  icons,
  site,
  preview = false,
}: {
  children: React.ReactNode;
  icons: string;
  site: HomepageSite;
  preview?: boolean;
}) {
  const routePath = usePathname();
  const pathname = preview ? '/' : routePath;
  const links = site.navigation.items.some((item) => item.href === '/forum')
    ? site.navigation.items
    : [...site.navigation.items, { id: 'nav-forum', href: '/forum', label: 'Forum' }];
  const mobileLinks = site.navigation.contact.enabled
    ? [
        ...links,
        {
          id: 'header-contact',
          label: site.navigation.contact.label,
          href: site.navigation.contact.href,
        },
      ]
    : links;
  const isActive = (url: string) => {
    const path = url.split(/[?#]/)[0];
    return path === '/'
      ? pathname === '/'
      : !!path && (pathname === path || pathname.startsWith(`${path}/`));
  };
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const referencePages = ['/', '/about', '/tools', '/contact'];
  const isReference = referencePages.includes(pathname);
  const page = pathname === '/' ? 'home' : pathname.split('/')[1];
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, []);
  return (
    <div className="reference-site public-site" data-page={page} id="top" ref={root}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="icon-sprite" aria-hidden="true" dangerouslySetInnerHTML={{ __html: icons }} />
      <header className="site-header">
        <div className="container header-inner">
          <Link aria-label={site.branding.homeLabel} className="brand" href="/">
            <SignatureBrand branding={site.branding} />
          </Link>
          <nav className="desktop-nav" aria-label="Main navigation">
            {links.map(({ id, href: url, label }) => (
              <Link key={id} href={url} aria-current={isActive(url) ? 'page' : undefined}>
                {label}
              </Link>
            ))}
          </nav>
          {site.navigation.contact.enabled && (
            <Link
              className="header-contact"
              href={site.navigation.contact.href}
              aria-current={isActive(site.navigation.contact.href) ? 'page' : undefined}
            >
              {site.navigation.contact.label}
              <Icon name="arrow" />
            </Link>
          )}
          <button
            aria-controls="mobile-nav"
            aria-expanded={open}
            aria-label={open ? 'Close navigation' : 'Open navigation'}
            className="menu-toggle"
            id="menu-toggle"
            type="button"
            onClick={() => setOpen((v) => !v)}
          >
            <Icon name={open ? 'close' : 'menu'} />
          </button>
        </div>
        <nav className="mobile-nav" id="mobile-nav" aria-label="Mobile navigation" hidden={!open}>
          {mobileLinks.map(({ id, href: url, label }) => (
            <Link
              key={id}
              href={url}
              aria-current={isActive(url) ? 'page' : undefined}
              onClick={() => setOpen(false)}
            >
              {label}
              <Icon name="arrow" />
            </Link>
          ))}
        </nav>
      </header>
      <main id="main">
        {isReference ? (
          children
        ) : (
          <div className="container app-theme supplemental-page">{children}</div>
        )}
      </main>
      {page !== 'forum' && (
        <footer className="site-footer container">
          <div className="footer-statement" aria-hidden="true">
            <span>STAY</span>
            <span>CURIOUS.</span>
            <Icon name="arrow" />
          </div>
          <div className="footer-inner">
            <div>
              <Link className="brand" href="/" aria-label={site.branding.homeLabel}>
                <SignatureBrand branding={site.branding} />
              </Link>
              <p>{site.footer.copyright.replaceAll('{year}', String(new Date().getFullYear()))}</p>
            </div>
            <nav className="footer-pages" aria-label="Footer navigation">
              {(site.footer.links.some((item) => item.href === '/forum')
                ? site.footer.links
                : [...site.footer.links, { id: 'footer-forum', href: '/forum', label: 'Forum' }]
              ).map(({ id, href: url, label }) => (
                <Link key={id} href={url} aria-current={isActive(url) ? 'page' : undefined}>
                  {label}
                </Link>
              ))}
            </nav>
            {site.footer.showBackToTop && (
              <a className="footer-top" href="#top">
                {site.footer.backToTop}
                <Icon name="up" />
              </a>
            )}
          </div>
        </footer>
      )}
    </div>
  );
}
