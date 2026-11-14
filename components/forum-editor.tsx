'use client';
import { useActionState, useRef, useState, useTransition, type ReactNode } from 'react';
import { Bold, Code2, Eye, ImagePlus, Link2, Loader2, Send, Trash2 } from 'lucide-react';
import { saveForumPost } from '@/app/forum-actions';
import { previewForumPost } from '@/app/forum-render-actions';
import type { ForumImage, ForumPost } from '@/lib/forum-types';
import { IMAGE_ACCEPT, isImageFile, MAX_IMAGE_BYTES } from '@/lib/image-upload';

export function ForumEditor({ id, post }: { id: string; post?: ForumPost }) {
  const [state, action, pending] = useActionState(saveForumPost, {});
  const [content, setContent] = useState(post?.content || '');
  const [images, setImages] = useState<ForumImage[]>(post?.images || []);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<ReactNode>(null);
  const [previewing, startPreview] = useTransition();
  const textarea = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadInFlight = useRef(false);
  function insert(before: string, after = '') {
    const el = textarea.current;
    if (!el) return;
    const start = el.selectionStart,
      end = el.selectionEnd;
    setContent(
      content.slice(0, start) + before + content.slice(start, end) + after + content.slice(end),
    );
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, end + before.length);
    });
  }
  async function upload(files: File[]) {
    if (uploadInFlight.current || !files.length) return;
    setError('');
    if (files.some((file) => !isImageFile(file))) {
      setError('Choose image files, including iPhone HEIC/HEIF photos.');
      if (fileInput.current) fileInput.current.value = '';
      return;
    }
    if (files.some((file) => file.size > MAX_IMAGE_BYTES)) {
      setError('Please choose images smaller than 10 MB each.');
      if (fileInput.current) fileInput.current.value = '';
      return;
    }
    if (images.length + files.length > 4) {
      setError('Attach up to 4 images to each post.');
      if (fileInput.current) fileInput.current.value = '';
      return;
    }
    uploadInFlight.current = true;
    setUploading(true);
    try {
      for (const file of files) {
        const data = new FormData();
        data.set('file', file);
        data.set('alt', file.name.replace(/\.[^.]+$/, ''));
        const response = await fetch('/api/upload', { method: 'POST', body: data });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'The image could not be uploaded.');
        setImages((current) => [
          ...current,
          {
            id: result.id,
            width: result.width,
            height: result.height,
            alt: file.name.replace(/\.[^.]+$/, ''),
          },
        ]);
      }
    } catch (error) {
      setError((error as Error).message);
    } finally {
      uploadInFlight.current = false;
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }
  return (
    <form
      action={action}
      className="forum-composer"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        void upload([...event.dataTransfer.files]);
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="revision" value={post?.revision || ''} />
      <input type="hidden" name="images" value={JSON.stringify(images)} />
      <label className="forum-field">
        Post title
        <input
          name="title"
          required
          minLength={3}
          maxLength={160}
          defaultValue={post?.title}
          placeholder="What caught your attention?"
        />
      </label>
      <div className="forum-editor-tabs">
        <button type="button" aria-pressed={preview === null} onClick={() => setPreview(null)}>
          Write
        </button>
        <button
          type="button"
          aria-pressed={preview !== null}
          disabled={previewing}
          onClick={() =>
            startPreview(async () => {
              try {
                setPreview(await previewForumPost(content));
              } catch {
                setError('Preview could not load. Please try again.');
              }
            })
          }
        >
          <Eye size={16} />
          {previewing ? 'Loading…' : 'Preview'}
        </button>
        <span>Markdown supported</span>
      </div>
      <div className="forum-editor-toolbar">
        <button type="button" aria-label="Bold text" onClick={() => insert('**', '**')}>
          <Bold size={17} />
        </button>
        <button
          type="button"
          aria-label="Insert code block"
          onClick={() => insert('\n```javascript\n', '\n```\n')}
        >
          <Code2 size={18} />
        </button>
        <button
          type="button"
          aria-label="Insert Markdown link"
          onClick={() => insert('[', '](https://)')}
        >
          <Link2 size={18} />
        </button>
        <button
          type="button"
          disabled={uploading || images.length >= 4}
          onClick={() => fileInput.current?.click()}
        >
          <ImagePlus size={18} /> Add images
        </button>
      </div>
      <div className="forum-field">
        <label className="sr-only" htmlFor="forum-post-content">
          Post content
        </label>
        <textarea
          id="forum-post-content"
          ref={textarea}
          name="content"
          required
          maxLength={20000}
          rows={12}
          value={content}
          onChange={(event) => {
            setContent(event.target.value);
            setPreview(null);
          }}
          hidden={preview !== null}
          placeholder={
            'Share a thought, a useful find, or something you’re working on…\n\nPaste a GitHub or Instagram link and it becomes a card.'
          }
          onPaste={(event) => {
            const files = [...event.clipboardData.files].filter(isImageFile);
            if (files.length) {
              event.preventDefault();
              void upload(files);
            }
          }}
        />
      </div>
      {preview !== null && <div className="forum-markdown-preview">{preview}</div>}
      <label className="forum-field">
        A link to share <span className="forum-optional">(optional)</span>
        <input
          name="link_url"
          type="url"
          maxLength={2000}
          defaultValue={post?.link_url}
          placeholder="GitHub, Instagram reel, or any useful link"
        />
      </label>
      <input
        ref={fileInput}
        type="file"
        multiple
        accept={IMAGE_ACCEPT}
        className="sr-only"
        aria-label="Attach forum images"
        onChange={(event) => void upload([...(event.target.files || [])])}
      />
      {!!images.length && (
        <div className="forum-upload-grid">
          {images.map((image, index) => (
            <div key={image.id}>
              <img
                src={`/media/${image.id}`}
                alt={image.alt}
                width={image.width}
                height={image.height}
              />
              <label>
                Image description
                <input
                  value={image.alt}
                  maxLength={300}
                  onChange={(event) =>
                    setImages((current) =>
                      current.map((item, i) =>
                        i === index ? { ...item, alt: event.target.value } : item,
                      ),
                    )
                  }
                />
              </label>
              <button
                type="button"
                onClick={() => setImages((current) => current.filter((_, i) => i !== index))}
                aria-label={`Remove image ${index + 1}`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="forum-composer-hint">
        JPEG, PNG, WebP, AVIF, GIF, TIFF, and iPhone HEIC/HEIF photos. Up to 10 MB and 50 megapixels
        each. Images are optimized to WebP under 50 KB.
      </p>
      {uploading && (
        <p role="status">
          <Loader2 size={17} className="spin" /> Optimizing your image…
        </p>
      )}
      {(error || state.message) && (
        <p role="alert" className="forum-error">
          {error || state.message}
        </p>
      )}
      {state.errors && (
        <ul className="forum-error">
          {Object.entries(state.errors).map(([field, errors]) => (
            <li key={field}>
              {field}: {errors[0]}
            </li>
          ))}
        </ul>
      )}
      <div className="forum-composer-footer">
        <div className="forum-field">
          <label htmlFor="forum-post-visibility">Visibility</label>
          <select
            id="forum-post-visibility"
            name="status"
            defaultValue={post?.status || 'published'}
          >
            <option value="published">Published · everyone</option>
            <option value="draft">Draft · only me</option>
          </select>
        </div>
        <button className="forum-primary" disabled={pending || uploading || previewing}>
          <Send size={17} />
          {pending ? 'Saving…' : post ? 'Save post' : 'Publish post'}
        </button>
      </div>
    </form>
  );
}
