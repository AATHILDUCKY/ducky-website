import '@/app/homepage-editor.css';
import { requireAdmin } from '@/lib/auth';
import { homepageSchema } from '@/lib/homepage-schema';
import { upgradeHomepage } from '@/lib/homepage-migration.mjs';
import { getHomepage } from '@/lib/homepage';
import { pool, getProfile, getPosts } from '@/lib/db';
import { getReference } from '@/lib/reference';
import { homepagePanelNames, type HomePanel } from '@/lib/homepage-editing';
import { homepageHashes } from '@/lib/homepage-revisions';
import { HomepageEditor } from '@/components/homepage-editor';
export const metadata = { title: 'Homepage editor' };
export default async function HomepagePage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const section: HomePanel =
    params.section && Object.hasOwn(homepagePanelNames, params.section)
      ? (params.section as HomePanel)
      : 'layout';
  const [stored, defaults, profile, reference, posts] = await Promise.all([
    pool.query(
      "SELECT value - 'projects' - 'freelance' AS value,updated_at::text AS revision FROM settings WHERE key='homepage'",
    ),
    getHomepage(),
    getProfile(),
    getReference(),
    getPosts(),
  ]);
  const row = stored.rows[0];
  const initial = homepageSchema.parse(upgradeHomepage(row?.value || defaults));
  return (
    <HomepageEditor
      key={section}
      initialPanel={section}
      posts={posts}
      initial={initial}
      initialHashes={homepageHashes(initial)}
      initialRevision={row?.revision || ''}
      profile={profile}
      icons={reference.icons}
    />
  );
}
