'use client';
import { IMAGE_ACCEPT } from '@/lib/image-upload';
import Link from 'next/link';
import { useState, useEffect, useMemo, useCallback, useRef, useTransition } from 'react';
import {
  Save,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowUpRight,
  RotateCcw,
  Check,
  Loader2,
  Upload,
  PanelsTopLeft,
  PanelTop,
  UserRound,
  BarChart3,
  BriefcaseBusiness,
  Code2,
  Mail,
  LayoutTemplate,
  PanelBottom,
  ShieldCheck,
  BookOpen,
  Search,
  X,
  Pencil,
  ChevronDown,
  Globe,
} from 'lucide-react';
import {
  homepageSchema,
  sectionKeys,
  sectionLabels,
  homeIcons,
  type Homepage,
  type SectionKey,
} from '@/lib/homepage-schema';
import {
  homepageFieldId,
  homepageFieldSpec,
  panelForHomeField,
  homepageItemForField,
  changedHomepagePanels,
  describeHomepageField,
  homepagePanelNames,
  type HomepageHashes,
} from '@/lib/homepage-editing';
import { saveHomepage } from '@/app/admin/homepage-actions';
import { upgradeHomepage } from '@/lib/homepage-migration.mjs';
import type { Profile, PostSummary } from '@/lib/types';
import { SiteBrand } from './site-brand';
import { brandFonts } from '@/lib/brand-fonts';
import { HomepagePreview } from './homepage-preview';
type Panel = 'layout' | 'branding' | 'footer' | SectionKey;
const sectionIcons = {
  hero: UserRound,
  highlights: BarChart3,
  about: UserRound,
  experience: BriefcaseBusiness,
  tools: Code2,
  writeups: BookOpen,
  contact: Mail,
};
const descriptions: Record<Panel, string> = {
  layout: 'Choose what appears and put the sections in the order you want.',
  branding: 'Your logo, brand lettering, and navigation across the website.',
  hero: 'The first words, buttons, and portrait visitors see.',
  highlights: 'The numbers and achievements just below your introduction.',
  about: 'A short introduction to the person behind the work.',
  experience: 'Roles, dates, companies, and what you did along the way.',
  tools: 'Useful tools you want visitors to discover.',
  writeups:
    'Automatically show your latest published writeups, with thumbnails and a link to the full collection.',
  contact: 'An invitation to get in touch, with the right email and links.',
  footer: 'The links and closing details at the bottom of every page.',
};
function readAt(object: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>((value, key) => (value as Record<string, unknown>)?.[key], object);
}
function writeAt(object: Homepage, path: string, value: unknown) {
  const parts = path.split('.');
  let current = object as unknown as Record<string, unknown>;
  for (const key of parts.slice(0, -1)) current = current[key] as Record<string, unknown>;
  current[parts.at(-1)!] = value;
}
function EditorField({
  label,
  path,
  value,
  onChange,
  area = false,
  hint,
  error,
  maxLength = 4000,
}: {
  label: string;
  path: string;
  value: string;
  onChange: (value: string) => void;
  area?: boolean;
  hint?: string;
  error?: string;
  maxLength?: number;
}) {
  const id = homepageFieldId(path);
  const spec = homepageFieldSpec(path);
  const limit = Math.min(maxLength, spec.maxLength);
  const props = {
    id,
    name: 'homepage_' + path,
    value,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(event.target.value),
    maxLength: limit,
    inputMode: path.endsWith('.href')
      ? ('url' as const)
      : path.endsWith('.email')
        ? ('email' as const)
        : ('text' as const),
    'aria-invalid': !!error,
    'aria-describedby': hint || error ? id + '-note' : undefined,
    autoComplete: 'off',
  };
  return (
    <div className={`homepage-field${error ? ' has-error' : ''}`}>
      <div className="homepage-field-caption">
        <label htmlFor={id}>{label}</label>
        <span className="homepage-field-meta" aria-hidden="true">
          <span>{spec.required ? 'Required' : 'Optional'}</span>
          <span className={value.length >= limit * 0.9 ? 'near-limit' : ''}>
            {value.length}/{limit}
          </span>
        </span>
      </div>
      {area ? (
        <textarea {...props} rows={path.toLowerCase().includes('heading') ? 2 : 4} />
      ) : (
        <input {...props} type="text" />
      )}
      {(hint || error) && (
        <small id={id + '-note'} className={error ? 'homepage-field-error' : ''}>
          {error || hint}
        </small>
      )}
    </div>
  );
}
function Toggle({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="homepage-toggle">
      <input
        type="checkbox"
        role="switch"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span aria-hidden="true" />
      <strong>{label}</strong>
    </label>
  );
}
function ImagePicker({
  label,
  src,
  busy,
  onUpload,
  onRemove,
}: {
  label: string;
  src: string;
  busy: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="homepage-image-picker">
      <div className="homepage-image-sample">
        {src ? <img src={src} alt={label} /> : <Upload size={26} />}
      </div>
      <div>
        <strong>{label}</strong>
        <p>Automatically optimized to WebP, under 50 KB.</p>
        <div className="homepage-inline-actions">
          <button
            type="button"
            className="button button-small"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            {busy ? <Loader2 size={15} className="spin" /> : <Upload size={15} />}Upload{' '}
            {label.toLowerCase()}
          </button>
          {src && (
            <button type="button" className="text-link" onClick={onRemove} disabled={busy}>
              Remove image
            </button>
          )}
        </div>
      </div>
      <input
        ref={input}
        type="file"
        aria-label={`${label} image file`}
        accept={IMAGE_ACCEPT}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onUpload(file);
          event.target.value = '';
        }}
      />
    </div>
  );
}
export function HomepageEditor({
  initial,
  initialRevision,
  initialHashes,
  initialPanel = 'layout',
  posts,
  profile,
  icons,
}: {
  initial: Homepage;
  initialRevision: string;
  initialHashes: HomepageHashes;
  initialPanel?: Panel;
  posts: PostSummary[];
  profile: Profile;
  icons: string;
}) {
  const [data, setData] = useState(initial);
  const [baseline, setBaseline] = useState(JSON.stringify(initial));
  const [revision, setRevision] = useState(initialRevision);
  const [hashes, setHashes] = useState(initialHashes);
  const [sectionQuery, setSectionQuery] = useState('');
  const [mergedSave, setMergedSave] = useState(false);
  const [collapsedItems, setCollapsedItems] = useState(
    () =>
      new Set(
        (
          [
            ['navigation.items', initial.navigation.items],
            ['footer.links', initial.footer.links],
            ['hero.buttons', initial.hero.buttons],
            ['highlights.items', initial.highlights.items],
            ['experience.items', initial.experience.items],
            ['tools.items', initial.tools.items],
          ] as const
        ).flatMap(([path, items]) => items.slice(1).map((item) => path + '::' + item.id)),
      ),
  );
  const [panel, setPanel] = useState<Panel>(initialPanel);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [ready, setReady] = useState(false);
  const [recovery, setRecovery] = useState<{ data: Homepage; revision: string } | null>(null);
  const [conflict, setConflict] = useState(false);
  const [recoverySaved, setRecoverySaved] = useState(false);
  const serialized = useMemo(() => JSON.stringify(data), [data]);
  const dirty = serialized !== baseline;
  const savedConfig = useMemo(() => JSON.parse(baseline) as Homepage, [baseline]);
  const changedPanels = useMemo(
    () => changedHomepagePanels(savedConfig, data),
    [savedConfig, data],
  );
  const invalidPanels = new Set(Object.keys(errors).map(panelForHomeField));
  const enabledSections = data.order.filter((key) => data[key].enabled).length;
  const persistence = useRef({ data, revision, dirty, ready });
  persistence.current = { data, revision, dirty, ready };
  useEffect(() => {
    const persist = () => {
      const state = persistence.current;
      if (state.ready && state.dirty)
        try {
          localStorage.setItem(
            'ducky-homepage-recovery',
            JSON.stringify({ data: state.data, revision: state.revision }),
          );
        } catch {}
    };
    const visibility = () => {
      if (document.visibilityState === 'hidden') persist();
    };
    window.addEventListener('pagehide', persist);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      persist();
      window.removeEventListener('pagehide', persist);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
  const revealField = useCallback(
    (path: string) => {
      setSectionQuery('');
      setPanel(panelForHomeField(path));
      const id = homepageItemForField(data, path);
      if (id)
        setCollapsedItems((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const field =
            document.getElementById(homepageFieldId(path)) ||
            document.getElementById('homepage-panel-title');
          field?.focus({ preventScroll: true });
          field?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }),
      );
    },
    [data],
  );
  function resetSection() {
    setData((current) => {
      const next = structuredClone(current);
      if (panel === 'layout') next.order = savedConfig.order;
      else if (panel === 'branding') {
        next.branding = savedConfig.branding;
        next.navigation = savedConfig.navigation;
      } else Object.assign(next, { [panel]: savedConfig[panel] });
      return next;
    });
    setErrors({});
    setError('');
    setSaved(false);
  }

  const previewButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('ducky-homepage-recovery');
      if (raw) {
        const draft = JSON.parse(raw);
        const parsed = homepageSchema.safeParse(upgradeHomepage(draft.data));
        if (parsed.success && JSON.stringify(parsed.data) !== JSON.stringify(initial))
          setRecovery({ data: parsed.data, revision: String(draft.revision || '') });
      }
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready || (recovery && !dirty)) return;
    const timeout = setTimeout(() => {
      try {
        if (dirty) {
          localStorage.setItem('ducky-homepage-recovery', JSON.stringify({ data, revision }));
          setRecoverySaved(true);
        } else localStorage.removeItem('ducky-homepage-recovery');
      } catch {}
    }, 1000);
    return () => clearTimeout(timeout);
  }, [serialized, revision, dirty, ready, recovery]);
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
  const change = useCallback((path: string, value: unknown) => {
    setData((current) => {
      const next = structuredClone(current);
      writeAt(next, path, value);
      return next;
    });
    setSaved(false);
    setRecoverySaved(false);
    setErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(next))
        if (key === path || key.startsWith(path + '.')) delete next[key];
      return next;
    });
    setError('');
  }, []);
  function validate() {
    const parsed = homepageSchema.safeParse(data);
    if (!parsed.success) {
      const fields = Object.fromEntries(
        parsed.error.issues.map((issue) => [issue.path.join('.'), issue.message]),
      );
      setErrors(fields);
      setError('Please check the highlighted fields before continuing.');
      revealField(parsed.error.issues[0].path.join('.'));
      return null;
    }
    setErrors({});
    return parsed.data;
  }
  const save = useCallback(() => {
    if (pending || uploading || !dirty) return;
    const value = validate();
    if (!value) return;
    setError('');
    setSaved(false);
    start(async () => {
      try {
        const result = await saveHomepage(value, revision, hashes);
        if (result.error) {
          setError(result.error);
          setErrors(result.fields || {});
          setConflict(!!result.conflict);
          const first = Object.keys(result.fields || {})[0];
          if (first) revealField(first);
        } else {
          const published = result.homepage || value;
          // Keep any newer local edits while adopting unrelated changes returned by the server.
          setData((current) => {
            const next = structuredClone(published);
            for (const key of Object.keys(data) as (keyof Homepage)[])
              if (JSON.stringify(current[key]) !== JSON.stringify(data[key]))
                Object.assign(next, { [key]: current[key] });
            return next;
          });
          setBaseline(JSON.stringify(published));
          if (result.hashes) setHashes(result.hashes);
          setMergedSave(!!result.merged);
          setRecovery(null);
          setRevision(result.revision!);
          setSaved(true);
          setConflict(false);
          try {
            localStorage.removeItem('ducky-homepage-recovery');
          } catch {}
        }
      } catch {
        setError('Could not save. Your changes are still in this editor. Please try again.');
      }
    });
  }, [data, revision, hashes, pending, uploading, dirty, revealField]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        save();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [save]);
  async function upload(path: string, file: File) {
    setUploading(path);
    setError('');
    try {
      const form = new FormData();
      form.set('file', file);
      form.set('alt', path === 'branding.logo' ? data.branding.logoAlt : data.hero.portrait.alt);
      const response = await fetch('/api/upload', { method: 'POST', body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not upload this image.');
      change(path, result.url);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setUploading(null);
    }
  }
  const field = (
    path: string,
    label: string,
    options: { area?: boolean; hint?: string; maxLength?: number } = {},
  ) => (
    <EditorField
      key={path}
      path={path}
      label={label}
      value={String(readAt(data, path) ?? '')}
      onChange={(value) => change(path, value)}
      error={errors[path]}
      {...options}
    />
  );
  const fieldsLink = (path: string, label = 'Link') => (
    <div className="homepage-field-grid">
      {field(path + '.label', label + ' text', { maxLength: 100 })}
      {field(path + '.href', label + ' destination', {
        hint: 'Use a page such as /tools, an https:// address, or #section.',
        maxLength: 500,
      })}
    </div>
  );
  function move(path: string, index: number, direction: number) {
    const list = [...(readAt(data, path) as unknown[])];
    const other = index + direction;
    if (other < 0 || other >= list.length) return;
    [list[index], list[other]] = [list[other], list[index]];
    change(path, list);
  }
  function strings(path: string, label: string, max = 20, area = false) {
    const values = readAt(data, path) as string[];
    return (
      <div className="homepage-repeat-group">
        <div className="homepage-repeat-heading">
          <div>
            <h3>{label}s</h3>
            <p>Add, remove, or rearrange the text shown here.</p>
          </div>
          <button
            className="button button-small"
            type="button"
            disabled={values.length >= max}
            onClick={() => {
              change(path, [...values, '']);
              requestAnimationFrame(() =>
                document.getElementById(homepageFieldId(`${path}.${values.length}`))?.focus(),
              );
            }}
          >
            <Plus size={15} />
            Add {label.toLowerCase()}
          </button>
        </div>
        {values.map((_, index) => (
          <div className="homepage-string-row" key={index}>
            {field(`${path}.${index}`, `${label} ${index + 1}`, { area })}
            <div className="homepage-item-controls">
              <button
                type="button"
                className="icon-button"
                aria-label={`Move ${label.toLowerCase()} ${index + 1} up`}
                disabled={index === 0}
                onClick={() => move(path, index, -1)}
              >
                <ArrowUp size={16} />
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label={`Move ${label.toLowerCase()} ${index + 1} down`}
                disabled={index === values.length - 1}
                onClick={() => move(path, index, 1)}
              >
                <ArrowDown size={16} />
              </button>
              <button
                type="button"
                className="icon-button homepage-remove"
                aria-label={`Remove ${label.toLowerCase()} ${index + 1}`}
                onClick={() =>
                  change(
                    path,
                    values.filter((_, i) => i !== index),
                  )
                }
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }
  function repeat(
    path: string,
    label: string,
    newItem: Record<string, unknown>,
    render: (path: string, item: Record<string, unknown>, index: number) => React.ReactNode,
    max = 16,
  ) {
    const items = readAt(data, path) as Record<string, unknown>[];
    return (
      <div className="homepage-repeat-group">
        <div className="homepage-repeat-heading">
          <div>
            <h3>{label}s</h3>
            <p>Each item can be edited and reordered independently.</p>
          </div>
          <button
            className="button button-small"
            type="button"
            disabled={items.length >= max}
            onClick={() => {
              change(path, [...items, { ...newItem, id: crypto.randomUUID() }]);
              requestAnimationFrame(() =>
                document
                  .querySelector<HTMLInputElement>(`[name^="homepage_${path}.${items.length}."]`)
                  ?.focus(),
              );
            }}
          >
            <Plus size={15} />
            Add {label.toLowerCase()}
          </button>
        </div>
        {items.length > 1 && (
          <div className="homepage-list-tools">
            <span>{items.length} items</span>
            <button
              type="button"
              onClick={() =>
                setCollapsedItems((current) => {
                  const next = new Set(current);
                  const allOpen = items.every((item) => !current.has(path + '::' + item.id));
                  for (const item of items) {
                    if (allOpen) next.add(path + '::' + item.id);
                    else next.delete(path + '::' + item.id);
                  }
                  return next;
                })
              }
            >
              {items.every((item) => !collapsedItems.has(path + '::' + item.id))
                ? 'Collapse all'
                : 'Expand all'}
            </button>
          </div>
        )}
        {errors[path] && <p className="homepage-field-error">{errors[path]}</p>}
        {items.map((item, index) => (
          <section className="homepage-repeat-card" key={String(item.id)}>
            <header>
              <button
                className="homepage-item-title"
                type="button"
                aria-label={`${collapsedItems.has(path + '::' + item.id) ? 'Expand' : 'Collapse'} ${label.toLowerCase()} ${index + 1}`}
                aria-expanded={!collapsedItems.has(path + '::' + item.id)}
                aria-controls={'home-item-' + item.id}
                onClick={() =>
                  setCollapsedItems((current) => {
                    const next = new Set(current);
                    const id = path + '::' + item.id;
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  })
                }
              >
                <span className="homepage-item-number">{String(index + 1).padStart(2, '0')}</span>
                <strong>{String(item.title || item.label || item.role || label)}</strong>
                <ChevronDown size={16} />
              </button>
              <div className="homepage-item-controls">
                <button
                  className="icon-button"
                  type="button"
                  aria-label={`Move ${label.toLowerCase()} ${index + 1} up`}
                  disabled={index === 0}
                  onClick={() => move(path, index, -1)}
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  className="icon-button"
                  type="button"
                  aria-label={`Move ${label.toLowerCase()} ${index + 1} down`}
                  disabled={index === items.length - 1}
                  onClick={() => move(path, index, 1)}
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  className="icon-button homepage-remove"
                  type="button"
                  aria-label={`Remove ${label.toLowerCase()} ${index + 1}`}
                  onClick={() =>
                    change(
                      path,
                      items.filter((_, i) => i !== index),
                    )
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </header>
            <div
              id={'home-item-' + item.id}
              className="homepage-repeat-body"
              hidden={collapsedItems.has(path + '::' + item.id)}
            >
              {render(`${path}.${index}`, item, index)}
            </div>
          </section>
        ))}
        {!items.length && (
          <div className="homepage-empty">
            No {label.toLowerCase()}s yet. Add one above when you’re ready.
          </div>
        )}
      </div>
    );
  }
  const headingFields = (key: Exclude<SectionKey, 'hero' | 'highlights' | 'contact'>) => (
    <div className="homepage-field-grid">
      {field(key + '.eyebrow', 'Section label', { maxLength: 120 })}
      {field(key + '.heading', 'Section heading', {
        area: true,
        hint: 'Use a new line where you want the heading to break.',
        maxLength: 240,
      })}
    </div>
  );
  function content() {
    switch (panel) {
      case 'layout':
        return (
          <>
            <div className="homepage-layout-note">
              <LayoutTemplate size={25} />
              <div>
                <strong>One page. Your order.</strong>
                <p>
                  Use the arrows to move sections. Hide a section to keep it off the website while
                  you work on it.
                </p>
              </div>
            </div>
            <div className="homepage-layout-list">
              {data.order.map((key, index) => {
                const Icon = sectionIcons[key];
                return (
                  <div
                    className={`homepage-layout-row${data[key].enabled ? '' : ' is-hidden'}`}
                    data-edited={changedPanels.includes(key)}
                    key={key}
                  >
                    <span className="homepage-layout-icon">
                      <Icon size={21} />
                    </span>
                    <button
                      className="homepage-layout-label"
                      type="button"
                      onClick={() => setPanel(key)}
                    >
                      <strong>{sectionLabels[key]}</strong>
                      <span>
                        {data[key].enabled
                          ? 'Visible on your homepage'
                          : 'Hidden from your homepage'}
                      </span>
                    </button>
                    <div className="homepage-layout-controls">
                      <button
                        type="button"
                        className="homepage-edit-section"
                        aria-label={`Edit ${sectionLabels[key]} section`}
                        onClick={() => setPanel(key)}
                      >
                        <Pencil size={14} />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`${data[key].enabled ? 'Hide' : 'Show'} ${sectionLabels[key]} section`}
                        onClick={() => change(key + '.enabled', !data[key].enabled)}
                      >
                        {data[key].enabled ? <Eye size={18} /> : <EyeOff size={18} />}
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Move ${sectionLabels[key]} up`}
                        disabled={index === 0}
                        onClick={() => move('order', index, -1)}
                      >
                        <ArrowUp size={18} />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Move ${sectionLabels[key]} down`}
                        disabled={index === data.order.length - 1}
                        onClick={() => move('order', index, 1)}
                      >
                        <ArrowDown size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="homepage-layout-tip">
              <ShieldCheck size={18} />
              <span>Preview your changes before saving. Hidden sections stay editable here.</span>
            </div>
          </>
        );
      case 'branding':
        return (
          <>
            <ImagePicker
              label="Logo"
              src={data.branding.logo}
              busy={!!uploading}
              onUpload={(file) => upload('branding.logo', file)}
              onRemove={() => change('branding.logo', '')}
            />
            <div className="homepage-field-grid">
              {field('branding.name', 'Brand name', { maxLength: 50 })}
              <label className="homepage-field">
                <span>Brand font</span>
                <select
                  id="homepage-branding-font"
                  aria-label="Brand font"
                  value={data.branding.font}
                  onChange={(e) => change('branding.font', e.target.value)}
                >
                  {brandFonts.map((font) => (
                    <option key={font.id} value={font.id}>
                      {font.label} · {font.description}
                    </option>
                  ))}
                </select>
                <small>Uses fonts available on each visitor’s device.</small>
              </label>
              <label className="homepage-field">
                <span>Brand font weight</span>
                <select
                  id="homepage-branding-fontWeight"
                  aria-label="Brand font weight"
                  value={data.branding.fontWeight}
                  onChange={(e) => change('branding.fontWeight', Number(e.target.value))}
                >
                  <option value={500}>Medium</option>
                  <option value={600}>Semibold</option>
                  <option value={700}>Bold</option>
                  <option value={800}>Extra bold</option>
                </select>
              </label>

              {field('branding.logoAlt', 'Logo description', {
                hint: 'Optional when the logo is decorative.',
              })}
              {field('branding.homeLabel', 'Home link accessibility label', {
                hint: 'A short description for screen readers.',
              })}
            </div>
            <section className="homepage-brand-preview" aria-label="Live brand preview">
              <span className="eyebrow">LIVE BRAND PREVIEW</span>
              <div>
                <SiteBrand branding={data.branding} />
              </div>
              <p>
                Used in your top navigation, footer, and admin sidebar. Save when you’re happy with
                the result.
              </p>
            </section>
            {repeat(
              'navigation.items',
              'Navigation link',
              { label: 'New page', href: '/' },
              (path) => fieldsLink(path, 'Navigation link'),
              10,
            )}
            <section className="homepage-subsection">
              <h3>Contact button</h3>
              <Toggle
                label="Show header contact button"
                checked={data.navigation.contact.enabled}
                onChange={(value) => change('navigation.contact.enabled', value)}
              />
              {fieldsLink('navigation.contact', 'Contact button')}
            </section>
          </>
        );
      case 'hero':
        return (
          <>
            {field('hero.eyebrow', 'Introduction label', { maxLength: 180 })}
            <div className="homepage-field-grid">
              {field('hero.heading', 'Main heading', { maxLength: 180 })}
              {field('hero.accentHeading', 'Accent heading', { maxLength: 180 })}
            </div>
            {field('hero.description', 'Introduction', {
              area: true,
              hint: 'Use **bold text** for emphasis. HTML is not needed.',
            })}
            <div className="homepage-field-grid">
              {field('hero.learningLabel', 'Learning label')}
              {field('hero.learningText', 'What you are learning', { area: true })}
            </div>
            {repeat(
              'hero.buttons',
              'Hero button',
              { label: 'New button', href: '/', style: 'secondary', icon: 'arrow' },
              (path) => (
                <>
                  {fieldsLink(path, 'Button')}
                  <div className="homepage-field-grid">
                    <label className="homepage-field">
                      <span>Button style</span>
                      <select
                        aria-label="Button style"
                        value={String(readAt(data, path + '.style'))}
                        onChange={(e) => change(path + '.style', e.target.value)}
                      >
                        <option value="primary">Primary · filled</option>
                        <option value="secondary">Secondary · outline</option>
                      </select>
                    </label>
                    {iconField(path + '.icon')}
                  </div>
                </>
              ),
              4,
            )}
            <div className="homepage-field-grid">
              {field('hero.location', 'Location line')}
              {field('hero.note', 'Short closing note')}
            </div>
            <section className="homepage-subsection">
              <h3>Portrait & identity</h3>
              <Toggle
                label="Show portrait panel"
                checked={data.hero.portrait.visible}
                onChange={(value) => change('hero.portrait.visible', value)}
              />
              <ImagePicker
                label="Portrait"
                src={data.hero.portrait.src}
                busy={!!uploading}
                onUpload={(file) => upload('hero.portrait.src', file)}
                onRemove={() => change('hero.portrait.src', '')}
              />
              <button
                type="button"
                className="text-link homepage-profile-photo"
                onClick={() => change('hero.portrait.src', profile.portrait)}
              >
                Use my profile photo
              </button>
              <div className="homepage-field-grid">
                {field('hero.portrait.alt', 'Portrait description')}
                {field('hero.portrait.name', 'Name under portrait')}
                {field('hero.portrait.subtitle', 'Role under portrait')}
                {field('hero.portrait.topLabel', 'Portrait top label')}
                {field('hero.portrait.index', 'Portrait corner label')}
              </div>
              {strings('hero.portrait.tags', 'Focus tag')}
            </section>
          </>
        );
      case 'highlights':
        return (
          <>
            {field('highlights.label', 'Highlights accessibility label')}
            {repeat(
              'highlights.items',
              'Highlight',
              { value: '0', suffix: '', label: 'New highlight', context: '' },
              (path) => (
                <>
                  <div className="homepage-field-grid">
                    {field(path + '.value', 'Value', { maxLength: 40 })}
                    {field(path + '.suffix', 'Unit or suffix', {
                      hint: 'Optional, such as yr or projects.',
                      maxLength: 30,
                    })}
                  </div>
                  {field(path + '.label', 'Highlight label')}
                  {field(path + '.context', 'Supporting detail')}
                </>
              ),
              12,
            )}
          </>
        );
      case 'about':
        return (
          <>
            {headingFields('about')}
            {strings('about.paragraphs', 'Paragraph', 12, true)}
            <p className="homepage-help">Use **bold text** to emphasize a name or phrase.</p>
            {strings('about.tags', 'Skill tag')}
            {fieldsLink('about.link', 'About link')}
          </>
        );
      case 'experience':
        return (
          <>
            {headingFields('experience')}
            {field('experience.description', 'Section introduction', { area: true })}
            {fieldsLink('experience.link', 'Experience link')}
            {repeat(
              'experience.items',
              'Experience entry',
              {
                dates: 'Present',
                role: 'New role',
                company: 'Company',
                description: 'Describe your work and contributions.',
              },
              (path) => (
                <>
                  <div className="homepage-field-grid">
                    {field(path + '.role', 'Role')}
                    {field(path + '.company', 'Company')}
                    {field(path + '.dates', 'Dates')}
                  </div>
                  {field(path + '.description', 'Role description', { area: true })}
                </>
              ),
              20,
            )}
          </>
        );
      case 'tools':
        return (
          <>
            {headingFields('tools')}
            {fieldsLink('tools.link', 'All tools link')}
            {repeat(
              'tools.items',
              'Tool',
              {
                title: 'New tool',
                description: 'A short description of what this tool does.',
                href: '/tools',
                icon: 'code',
              },
              (path) => (
                <>
                  <div className="homepage-field-grid">
                    {field(path + '.title', 'Tool name')}
                    {iconField(path + '.icon')}
                  </div>
                  {field(path + '.description', 'Tool description', { area: true })}
                  {field(path + '.href', 'Tool destination', {
                    hint: 'A local page, #section, or https:// address.',
                  })}
                </>
              ),
            )}
          </>
        );
      case 'writeups':
        return (
          <>
            {headingFields('writeups')}
            {field('writeups.description', 'Writeups introduction', { area: true })}
            <label className="homepage-field">
              <span>Number of recent writeups</span>
              <select
                aria-label="Number of recent writeups"
                value={data.writeups.count}
                onChange={(e) => change('writeups.count', Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} writeup{n > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            </label>
            {fieldsLink('writeups.link', 'See more button')}
            <div className="homepage-context-note">
              Published writeups appear automatically, newest first. Add thumbnails and edit posts
              in <Link href="/admin/posts">Writeups ↗</Link>. Draft posts stay private. This section
              appears once there is published writing.
            </div>
          </>
        );
      case 'contact':
        return (
          <>
            {field('contact.eyebrow', 'Section label')}
            <div className="homepage-field-grid">
              {field('contact.heading', 'Contact heading')}
              {field('contact.accentHeading', 'Contact accent heading')}
            </div>
            {field('contact.description', 'Invitation text', { area: true })}
            <div className="homepage-field-grid">
              {field('contact.email', 'Contact email', { maxLength: 250 })}
              {field('contact.emailLabel', 'Email link text', {
                hint: 'Leave blank to display your email address.',
              })}
            </div>
            {fieldsLink('contact.link', 'Contact details link')}
          </>
        );
      case 'footer':
        return (
          <>
            {field('footer.copyright', 'Copyright line', {
              hint: 'Use {year} to keep the year up to date automatically.',
            })}
            {repeat(
              'footer.links',
              'Footer link',
              { label: 'New page', href: '/' },
              (path) => fieldsLink(path, 'Footer link'),
              12,
            )}
            <button
              type="button"
              className="text-link homepage-copy-navigation"
              onClick={() =>
                change('footer.links', [
                  ...data.navigation.items.map((item) => ({ ...item })),
                  ...(data.navigation.contact.enabled
                    ? [
                        {
                          id: crypto.randomUUID(),
                          label: data.navigation.contact.label,
                          href: data.navigation.contact.href,
                        },
                      ]
                    : []),
                ])
              }
            >
              Use my header links
            </button>
            <section className="homepage-subsection">
              <h3>Back to top</h3>
              <Toggle
                label="Show back-to-top link"
                checked={data.footer.showBackToTop}
                onChange={(value) => change('footer.showBackToTop', value)}
              />
              {field('footer.backToTop', 'Back-to-top label', { maxLength: 60 })}
            </section>
          </>
        );
    }
  }
  function iconField(path: string) {
    return (
      <label className="homepage-field">
        <span>Icon</span>
        <select
          aria-label="Icon"
          value={String(readAt(data, path))}
          onChange={(event) => change(path, event.target.value)}
        >
          {homeIcons.map((icon) => (
            <option key={icon} value={icon}>
              {icon.charAt(0).toUpperCase() + icon.slice(1)}
            </option>
          ))}
        </select>
      </label>
    );
  }
  const label =
    panel === 'branding'
      ? 'Brand & navigation'
      : panel === 'layout'
        ? 'Page layout'
        : panel === 'footer'
          ? 'Footer'
          : sectionLabels[panel];
  const options: [Panel, string][] = [
    ['layout', 'Page layout'],
    ['branding', 'Brand & navigation'],
    ...data.order.map((key) => [key, sectionLabels[key]] as [Panel, string]),
    ['footer', 'Footer'],
  ];
  const filteredOptions = options.filter(([key, label]) =>
    `${label} ${descriptions[key]}`.toLowerCase().includes(sectionQuery.trim().toLowerCase()),
  );
  const closePreview = useCallback(() => {
    setPreview(false);
    previewButton.current?.focus();
  }, []);
  return (
    <div className="homepage-editor">
      <div className="admin-heading homepage-editor-heading">
        <div>
          <span className="eyebrow">WEBSITE / HOMEPAGE STUDIO</span>
          <h1>
            Your homepage<span className="accent">.</span>
          </h1>
          <p>Your words. Your layout. Everything in one place.</p>
        </div>
        <div className="homepage-top-actions">
          <button
            ref={previewButton}
            type="button"
            className="button"
            disabled={!!uploading || pending}
            onClick={() => {
              if (validate()) setPreview(true);
            }}
          >
            <Eye size={17} />
            Preview
          </button>
          <button
            type="button"
            className="button button-dark"
            onClick={save}
            disabled={pending || !!uploading || !dirty}
          >
            {pending ? <Loader2 size={17} className="spin" /> : <Save size={17} />}{' '}
            {pending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
      <div className="homepage-save-strip">
        <span className={dirty ? 'is-dirty' : saved ? 'is-saved' : ''}>
          {dirty ? <span className="homepage-dirty-dot" /> : <Check size={14} />}{' '}
          {pending
            ? 'Saving to your website…'
            : dirty
              ? 'Unsaved changes'
              : saved
                ? 'Saved to your website'
                : 'You’re viewing the saved homepage'}
        </span>
        <span>
          {uploading
            ? 'Optimizing image…'
            : dirty && recoverySaved
              ? 'Recovery copy saved in this browser'
              : 'Changes go live when you save.'}
        </span>
      </div>
      <section className="homepage-overview" aria-label="Homepage editor overview">
        <div>
          <span className="homepage-overview-icon">
            <PanelsTopLeft size={20} />
          </span>
          <div>
            <strong>
              {enabledSections}
              <small> / {data.order.length}</small>
            </strong>
            <span>Sections enabled</span>
          </div>
        </div>
        <div>
          <span className="homepage-overview-icon clay">
            <Pencil size={19} />
          </span>
          <div>
            <strong>{changedPanels.length}</strong>
            <span>
              {changedPanels.length === 1
                ? 'Section with unsaved edits'
                : 'Sections with unsaved edits'}
            </span>
          </div>
        </div>
        <Link href="/" target="_blank" rel="noopener noreferrer">
          <span className="homepage-overview-icon">
            <Globe size={20} />
          </span>
          <div>
            <strong>
              View live homepage <ArrowUpRight size={15} />
            </strong>
            <span>Opens your saved website</span>
          </div>
        </Link>
      </section>
      {recovery && (
        <div className="homepage-recovery">
          <div>
            <strong>A local draft is available.</strong>
            <p>
              {recovery.revision === initialRevision
                ? 'You can restore the edits left in this browser.'
                : 'This copy is from an older version. Review it carefully before saving.'}
            </p>
          </div>
          <button
            className="text-link"
            type="button"
            disabled={pending}
            onClick={() => {
              setData(recovery.data);
              setSaved(false);
              setRecovery(null);
            }}
          >
            Restore draft
          </button>
          <button
            className="text-link"
            type="button"
            disabled={pending}
            onClick={() => {
              try {
                localStorage.removeItem('ducky-homepage-recovery');
              } catch {}
              setRecovery(null);
            }}
          >
            Discard copy
          </button>
        </div>
      )}
      {error && (
        <div className="form-error homepage-error-summary" role="alert">
          <div>
            <strong>{error}</strong>
            {Object.keys(errors).length > 0 && (
              <ul>
                {Object.entries(errors)
                  .slice(0, 6)
                  .map(([path, message]) => (
                    <li key={path}>
                      <button type="button" onClick={() => revealField(path)}>
                        {describeHomepageField(path)}
                      </button>
                      : {message}
                    </li>
                  ))}
              </ul>
            )}
          </div>
          {conflict && (
            <button
              type="button"
              className="button button-small"
              onClick={() => window.location.reload()}
            >
              Reload editor
            </button>
          )}
        </div>
      )}
      {saved && !dirty && (
        <div className="form-success" role="status">
          <Check size={17} />
          Your homepage is updated.{' '}
          {mergedSave && <span>Unrelated changes from another tab were kept.</span>}
          <Link href="/" target="_blank">
            View website ↗
          </Link>
        </div>
      )}
      <div className="homepage-editor-grid">
        <aside className="homepage-editor-sidebar">
          <div className="homepage-sidebar-heading">
            <PanelsTopLeft size={19} />
            <span>YOUR PAGE, SECTION BY SECTION</span>
          </div>
          <div className="homepage-section-search">
            <Search size={15} />
            <input
              aria-label="Find homepage section"
              placeholder="Find a section…"
              value={sectionQuery}
              onChange={(event) => setSectionQuery(event.target.value)}
            />
            {sectionQuery && (
              <button
                type="button"
                aria-label="Clear section search"
                onClick={() => setSectionQuery('')}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <label className="homepage-section-select">
            Editing section
            <select
              aria-label="Editing section"
              value={panel}
              onChange={(event) => setPanel(event.target.value as Panel)}
            >
              {options.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <nav aria-label="Homepage editor sections">
            {filteredOptions.map(([key, label]) => {
              const Icon =
                key === 'layout'
                  ? LayoutTemplate
                  : key === 'branding'
                    ? PanelTop
                    : key === 'footer'
                      ? PanelBottom
                      : sectionIcons[key];
              return (
                <button
                  type="button"
                  key={key}
                  className={[
                    panel === key ? 'active' : '',
                    changedPanels.includes(key) ? 'is-edited' : '',
                    invalidPanels.has(key) ? 'has-errors' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-label={label}
                  aria-current={panel === key ? 'true' : undefined}
                  onClick={() => setPanel(key)}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                  {invalidPanels.has(key) ? (
                    <span className="homepage-nav-error" aria-hidden="true">
                      !
                    </span>
                  ) : changedPanels.includes(key) ? (
                    <span
                      className="homepage-nav-edited"
                      aria-hidden="true"
                      title="Unsaved edits"
                    />
                  ) : null}
                  {sectionKeys.includes(key as SectionKey) && !data[key as SectionKey].enabled && (
                    <EyeOff size={14} />
                  )}
                </button>
              );
            })}
          </nav>
          {!filteredOptions.length && (
            <p className="homepage-section-search-empty">
              No sections found. Try “hero”, “links”, or “contact”.
            </p>
          )}
          <div className="homepage-sidebar-note">
            <ShieldCheck size={20} />
            <p>Only saved changes appear on your website. Your draft stays here.</p>
          </div>
        </aside>
        <section className="homepage-editor-panel" aria-labelledby="homepage-panel-title">
          <header>
            <div>
              <span className="eyebrow">
                {panel === 'branding' || panel === 'footer'
                  ? 'ACROSS YOUR WEBSITE'
                  : 'HOMEPAGE CONTENT'}
              </span>
              <h2 id="homepage-panel-title" tabIndex={-1}>
                {label}
              </h2>
              <p>{descriptions[panel]}</p>
            </div>
            <div className="homepage-panel-actions">
              {changedPanels.includes(panel) && (
                <button
                  type="button"
                  className="homepage-reset-section"
                  disabled={pending || !!uploading}
                  onClick={resetSection}
                >
                  <RotateCcw size={13} />
                  Reset this section
                </button>
              )}
              {sectionKeys.includes(panel as SectionKey) && (
                <Toggle
                  disabled={pending}
                  label={`Show ${sectionLabels[panel as SectionKey]} section`}
                  checked={data[panel as SectionKey].enabled}
                  onChange={(value) => change(panel + '.enabled', value)}
                />
              )}
            </div>
          </header>
          <fieldset className="homepage-panel-body" disabled={pending}>
            <legend className="sr-only">{label} fields</legend>
            {content()}
          </fieldset>
          <footer className="homepage-panel-footer">
            <span>{label}</span>
            <span>
              {changedPanels.includes(panel)
                ? 'This section has unsaved edits'
                : 'Editing your saved content'}
            </span>
          </footer>
        </section>
      </div>
      <div className="homepage-publish-bar" role="region" aria-label="Homepage save controls">
        <div>
          <span
            className={dirty ? 'homepage-publish-indicator is-dirty' : 'homepage-publish-indicator'}
          >
            {dirty ? <Pencil size={16} /> : <Check size={17} />}
          </span>
          <div>
            <strong>
              {pending
                ? 'Saving your homepage…'
                : dirty
                  ? `${changedPanels.length} ${changedPanels.length === 1 ? 'section has' : 'sections have'} unsaved edits`
                  : 'Your saved homepage is up to date'}
            </strong>
            <span>
              {uploading
                ? 'Optimizing your image…'
                : dirty
                  ? 'Preview your work, then save to make it live.'
                  : 'Choose any section above to start editing.'}
            </span>
          </div>
        </div>
        <div className="homepage-publish-actions">
          <button
            type="button"
            className="text-link"
            disabled={!dirty || pending || !!uploading}
            onClick={() => {
              setData(JSON.parse(baseline));
              setErrors({});
              setError('');
              setSaved(false);
              try {
                localStorage.removeItem('ducky-homepage-recovery');
              } catch {}
            }}
          >
            <RotateCcw size={14} />
            <span>Discard changes</span>
          </button>
          <button
            type="button"
            className="button button-dark"
            disabled={!dirty || pending || !!uploading}
            onClick={save}
          >
            {pending ? <Loader2 size={16} className="spin" /> : <Save size={16} />}Save homepage
          </button>
        </div>
      </div>
      {preview && (
        <HomepagePreview
          posts={posts}
          data={data}
          profile={profile}
          icons={icons}
          onClose={closePreview}
        />
      )}
    </div>
  );
}
