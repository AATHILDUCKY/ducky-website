'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, Menu, X, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
export function SiteHeader() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label="Aathilducky home">
        <span className="brand-mark">
          <ShieldCheck size={23} strokeWidth={1.8} />
        </span>
        <span>
          aathil<span className="muted">ducky</span>
          <span className="brand-dot">.</span>
        </span>
      </Link>
      <nav className={open ? 'site-nav open' : 'site-nav'} aria-label="Main navigation">
        {[
          ['/', 'Home'],
          ['/research', 'Research'],
          ['/blog', 'Writing'],
          ['/about', 'About'],
        ].map(([url, label]) => (
          <Link
            onClick={() => setOpen(false)}
            className={(url === '/' ? path === '/' : path.startsWith(url)) ? 'active' : ''}
            key={url}
            href={url}
          >
            {label}
          </Link>
        ))}
        <Link className="nav-contact" onClick={() => setOpen(false)} href="/contact">
          Let’s talk <ArrowUpRight size={16} />
        </Link>
      </nav>
      <button
        className="menu-button icon-button"
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
      >
        {open ? <X /> : <Menu />}
      </button>
    </header>
  );
}
