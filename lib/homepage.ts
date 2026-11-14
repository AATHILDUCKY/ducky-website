import 'server-only';
import { upgradeHomepage } from './homepage-migration.mjs';
import { unstable_cache } from 'next/cache';
import { pool, getProfile } from './db';
import { getReference } from './reference';
import { contentVersion } from './content-version';
import { createHomepageDefaults } from './homepage-defaults.mjs';
import { homepageSchema, type Homepage } from './homepage-schema';
import { landingHomepage } from './homepage-art-direction';
export const getHomepage = unstable_cache(
  async (): Promise<Homepage> => {
    const stored = (
      await pool.query(
        "SELECT value - 'projects' - 'freelance' AS value FROM settings WHERE key='homepage'",
      )
    ).rows[0];
    if (stored) return landingHomepage(homepageSchema.parse(upgradeHomepage(stored.value)));
    const [profile, reference] = await Promise.all([getProfile(), getReference()]);
    return landingHomepage(homepageSchema.parse(createHomepageDefaults(profile, reference)));
  },
  ['homepage-v3-editorial-home', contentVersion],
  { tags: ['content'], revalidate: 3600 },
);
