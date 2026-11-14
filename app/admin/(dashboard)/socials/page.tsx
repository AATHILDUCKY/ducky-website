import { getProfile } from '@/lib/db';
import { SocialLinksForm } from '@/components/social-links-form';
export const metadata = { title: 'Social links' };

export default async function SocialLinksPage() {
  const profile = await getProfile();
  return (
    <>
      <div className="admin-heading">
        <div>
          <span className="eyebrow">YOUR ONLINE PRESENCE</span>
          <h1>
            Connect your profiles<span className="accent">.</span>
          </h1>
          <p>Manage the social icons beneath your home-page illustration.</p>
        </div>
      </div>
      <SocialLinksForm profile={profile} />
    </>
  );
}
