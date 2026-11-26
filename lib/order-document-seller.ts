import 'server-only';
import { cache } from 'react';
import { getProfile, siteUrl } from './db';
import { getHomepage } from './homepage';
import type { DocumentSeller } from './order-document-model';
export const getDocumentSeller = cache(async (): Promise<DocumentSeller> => {
  const [profile, homepage] = await Promise.all([getProfile(), getHomepage()]);
  const url = new URL(siteUrl());
  const local = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]'].includes(url.hostname);
  return {
    name: profile.name,
    email: profile.email,
    location: profile.location || undefined,
    storeName: homepage.branding.name,
    website: local ? undefined : url.origin,
  };
});
