'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

export function GoogleAnalytics() {
  const [nonce, setNonce] = useState<string | null>(null);
  useEffect(() => {
    setNonce(document.querySelector<HTMLScriptElement>('script[nonce]')?.nonce || '');
  }, []);
  if (nonce === null) return null;
  return (
    <>
      <Script id="google-analytics-init" strategy="afterInteractive" nonce={nonce || undefined}>
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-V9CT08E8JJ');
        `}
      </Script>
      <Script
        id="google-analytics"
        src="https://www.googletagmanager.com/gtag/js?id=G-V9CT08E8JJ"
        strategy="afterInteractive"
        nonce={nonce || undefined}
      />
    </>
  );
}
