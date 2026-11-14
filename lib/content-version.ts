import 'server-only';
import { createHash } from 'node:crypto';
import reference from '@/reference/site.json';
// Imported template changes get fresh content caches across production rebuilds.
export const contentVersion = createHash('sha256')
  .update(JSON.stringify(reference))
  .digest('hex')
  .slice(0, 16);
