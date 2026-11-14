'use client';
import { useState, useRef, useEffect, useTransition, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { BlockEditorHandle } from './block-editor';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUpRight,
  Code,
  Eye,
  Check,
  Loader2,
  ChevronDown,
  Upload,
  X,
  Save,
} from 'lucide-react';
import { Markdown } from './markdown';
import { savePost } from '@/app/admin/actions';
import type { Post } from '@/lib/types';
const VisualEditor = dynamic(() => import('./block-editor'), {
  ssr: false,
  loading: () => <div className="block-editor-loading">Preparing your writing space…</div>,
});
const blank = {
  id: '',
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  category: 'Notes',
  tags: [] as string[],
  status: 'draft' as 'draft' | 'published',
  seo_title: '',
  seo_description: '',
  cover_id: '',
};
type Draft = typeof blank;
export function PostEditor({ post, baseUrl }: { post?: Post; baseUrl: string }) {
  const initial: Draft = post ? { ...blank, ...post, cover_id: post.cover_id || '' } : blank;
  const [data, setData] = useState<Draft>(initial);
  const [mode, setMode] = useState<'visual' | 'markdown' | 'preview'>('visual');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [seoOpen, setSeoOpen] = useState(false);
  const [localCopy, setLocalCopy] = useState<Draft | null>(null);
  const [ready, setReady] = useState(false);
  const [localSaved, setLocalSaved] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const visualEditor = useRef<BlockEditorHandle | null>(null);
  const inlineUpload = useRef<HTMLInputElement>(null);
  const coverUpload = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const key = `ducky-draft-${post?.id || 'new'}`;
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.content !== initial.content || saved.title !== initial.title) setLocalCopy(saved);
      }
    } catch {}
    setReady(true);
  }, [key]);
  useEffect(() => {
    if (!ready || localCopy) return;
    const timer = setTimeout(() => {
      if (data.content || data.title)
        try {
          localStorage.setItem(key, JSON.stringify(data));
          setLocalSaved(true);
        } catch {}
    }, 1200);
    return () => clearTimeout(timer);
  }, [data, key, ready, localCopy]);
  function update<K extends keyof Draft>(field: K, value: Draft[K]) {
    setData((d) => ({ ...d, [field]: value }));
    setSaved(false);
    setLocalSaved(false);
  }
  async function upload(file: File, cover = false) {
    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.set('file', file);
      form.set('alt', file.name.replace(/\.[^.]+$/, ''));
      const response = await fetch('/api/upload', { method: 'POST', body: form });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Upload failed');
      if (cover) update('cover_id', json.id);
      else if (visualEditor.current && mode === 'visual') {
        visualEditor.current.insertImage(json.url, file.name.replace(/\.[^.]+$/, ''));
      } else {
        const el = textarea.current;
        const pos = el?.selectionStart ?? data.content.length;
        const alt = file.name.replace(/[\[\]\\\n\r]/g, '').replace(/\.[^.]+$/, '');
        setData((current) => ({
          ...current,
          content:
            current.content.slice(0, pos) +
            `\n![${alt}](${json.url})\n` +
            current.content.slice(pos),
        }));
        setSaved(false);
        setLocalSaved(false);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }
  const save = useCallback(
    (status: 'draft' | 'published') => {
      if (pending || uploading) return;
      setError('');
      setSaved(false);
      start(async () => {
        try {
          const r = await savePost({ ...data, status });
          if (r.error) setError(r.error);
          else {
            setSaved(true);
            setData((d) => ({ ...d, id: r.id!, status }));
            try {
              localStorage.removeItem(key);
            } catch {}
            if (!post) router.replace(`/admin/posts/${r.id}`);
            router.refresh();
          }
        } catch {
          setError('Could not save. Your local draft is kept in this browser. Try again.');
        }
      });
    },
    [data, key, post, router, pending, uploading],
  );
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        save(data.status);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [save, data.status]);
  const wordCount = data.content.trim() ? data.content.trim().split(/\s+/).length : 0;
  return (
    <>
      <div className="editor-top">
        <Link className="text-link" href="/admin/posts">
          <ArrowLeft size={16} /> Your writeups
        </Link>
        <div>
          <span className={`status-badge ${data.status}`}>{data.status}</span>
          <button
            className="button button-small"
            disabled={pending || uploading}
            onClick={() => save('draft')}
          >
            {pending ? <Loader2 size={15} className="spin" /> : <Save size={15} />}Save draft
          </button>
          <button
            className="button button-dark button-small"
            disabled={pending || uploading}
            onClick={() => save('published')}
          >
            {data.status === 'published' ? 'Update post' : 'Publish post'}
            <ArrowUpRight size={15} />
          </button>
        </div>
      </div>
      {localCopy && (
        <div className="draft-banner">
          <span>A local draft was found in this browser.</span>
          <button
            className="text-link"
            onClick={() => {
              setData({ ...blank, ...localCopy, id: initial.id });
              setLocalCopy(null);
            }}
          >
            Restore draft
          </button>
          <button
            className="text-link"
            onClick={() => {
              localStorage.removeItem(key);
              setLocalCopy(null);
            }}
          >
            Discard copy
          </button>
        </div>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {saved && (
        <p className="form-success" role="status">
          <Check size={16} />{' '}
          {data.status === 'published'
            ? 'Published. Your sitemap and public pages have been updated.'
            : 'Draft saved. Only you can see it.'}
          {data.status === 'published' && (
            <Link href={`/blog/${data.slug}`} target="_blank">
              View post ↗
            </Link>
          )}
        </p>
      )}
      <div className="editor-layout">
        <div className="editor-main">
          <input
            className="editor-title"
            aria-label="Post title"
            placeholder="A thought worth sharing…"
            maxLength={180}
            value={data.title}
            onChange={(e) => {
              const title = e.target.value;
              setData((d) => ({
                ...d,
                title,
                slug: !post && (d.slug === slugify(d.title) || !d.slug) ? slugify(title) : d.slug,
              }));
              setSaved(false);
            }}
          />
          <textarea
            className="editor-excerpt"
            aria-label="Post excerpt"
            placeholder="A short introduction. Give readers a reason to keep going."
            maxLength={320}
            value={data.excerpt}
            onChange={(e) => update('excerpt', e.target.value)}
            rows={2}
          />
          <div className="writeup-mode-bar">
            <div>
              <span className="editor-mode-dot" />
              YOUR WRITING SPACE
            </div>
            <div className="writeup-modes" role="group" aria-label="Editor mode">
              {[
                ['visual', 'Visual blocks'],
                ['markdown', 'Markdown'],
                ['preview', 'Preview'],
              ].map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  className={mode === value ? 'selected' : ''}
                  aria-pressed={mode === value}
                  onClick={() => setMode(value as typeof mode)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <input
            className="sr-only"
            ref={inlineUpload}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/avif,image/gif,image/tiff"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.target.value = '';
            }}
          />
          {mode === 'visual' && (
            <VisualEditor
              value={data.content}
              onChange={(value) => update('content', value)}
              disabled={pending}
              onUpload={(file) => void upload(file)}
              onChooseImage={() => inlineUpload.current?.click()}
              onError={setError}
              onReady={(handle) => {
                visualEditor.current = handle;
              }}
            />
          )}
          {mode === 'markdown' && (
            <div className="markdown-source-pane">
              <div className="markdown-source-note">
                <Code size={15} />
                <span>
                  Paste Markdown here, then choose <strong>Visual blocks</strong> or{' '}
                  <strong>Preview</strong> to see it rendered.
                </span>
              </div>
              <textarea
                ref={textarea}
                className="markdown-input"
                aria-label="Markdown content"
                placeholder={
                  '## Start with an idea\n\nPaste Markdown, including headings, tables, lists, and fenced code blocks.'
                }
                spellCheck={false}
                value={data.content}
                maxLength={200000}
                onChange={(event) => update('content', event.target.value)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  const file = event.dataTransfer.files[0];
                  if (file) {
                    event.preventDefault();
                    void upload(file);
                  }
                }}
                onPaste={(event) => {
                  const file = Array.from(event.clipboardData.files).find((file) =>
                    file.type.startsWith('image/'),
                  );
                  if (file) {
                    event.preventDefault();
                    void upload(file);
                  }
                }}
              />
            </div>
          )}
          {mode === 'preview' && (
            <div className="markdown-preview writeup-full-preview">
              {data.content ? (
                <Markdown content={data.content} />
              ) : (
                <div className="preview-placeholder">
                  <Eye size={26} />
                  <p>Your story takes shape here.</p>
                  <small>Start writing or paste some Markdown.</small>
                </div>
              )}
            </div>
          )}
          <div className="editor-status">
            <span>
              {wordCount} words <span>·</span> {Math.max(1, Math.ceil(wordCount / 220))} min read
            </span>
            <span>
              {uploading
                ? 'Optimizing image…'
                : pending
                  ? 'Saving…'
                  : saved
                    ? 'Saved to database'
                    : localSaved
                      ? 'Local recovery copy saved'
                      : 'Visual blocks · Markdown supported'}{' '}
              <i className="status-dot" />
            </span>
          </div>
          <details className="markdown-help">
            <summary>
              Markdown shortcuts & code blocks <ChevronDown size={14} />
            </summary>
            <div>
              <code>## Heading</code>
              <code>**bold**</code>
              <code>_italic_</code>
              <code>- List item</code>
              <code>[Link](https://…)</code>
              <code>![Alt text](/media/…)</code>
              <code>{'```python\nprint("Hello")\n```'}</code>
              <span>
                Paste Markdown into Visual blocks to format it automatically. Choose a language for
                code highlighting. Triple backticks and triple apostrophes are supported. Ctrl/⌘ + S
                saves your current status.
              </span>
            </div>
          </details>
        </div>
        <aside className="editor-settings">
          <section className="editor-settings-panel">
            <h3>Post details</h3>
            <label>
              URL slug
              <div className="slug-field">
                <span>/blog/</span>
                <input
                  value={data.slug}
                  onChange={(e) => update('slug', e.target.value)}
                  placeholder="your-post-title"
                  maxLength={120}
                />
              </div>
              <small>
                Keep it short, clear, and descriptive. Changing a published URL breaks old links.
              </small>
            </label>
            <label>
              Category
              <input
                value={data.category}
                onChange={(e) => update('category', e.target.value)}
                placeholder="e.g. Security research"
                aria-label="Category"
                list="post-categories"
                maxLength={50}
              />
              <datalist id="post-categories">
                <option value="Security research" />
                <option value="Projects" />
                <option value="Development" />
                <option value="Notes" />
                <option value="Personal" />
              </datalist>
              <small>Choose Security research to include this post on the Research page.</small>
            </label>
            <label>
              Tags
              <input
                value={data.tags.join(', ')}
                onChange={(e) =>
                  update(
                    'tags',
                    e.target.value.split(',').map((s) => s.trimStart()),
                  )
                }
                onBlur={() => update('tags', data.tags.map((s) => s.trim()).filter(Boolean))}
                placeholder="security, projects, learning"
              />
              <small>Separate with commas.</small>
            </label>
          </section>
          <section className="editor-settings-panel">
            <h3>
              Cover image <span>Optional</span>
            </h3>
            {data.cover_id ? (
              <div className="cover-preview">
                <img src={`/media/${data.cover_id}`} alt="Post cover" />
                <button
                  className="icon-button"
                  aria-label="Remove cover"
                  onClick={() => update('cover_id', '')}
                >
                  <X size={15} />
                </button>
              </div>
            ) : (
              <button
                className="upload-zone"
                disabled={uploading}
                onClick={() => coverUpload.current?.click()}
              >
                <Upload size={22} />
                <strong>Add a cover image</strong>
                <span>Click to choose an image</span>
              </button>
            )}
            <input
              className="sr-only"
              ref={coverUpload}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif,image/gif,image/tiff"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f, true);
                e.target.value = '';
              }}
            />
            <p className="image-budget">
              <Check size={13} /> Automatically WebP. Always under 50 KB.
            </p>
          </section>
          <section className="editor-settings-panel">
            <button
              className="settings-toggle"
              onClick={() => setSeoOpen(!seoOpen)}
              aria-expanded={seoOpen}
            >
              <h3>Search engine preview</h3>
              <ChevronDown size={16} />
            </button>
            <div className="google-preview">
              <span>
                {baseUrl}/blog/{data.slug || 'your-post'}
              </span>
              <strong>{data.seo_title || data.title || 'Your post title'}</strong>
              <p>
                {data.seo_description ||
                  data.excerpt ||
                  'A useful description helps readers decide to visit your page.'}
              </p>
            </div>
            {seoOpen && (
              <>
                <label>
                  SEO title
                  <input
                    value={data.seo_title}
                    onChange={(e) => update('seo_title', e.target.value)}
                    maxLength={70}
                    placeholder={data.title || 'Defaults to post title'}
                  />
                  <small>{data.seo_title.length}/70 · aim for 50–60 characters</small>
                </label>
                <label>
                  Meta description
                  <textarea
                    rows={4}
                    value={data.seo_description}
                    onChange={(e) => update('seo_description', e.target.value)}
                    maxLength={170}
                    placeholder={data.excerpt || 'Defaults to the introduction'}
                  />
                  <small>{data.seo_description.length}/170 · aim for 140–160 characters</small>
                </label>
              </>
            )}
            <p className="settings-note">Google may display a different title or description.</p>
          </section>
        </aside>
      </div>
    </>
  );
}
function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}
