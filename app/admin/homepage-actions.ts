'use server';
import { pool } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { homepageSchema, type HomepageSaveResult } from '@/lib/homepage-schema';
import { upgradeHomepage } from '@/lib/homepage-migration.mjs';
import {
  homepageHashes,
  homepageHashesSchema,
  mergeHomepageChanges,
} from '@/lib/homepage-revisions';
import { homepagePanelNames, panelForHomeField } from '@/lib/homepage-editing';
import { revalidatePath, updateTag } from 'next/cache';
import type { PoolClient } from 'pg';
export async function saveHomepage(
  raw: unknown,
  revision: string,
  expectedHashes?: unknown,
): Promise<HomepageSaveResult> {
  await requireAdmin();
  const result = homepageSchema.safeParse(raw);
  if (!result.success)
    return {
      error: 'Please check the highlighted fields.',
      fields: Object.fromEntries(
        result.error.issues.map((issue) => [issue.path.join('.'), issue.message]),
      ),
    };
  if (typeof revision !== 'string' || revision.length > 100)
    return { error: 'This editor version is invalid. Reload the page.' };
  const expected =
    expectedHashes === undefined ? undefined : homepageHashesSchema.safeParse(expectedHashes);
  if (expected && !expected.success)
    return {
      error: 'This editor version is invalid. Your draft is still here. Reload the editor.',
    };
  let db: PoolClient | undefined;
  try {
    db = await pool.connect();
    await db.query('BEGIN');
    const row = (
      await db.query(
        "SELECT value - 'projects' - 'freelance' AS value,updated_at::text AS revision FROM settings WHERE key='homepage' FOR UPDATE",
      )
    ).rows[0];
    let data = result.data,
      merged = false;
    if (row && row.revision !== revision) {
      if (!expected?.success) {
        await db.query('ROLLBACK');
        return {
          conflict: true,
          error:
            'This homepage was saved in another tab. Reload the editor to review that version before saving again.',
        };
      }
      const merge = mergeHomepageChanges(
        homepageSchema.parse(upgradeHomepage(row.value)),
        data,
        expected.data,
      );
      if (merge.conflicts.length) {
        await db.query('ROLLBACK');
        const sections = [
          ...new Set(merge.conflicts.map((key) => homepagePanelNames[panelForHomeField(key)])),
        ];
        return {
          conflict: true,
          error: `This homepage was saved in another tab. Both versions changed ${sections.join(', ')}. Your edits are still here; reload to review the saved version before saving again.`,
        };
      }
      data = merge.data;
      merged = true;
    } else if (!row && revision) {
      await db.query('ROLLBACK');
      return {
        conflict: true,
        error: 'The saved homepage changed. Reload the editor to review the latest version.',
      };
    }
    const mediaIds = [data.branding.logo, data.hero.portrait.src]
      .filter((src) => src.startsWith('/media/'))
      .map((src) => src.slice(7));
    if (mediaIds.length) {
      const media = await db.query('SELECT id FROM media WHERE id=ANY($1::uuid[])', [mediaIds]);
      if (new Set(media.rows.map((item) => item.id)).size !== new Set(mediaIds).size) {
        await db.query('ROLLBACK');
        return { error: 'An uploaded image could not be found. Please upload it again.' };
      }
    }
    const json = JSON.stringify(data);
    if (Buffer.byteLength(json) > 400000) {
      await db.query('ROLLBACK');
      return { error: 'The homepage is too large. Please shorten the longest sections.' };
    }
    // Merge active fields so retired section data stays archived in existing records.
    const saved = row
      ? await db.query(
          "UPDATE settings SET value=value || $1::jsonb,updated_at=clock_timestamp() WHERE key='homepage' RETURNING updated_at::text AS revision",
          [json],
        )
      : await db.query(
          "INSERT INTO settings(key,value) VALUES('homepage',$1) ON CONFLICT(key) DO NOTHING RETURNING updated_at::text AS revision",
          [json],
        );
    if (!saved.rowCount) {
      await db.query('ROLLBACK');
      return {
        conflict: true,
        error:
          'This homepage was saved in another tab. Reload the editor to review the saved version.',
      };
    }
    await db.query('COMMIT');
    updateTag('content');
    revalidatePath('/', 'layout');
    return {
      success: true,
      homepage: data,
      hashes: homepageHashes(data),
      revision: saved.rows[0].revision,
      merged,
    };
  } catch (error) {
    if (db) await db.query('ROLLBACK').catch(() => {});
    console.error('Homepage save failed:', error);
    return {
      error: 'Could not save the homepage. Your changes are still in the editor. Please try again.',
    };
  } finally {
    db?.release();
  }
}
