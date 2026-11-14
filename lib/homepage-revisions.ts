import { createHash } from 'node:crypto';
import { z } from 'zod';
import { homepageEditableKeys, type HomepageHashes, type HomepageKey } from './homepage-editing';
import type { Homepage } from './homepage-schema';
export const homepageHashesSchema = z.record(
  z.enum(homepageEditableKeys),
  z.string().regex(/^[0-9a-f]{64}$/),
);
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function homepageHashes(data: Homepage): HomepageHashes {
  return Object.fromEntries(
    homepageEditableKeys.map((key) => [key, hash(data[key])]),
  ) as HomepageHashes;
}
/** Merge unrelated section edits; overlapping changes stay explicit instead of overwriting content. */
export function mergeHomepageChanges(
  current: Homepage,
  submitted: Homepage,
  expected: HomepageHashes,
) {
  const currentHashes = homepageHashes(current),
    submittedHashes = homepageHashes(submitted);
  const changed = homepageEditableKeys.filter((key) => submittedHashes[key] !== expected[key]);
  const conflicts = changed.filter(
    (key) => currentHashes[key] !== expected[key] && currentHashes[key] !== submittedHashes[key],
  );
  const next = structuredClone(current);
  if (!conflicts.length) for (const key of changed) Object.assign(next, { [key]: submitted[key] });
  return { data: next, conflicts: conflicts as HomepageKey[] };
}
