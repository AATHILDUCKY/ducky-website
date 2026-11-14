import type { HomepageSite } from '@/lib/homepage-schema';
import { brandFontStyle } from '@/lib/brand-fonts';
export function SiteBrand({ branding }: { branding: HomepageSite['branding'] }) {
  return (
    <span className="brand-art">
      {branding.logo && (
        <img
          className="brand-duck"
          src={branding.logo}
          alt={branding.logoAlt}
          width={36}
          height={36}
          decoding="async"
        />
      )}
      <span className="brand-wordmark" style={brandFontStyle(branding.font, branding.fontWeight)}>
        {branding.name}
      </span>
    </span>
  );
}
