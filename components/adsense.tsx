'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { ADSENSE_SCRIPT_URL } from '@/lib/adsense';
import { DisplayAd } from './display-ad';

export function AdSense() {
  const [nonce, setNonce] = useState<string>();
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // Client navigations must reuse the current document's CSP nonce.
    setNonce(document.querySelector<HTMLScriptElement>('script[nonce]')?.nonce);
  }, []);

  return (
    <>
      {nonce && (
        <Script
          id="google-adsense"
          src={ADSENSE_SCRIPT_URL}
          strategy="afterInteractive"
          async
          crossOrigin="anonymous"
          nonce={nonce}
          onReady={() => setReady(true)}
          onError={() => setFailed(true)}
        />
      )}
      <DisplayAd ready={ready} failed={failed} />
    </>
  );
}
