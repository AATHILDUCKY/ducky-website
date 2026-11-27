import { headers } from 'next/headers';
import { AdSense } from './adsense';

export async function PageAd({
  contained = false,
  show = true,
}: {
  contained?: boolean;
  show?: boolean;
}) {
  // Ad pages render per request so Next can nonce its framework scripts. Content queries
  // keep their existing data cache; the home page keeps its existing rendering strategy.
  await headers();
  if (!show) return null;
  return contained ? (
    <div className="container">
      <AdSense />
    </div>
  ) : (
    <AdSense />
  );
}
