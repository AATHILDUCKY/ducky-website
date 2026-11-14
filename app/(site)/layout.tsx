import type { Viewport } from 'next';
import { ReferenceFrame } from '@/components/reference-frame';
import { getReference } from '@/lib/reference';
import { getHomepage } from '@/lib/homepage';
import './public-theme.css';
import './home-signature.css';
import './home-poster.css';
import './home-editorial.css';
import './home-night.css';
import './site-signature.css';
import './ads.css';
export const viewport: Viewport = { themeColor: '#090909', colorScheme: 'dark' };
export const revalidate = 3600;
export default async function Layout({ children }: { children: React.ReactNode }) {
  const [reference, homepage] = await Promise.all([getReference(), getHomepage()]);
  return (
    <ReferenceFrame
      icons={reference.icons}
      site={{
        branding: homepage.branding,
        navigation: homepage.navigation,
        footer: homepage.footer,
      }}
    >
      {children}
    </ReferenceFrame>
  );
}
