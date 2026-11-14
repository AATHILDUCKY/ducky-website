import { headers } from 'next/headers';
import { DisplayAd } from './display-ad';
import { adSlotId } from '@/lib/adsense';

export async function PageAd({
  contained = false,
  show = true,
}: {
  contained?: boolean;
  show?: boolean;
}) {
  if (!adSlotId(process.env.NEXT_PUBLIC_ADSENSE_DISPLAY_SLOT)) return null;
  // Ad pages render per request so Next can nonce its framework scripts. Content queries
  // keep their existing data cache; the home page keeps its existing rendering strategy.
  await headers();
  if (!show) return null;
  return contained ? (
    <div className="container">
      <DisplayAd />
    </div>
  ) : (
    <DisplayAd />
  );
}
