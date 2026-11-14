'use client';
import { IMAGE_ACCEPT } from '@/lib/image-upload';
import { useActionState, useState, useRef } from 'react';
import { Check, Save, Upload, Loader2, Plus, Trash2 } from 'lucide-react';
import { saveProfile, saveSeo } from '@/app/admin/actions';
import { ArticleAuthorSettings } from './article-author-settings';
import { SocialLinkFields } from './social-link-fields';
import { profileSocialLinks } from '@/lib/social-links';
import type { Profile, SeoSettings } from '@/lib/types';
function Feedback({ state }: { state: { error?: string; success?: boolean } }) {
  return (
    <>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="form-success" role="status">
          <Check size={16} />
          Saved. Your website has been updated.
        </p>
      )}
    </>
  );
}
export function ProfileForm({ profile: p }: { profile: Profile }) {
  const [state, action, pending] = useActionState(saveProfile, {});
  const [portrait, setPortrait] = useState(p.portrait);
  const [uploading, setUploading] = useState(false);
  const [authorUploading, setAuthorUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const [experience, setExperience] = useState(p.experience);
  return (
    <form action={action} className="settings-form profile-settings-form">
      <div className="profile-save-bar">
        <strong>Profile settings</strong>
        <Feedback state={state} />{' '}
        <button className="button button-dark" disabled={pending || uploading || authorUploading}>
          <Save size={16} />
          {pending ? 'Saving…' : 'Save profile'}
        </button>
      </div>
      <ArticleAuthorSettings
        defaultName={p.name}
        profilePortrait={portrait}
        author={p.articleAuthor}
        onUploading={setAuthorUploading}
      />
      <section className="admin-panel form-panel">
        <div className="panel-heading">
          <div>
            <h2>The essentials</h2>
            <p>The person visitors get to know.</p>
          </div>
        </div>
        <div className="profile-upload">
          <img src={portrait} alt="Profile portrait" width={80} height={80} />
          <div>
            <button
              type="button"
              className="button button-small"
              disabled={uploading}
              onClick={() => fileInput.current?.click()}
            >
              {uploading ? <Loader2 size={15} className="spin" /> : <Upload size={15} />}Change
              portrait
            </button>
            <small>Optimized to WebP, under 50 KB.</small>
          </div>
          <input type="hidden" name="portrait" value={portrait} />
          <input
            type="file"
            accept={IMAGE_ACCEPT}
            className="sr-only"
            ref={fileInput}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setUploading(true);
              setUploadError('');
              try {
                const form = new FormData();
                form.set('file', file);
                form.set('alt', p.name);
                const r = await fetch('/api/upload', { method: 'POST', body: form });
                const result = await r.json();
                if (!r.ok) throw new Error(result.error);
                setPortrait(result.url);
              } catch (e) {
                setUploadError((e as Error).message);
              } finally {
                setUploading(false);
              }
            }}
          />
        </div>
        {uploadError && (
          <p className="form-error" role="alert">
            {uploadError}
          </p>
        )}
        <div className="form-grid">
          {[
            ['name', 'Full name', p.name],
            ['handle', 'Handle', p.handle],
            ['role', 'What you do', p.role],
            ['company', 'Company', p.company],
            ['location', 'Location', p.location],
            ['availability', 'Availability label', p.availability],
          ].map(([name, label, value]) => (
            <label key={name}>
              {label}
              <input
                name={name}
                defaultValue={value}
                required={['name', 'handle', 'role'].includes(name)}
                maxLength={120}
              />
            </label>
          ))}
        </div>
        <label>
          A little about you
          <textarea name="bio" defaultValue={p.bio} rows={5} required maxLength={3000} />
        </label>
        <label>
          Your toolkit
          <input name="skills" defaultValue={p.skills.join(', ')} maxLength={2000} />
          <small>Separate technologies and skills with commas.</small>
        </label>
      </section>
      <section className="admin-panel form-panel">
        <h2>Social links</h2>
        <p className="muted">Leave a social URL blank to hide its icon on your home page.</p>
        <SocialLinkFields links={profileSocialLinks(p)} />
        <div className="form-grid">
          <label>
            Email
            <input name="email" type="email" defaultValue={p.email} required />
          </label>
        </div>
      </section>
      <section className="admin-panel form-panel">
        <h2>Your experience</h2>
        <p className="muted">The steps that brought you here.</p>
        <input type="hidden" name="experience" value={JSON.stringify(experience)} />
        {experience.map((e, i) => (
          <div className="experience-form" key={i}>
            <div className="form-grid">
              {(['role', 'company', 'dates'] as const).map((field) => (
                <label key={field}>
                  {field === 'dates' ? 'Dates' : field === 'role' ? 'Role' : 'Company'}
                  <input
                    value={e[field]}
                    onChange={(event) =>
                      setExperience((list) =>
                        list.map((x, n) => (n === i ? { ...x, [field]: event.target.value } : x)),
                      )
                    }
                    required
                    maxLength={120}
                  />
                </label>
              ))}
            </div>
            <label>
              Description
              <textarea
                rows={2}
                value={e.description}
                maxLength={1000}
                onChange={(event) =>
                  setExperience((list) =>
                    list.map((x, n) => (n === i ? { ...x, description: event.target.value } : x)),
                  )
                }
              />
            </label>
            <button
              type="button"
              className="text-link danger-text"
              onClick={() => setExperience((list) => list.filter((_, n) => n !== i))}
            >
              <Trash2 size={14} />
              Remove entry
            </button>
          </div>
        ))}
        <button
          type="button"
          className="button button-small"
          onClick={() =>
            setExperience((list) => [
              ...list,
              { role: '', company: '', dates: '', description: '' },
            ])
          }
        >
          <Plus size={15} />
          Add experience
        </button>
      </section>
    </form>
  );
}
export function SeoForm({ seo, baseUrl }: { seo: SeoSettings; baseUrl: string }) {
  const [state, action, pending] = useActionState(saveSeo, {});
  return (
    <form action={action} className="admin-panel form-panel">
      <h2>Your site in search</h2>
      <p className="muted">Clear words help the right people find you.</p>
      <Feedback state={state} />
      <label>
        Homepage title
        <input name="title" defaultValue={seo.title} required maxLength={100} />
        <small>Keep your name and your main focus near the beginning.</small>
      </label>
      <label>
        Homepage description
        <textarea
          name="description"
          defaultValue={seo.description}
          required
          maxLength={170}
          rows={3}
        />
      </label>
      <label>
        Google verification token
        <input
          name="googleVerification"
          defaultValue={seo.googleVerification}
          placeholder="The content value from Google’s verification tag"
          maxLength={200}
        />
        <small>
          For a URL-prefix property, choose “HTML tag” and paste only the content value here.
        </small>
      </label>
      <div className="settings-note">
        Your canonical domain is <strong>{baseUrl}</strong>. Set SITE_URL in .env and restart after
        connecting your production domain.
      </div>
      <button className="button button-dark" disabled={pending}>
        <Save size={16} />
        {pending ? 'Saving…' : 'Save SEO settings'}
      </button>
    </form>
  );
}
