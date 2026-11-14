'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Inbox,
  LayoutDashboard,
  PanelsTopLeft,
  FileText,
  UserRound,
  ChartNoAxesCombined,
  ArrowUpRight,
  LogOut,
  Menu,
  X,
  Plus,
  Feather,
  Share2,
  MessagesSquare,
} from 'lucide-react';
import { SiteBrand } from './site-brand';
import type { HomepageSite } from '@/lib/homepage-schema';
import { logout } from '@/app/admin/actions';
export function AdminShell({
  children,
  name,
  newRequests = 0,
  branding,
}: {
  children: React.ReactNode;
  name: string;
  newRequests?: number;
  branding: HomepageSite['branding'];
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const links = [
    ['/admin', 'Overview', LayoutDashboard],
    ['/admin/homepage', 'Homepage', PanelsTopLeft],
    ['/admin/posts', 'Writeups', FileText],
    ['/admin/forum', 'Forum', MessagesSquare],
    ['/admin/requests', 'Contact requests', Inbox],
    ['/admin/profile', 'My profile', UserRound],
    ['/admin/socials', 'Social links', Share2],
    ['/admin/seo', 'Search & SEO', ChartNoAxesCombined],
  ] as const;
  return (
    <div className="admin-shell">
      <aside className={open ? 'admin-sidebar open' : 'admin-sidebar'}>
        <Link className="admin-brand" href="/admin">
          <span className="admin-brand-mark">
            <SiteBrand branding={branding} />
          </span>
          <small>THE STUDIO</small>
        </Link>
        <Link
          className="admin-brand-edit"
          href="/admin/homepage?section=branding"
          onClick={() => setOpen(false)}
        >
          Edit logo & fonts
        </Link>
        <button
          className="sidebar-close icon-button"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        >
          <X size={20} />
        </button>
        <Link
          className="button button-dark new-post"
          href="/admin/posts/new"
          onClick={() => setOpen(false)}
        >
          <Plus size={17} /> Write something
        </Link>
        <span className="sidebar-caption">YOUR WORKSPACE</span>
        <nav aria-label="Admin navigation">
          {links.map(([url, label, Icon]) => (
            <Link
              key={url}
              onClick={() => setOpen(false)}
              href={url}
              className={(url === '/admin' ? path === url : path.startsWith(url)) ? 'active' : ''}
            >
              <Icon size={18} />
              {label}
              {url === '/admin/requests' && newRequests > 0 && (
                <span className="inbox-nav-count" aria-label={`${newRequests} new requests`}>
                  {newRequests > 99 ? '99+' : newRequests}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Feather size={22} />
            <p>
              A little progress,
              <br />
              every day.
            </p>
          </div>
          <Link href="/" target="_blank">
            Visit your website <ArrowUpRight size={16} />
          </Link>
          <form action={logout}>
            <button>
              <LogOut size={17} /> Sign out
            </button>
          </form>
          <div className="admin-user">
            <span>
              {name
                .split(' ')
                .map((s) => s[0])
                .join('')
                .slice(0, 2)}
            </span>
            <div>
              <strong>{name}</strong>
              <small>Administrator</small>
            </div>
            <i className="status-dot" />
          </div>
        </div>
      </aside>
      {open && (
        <button
          className="sidebar-backdrop"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="admin-workspace">
        <header className="admin-topbar">
          <button
            className="menu-button icon-button"
            aria-label="Open navigation"
            onClick={() => setOpen(true)}
          >
            <Menu size={20} />
          </button>
          <span>
            Your space to create<span className="accent">.</span>
          </span>
          <Link href="/" target="_blank">
            View website <ArrowUpRight size={14} />
          </Link>
        </header>
        <main id="main" className="admin-content">
          {children}
        </main>
        <footer className="admin-footer">
          Made for meaningful work. <span>Aathilducky Studio</span>
        </footer>
      </div>
    </div>
  );
}
