import type { HomepageSite } from '@/lib/homepage-schema';
import { brandFontStyle } from '@/lib/brand-fonts';

export function SignatureBrand({ branding }: { branding: HomepageSite['branding'] }) {
  const isOriginal = branding.name === 'AATHIL DUCKY';
  const logo =
    branding.logo === '/reference/ducky-badge.webp'
      ? '/brand/aathil-ducky-icon.webp'
      : branding.logo;
  return (
    <span className="signature-brand brand-art">
      {logo && (
        <img className="brand-duck" src={logo} alt={branding.logoAlt} width={48} height={48} />
      )}
      <span
        className="signature-wordmark brand-wordmark"
        style={brandFontStyle(branding.font, branding.fontWeight)}
      >
        {isOriginal ? (
          <>
            <span>AATHIL</span>
            <span>
              DUCKY<span className="signature-dot">.</span>
            </span>
          </>
        ) : (
          branding.name
        )}
      </span>
    </span>
  );
}
