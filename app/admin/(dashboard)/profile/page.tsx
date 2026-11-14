import { getProfile } from '@/lib/db';
import { ProfileForm } from '@/components/settings-forms';
export const metadata = { title: 'My profile' };
export default async function Profile() {
  const p = await getProfile();
  return (
    <>
      <div className="admin-heading">
        <div>
          <span className="eyebrow">THE PERSON BEHIND THE PIXELS</span>
          <h1>
            Make it yours<span className="accent">.</span>
          </h1>
          <p>Your story, your skills, and where to find you.</p>
        </div>
      </div>
      <ProfileForm profile={p} />
    </>
  );
}
