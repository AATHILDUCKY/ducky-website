'use client';
import Link from 'next/link';
import { useActionState } from 'react';
import { ArrowUpRight, Check, Save, Share2 } from 'lucide-react';
import { saveSocialLinks } from '@/app/admin/actions';
import { profileSocialLinks, type SocialProfile } from '@/lib/social-links';
import { SocialLinkFields } from './social-link-fields';

export function SocialLinksForm({ profile }: { profile: SocialProfile }) {
  const [state, action, pending] = useActionState(saveSocialLinks, {});
  return (
    <form
      action={action}
      className="admin-panel form-panel social-settings-form"
      aria-busy={pending}
    >
      <div className="panel-heading">
        <div>
          <h2>Social media profiles</h2>
          <p>Use the full URL for each profile. Leave a field blank to hide its icon.</p>
        </div>
        <Share2 size={24} aria-hidden="true" />
      </div>
      <SocialLinkFields links={profileSocialLinks(profile)} />
      <div className="settings-note">
        These links appear beneath your home-page illustration. Your email shortcut uses the address
        in <Link href="/admin/profile">My profile</Link>.
      </div>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="form-success" role="status">
          <Check size={17} aria-hidden="true" />
          Saved. Your social links have been updated.
        </p>
      )}
      <div className="social-settings-actions">
        <button type="submit" className="button button-dark" disabled={pending}>
          <Save size={17} aria-hidden="true" />
          {pending ? 'Saving…' : 'Save social links'}
        </button>
        <Link className="text-link" href="/" target="_blank" rel="noopener noreferrer">
          View website <ArrowUpRight size={17} aria-hidden="true" />
        </Link>
      </div>
    </form>
  );
}
