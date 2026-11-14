import { z } from 'zod';
import {
  homepageSchema,
  sectionLabels,
  sectionKeys,
  type Homepage,
  type SectionKey,
} from './homepage-schema';
export type HomePanel = 'layout' | 'branding' | 'footer' | SectionKey;
export const homepageEditableKeys = [
  'branding',
  'navigation',
  'footer',
  'order',
  ...sectionKeys,
] as const;
export type HomepageKey = (typeof homepageEditableKeys)[number];
export type HomepageHashes = Record<HomepageKey, string>;
export const homepagePanelNames: Record<HomePanel, string> = {
  layout: 'Page layout',
  branding: 'Brand & navigation',
  footer: 'Footer',
  ...sectionLabels,
};
export function panelForHomeField(path: string): HomePanel {
  const key = path.split('.')[0];
  if (key === 'branding' || key === 'navigation') return 'branding';
  if (key === 'order' || key === 'version') return 'layout';
  if (key === 'footer') return 'footer';
  return sectionKeys.includes(key as SectionKey) ? (key as SectionKey) : 'layout';
}
export function homepageFieldId(path: string) {
  return 'homepage-' + path.replaceAll('.', '-');
}
export function homepageFieldSpec(path: string) {
  let schema: z.ZodType = homepageSchema;
  for (const part of path.split('.')) {
    if (schema instanceof z.ZodObject) {
      const next = schema.shape[part];
      if (!next) return { maxLength: 4000, required: false };
      schema = next;
    } else if (schema instanceof z.ZodArray) schema = schema.element as z.ZodType;
    else return { maxLength: 4000, required: false };
  }
  return {
    maxLength: schema instanceof z.ZodString ? (schema.maxLength ?? 4000) : 4000,
    required: !schema.safeParse('').success,
  };
}
export function changedHomepagePanels(before: Homepage, after: Homepage): HomePanel[] {
  const different = (key: HomepageKey) =>
    JSON.stringify(before[key]) !== JSON.stringify(after[key]);
  return [
    different('order') ? 'layout' : null,
    different('branding') || different('navigation') ? 'branding' : null,
    ...sectionKeys.filter(different),
    different('footer') ? 'footer' : null,
  ].filter((key): key is HomePanel => !!key);
}
export function describeHomepageField(path: string) {
  const parts = path.split('.');
  const names: Record<string, string> = {
    items: '',
    buttons: 'Button',
    links: 'Link',
    paragraphs: 'Paragraph',
    tags: 'Tag',
    href: 'Destination',
    src: 'Image',
    enabled: 'Visibility',
    eyebrow: 'Section label',
    accentHeading: 'Accent heading',
    topLabel: 'Top label',
    homeLabel: 'Home link label',
    logoAlt: 'Logo description',
    font: 'Brand font',
    fontWeight: 'Brand font weight',
    emailLabel: 'Email link text',
    backToTop: 'Back-to-top label',
    showBackToTop: 'Back-to-top visibility',
    learningLabel: 'Learning label',
    learningText: 'Learning text',
  };
  return [
    homepagePanelNames[panelForHomeField(path)],
    ...parts
      .slice(1)
      .map((part) =>
        /^\d+$/.test(part)
          ? `Item ${Number(part) + 1}`
          : (names[part] ??
            part.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase())),
      ),
  ]
    .filter(Boolean)
    .join(' → ');
}
/** Field errors can belong to a collapsed item; reveal that item before focusing it. */
export function homepageItemForField(data: Homepage, path: string): string | null {
  const parts = path.split('.');
  const numeric = parts.findIndex((part) => /^\d+$/.test(part));
  if (numeric < 0) return null;
  let item: unknown = data;
  for (const part of parts.slice(0, numeric + 1)) item = (item as Record<string, unknown>)?.[part];
  return item && typeof item === 'object' && 'id' in item
    ? parts.slice(0, numeric).join('.') + '::' + String(item.id)
    : null;
}
