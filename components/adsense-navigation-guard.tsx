'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { adSlotId, isAdPage } from '@/lib/adsense';

export function AdSenseNavigationGuard() {
  const pathname = usePathname();
  const enabled = !!adSlotId(process.env.NEXT_PUBLIC_ADSENSE_DISPLAY_SLOT);
  const initialAdPage = useRef(isAdPage(pathname));

  useLayoutEffect(() => {
    // The two page types have different CSPs. Use a fresh document across that boundary,
    // including browser Back/Forward, so home cannot inherit vendor code or overlays.
    if (enabled && initialAdPage.current !== isAdPage(pathname)) {
      window.location.reload();
    }
  }, [enabled, pathname]);

  useEffect(() => {
    if (!enabled) return;
    const navigate = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (
        !(link instanceof HTMLAnchorElement) ||
        link.download ||
        (link.target && link.target !== '_self')
      )
        return;
      const url = new URL(link.href);
      if (url.origin !== window.location.origin || initialAdPage.current === isAdPage(url.pathname))
        return;
      event.preventDefault();
      event.stopPropagation();
      window.location.assign(url.href);
    };
    document.addEventListener('click', navigate, true);
    return () => document.removeEventListener('click', navigate, true);
  }, [enabled]);

  return null;
}
