'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ADSENSE_CLIENT, adSlotId, isAdPage } from '@/lib/adsense';

declare global {
  interface Window {
    adsbygoogle?: { push: (request: Record<string, never>) => unknown };
  }
}

export function DisplayAd({ ready, failed }: { ready: boolean; failed: boolean }) {
  const pathname = usePathname();
  const slot = adSlotId(process.env.NEXT_PUBLIC_ADSENSE_DISPLAY_SLOT);
  if (!slot || !isAdPage(pathname)) return null;
  return <AdPlacement key={pathname} slot={slot} ready={ready} failed={failed} />;
}

function AdPlacement({ slot, ready, failed }: { slot: string; ready: boolean; failed: boolean }) {
  const unit = useRef<HTMLModElement>(null);
  const requested = useRef(false);
  const [nearby, setNearby] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const element = unit.current;
    if (!element) return;
    if (!('IntersectionObserver' in window)) {
      setNearby(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNearby(true);
          observer.disconnect();
        }
      },
      { rootMargin: '240px 0px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = unit.current;
    if (!nearby || !ready || failed || !element || requested.current) return;
    // AdSense must see a visible, sized unit, and each element may be requested only once.
    const request = () => {
      if (!element.isConnected || element.getBoundingClientRect().width <= 0) return;
      if (requested.current || element.hasAttribute('data-adsbygoogle-status')) return;
      requested.current = true;
      try {
        window.adsbygoogle ||= [] as Record<string, never>[];
        window.adsbygoogle.push({});
      } catch {
        setUnavailable(true);
      }
    };
    const observer = new ResizeObserver(request);
    observer.observe(element);
    request();
    return () => observer.disconnect();
  }, [nearby, ready, failed]);

  useEffect(() => {
    const element = unit.current;
    if (!element) return;
    const observer = new MutationObserver(() => {
      if (element.dataset.adStatus === 'unfilled') setUnavailable(true);
    });
    observer.observe(element, { attributes: true, attributeFilter: ['data-ad-status'] });
    return () => observer.disconnect();
  }, []);

  return (
    <aside className="display-ad" aria-label="Advertisement" hidden={unavailable || failed}>
      <span className="display-ad-label">Advertisement</span>
      <div className="display-ad-space">
        <ins
          ref={unit}
          className="adsbygoogle ducky_display_ad"
          style={{ display: 'block' }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={slot}
        />
      </div>
    </aside>
  );
}
