import { HomepageSections } from '@/components/homepage-sections';
import { getHomepage } from '@/lib/homepage';
import { getProfile, getPosts, siteUrl } from '@/lib/db';
import { profileSocialLinks } from '@/lib/social-links';
// Compose fresh HTML after publishing while keeping the small PostgreSQL loaders cached.
export const dynamic = 'force-dynamic';
export const metadata = {
  title: { absolute: 'Aathil Ducky — Ethical Hacker, Security Engineer & Creator' },
  description:
    'Security research, practical tools, and things worth sharing. Explore Aathil Ducky’s work as an ethical hacker, security engineer, developer, and content creator.',
  alternates: { canonical: '/' },
  icons: { icon: '/brand/aathil-ducky-icon.webp', apple: '/brand/aathil-ducky-icon.webp' },
};
export const viewport = { themeColor: '#ffda00', colorScheme: 'light' };
export default async function Home() {
  const [p, homepage, posts] = await Promise.all([getProfile(), getHomepage(), getPosts()]);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Person',
            name: p.name,
            alternateName: p.handle,
            url: siteUrl(),
            jobTitle: p.role,
            sameAs: Object.values(profileSocialLinks(p)).filter(Boolean),
            image:
              homepage.hero.portrait.visible && homepage.hero.portrait.src
                ? new URL(homepage.hero.portrait.src, siteUrl()).href
                : undefined,
          }).replace(/</g, '\\u003c'),
        }}
      />
      <HomepageSections data={homepage} availability={p.availability} posts={posts} profile={p} />
    </>
  );
}
