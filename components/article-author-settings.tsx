'use client';
import { IMAGE_ACCEPT } from '@/lib/image-upload';
import { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { AuthorAvatar } from './author-avatar';
export function ArticleAuthorSettings({
  defaultName,
  profilePortrait,
  author,
  onUploading,
}: {
  defaultName: string;
  profilePortrait: string;
  author?: { name: string; portrait: string };
  onUploading: (busy: boolean) => void;
}) {
  const [name, setName] = useState(author?.name || '');
  const [portrait, setPortrait] = useState(author?.portrait || '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  return (
    <section
      className="admin-panel form-panel article-author-settings"
      aria-labelledby="article-author-settings-title"
    >
      <div className="panel-heading">
        <div>
          <h2 id="article-author-settings-title">Article author</h2>
          <p>The name and photo shown on every writeup.</p>
        </div>
      </div>
      <div className="article-author-preview">
        <AuthorAvatar name={name.trim() || defaultName} portrait={portrait || profilePortrait} />
        <div>
          <strong>{name.trim() || defaultName}</strong>
          <span>Author preview</span>
        </div>
      </div>
      <label>
        Author display name
        <input
          name="authorName"
          aria-label="Author display name"
          aria-describedby="author-name-help"
          autoComplete="off"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={defaultName}
          maxLength={100}
        />
        <small id="author-name-help">
          Leave blank to use your full name from the profile below.
        </small>
      </label>
      <div className="article-author-photo-actions">
        <button
          type="button"
          className="button button-small"
          disabled={uploading}
          onClick={() => input.current?.click()}
        >
          {uploading ? <Loader2 size={16} className="spin" /> : <Upload size={16} />}{' '}
          {uploading ? 'Uploading…' : 'Upload author photo'}
        </button>
        {portrait && (
          <button
            type="button"
            className="button button-small"
            disabled={uploading}
            onClick={() => {
              setPortrait('');
              setError('');
            }}
          >
            Use profile photo
          </button>
        )}
      </div>
      <input type="hidden" name="authorPortrait" value={portrait} />
      <input
        ref={input}
        aria-label="Author photo file"
        type="file"
        accept={IMAGE_ACCEPT}
        className="sr-only"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setUploading(true);
          onUploading(true);
          setError('');
          try {
            const data = new FormData();
            data.set('file', file);
            data.set('alt', name.trim() || defaultName);
            const response = await fetch('/api/upload', { method: 'POST', body: data });
            const result = await response.json();
            if (!response.ok) throw Error(result.error || 'Could not upload this photo.');
            setPortrait(result.url);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not upload this photo.');
          } finally {
            setUploading(false);
            onUploading(false);
            e.target.value = '';
          }
        }}
      />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <small>
        Uses your profile photo unless you upload a different one. Images are optimized to WebP
        under 50 KB. Save profile to publish these changes to every article.
      </small>
    </section>
  );
}
