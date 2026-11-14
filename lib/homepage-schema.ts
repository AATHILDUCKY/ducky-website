import { z } from 'zod';
import { brandFontIds } from './brand-fonts';
import { isRemovedPageHref } from './site-navigation.mjs';
export const sectionKeys = [
  'hero',
  'highlights',
  'about',
  'experience',
  'tools',
  'writeups',
  'contact',
] as const;
export type SectionKey = (typeof sectionKeys)[number];
export const sectionLabels: Record<SectionKey, string> = {
  hero: 'Hero & portrait',
  highlights: 'Highlights',
  about: 'About introduction',
  experience: 'Experience',
  tools: 'Tools',
  writeups: 'Recent writeups',
  contact: 'Contact',
};
export const homeIcons = [
  'arrow',
  'right',
  'key',
  'search',
  'shield',
  'code',
  'command',
  'globe',
  'book',
  'mail',
  'cube',
] as const;
export function validHomeHref(value: string) {
  if (!value || /[\\\u0000-\u0020]/.test(value) || isRemovedPageHref(value)) return false;
  if (value.startsWith('/')) return !value.startsWith('//');
  if (value.startsWith('#')) return /^#[A-Za-z0-9_-]+$/.test(value);
  if (value.startsWith('mailto:')) return z.email().safeParse(value.slice(7)).success;
  if (value.startsWith('tel:')) return /^tel:\+?[0-9().-]{3,30}$/.test(value);
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}
const text = (max = 300) =>
  z.string().trim().min(1, 'Please enter a value.').max(max, `Use ${max} characters or fewer.`);
const optional = (max = 300) => z.string().trim().max(max);
export const homeHref = z
  .string()
  .trim()
  .max(500)
  .refine(validHomeHref, 'Use /page, #section, an https:// URL, or mailto:email@example.com.');
export const homeImage = z
  .string()
  .refine(
    (v) =>
      v === '' ||
      /^\/media\/[0-9a-f-]{36}$/i.test(v) ||
      ['/reference/ducky-badge.webp', '/reference/portrait.webp', '/portrait.webp'].includes(v),
    'Please upload an image using the image picker.',
  );
const id = text(64);
const link = z.object({ id, label: text(100), href: homeHref });
const button = link.extend({ style: z.enum(['primary', 'secondary']), icon: z.enum(homeIcons) });
const section = z.object({ enabled: z.boolean() });
const tags = z.array(text(80)).max(20);
export const homepageSchema = z
  .object({
    version: z.literal(3),
    branding: z.object({
      name: text(50),
      font: z.enum(brandFontIds).default('system'),
      fontWeight: z
        .union([z.literal(500), z.literal(600), z.literal(700), z.literal(800)])
        .default(700),
      logo: homeImage,
      logoAlt: optional(180),
      homeLabel: text(180),
    }),
    navigation: z.object({
      items: z.array(link).max(10),
      contact: z.object({ enabled: z.boolean(), label: text(80), href: homeHref }),
    }),
    footer: z.object({
      copyright: text(300),
      links: z.array(link).max(12),
      backToTop: text(60),
      showBackToTop: z.boolean(),
    }),
    order: z
      .array(z.enum(sectionKeys))
      .length(sectionKeys.length)
      .refine(
        (v) => new Set(v).size === sectionKeys.length,
        'Each section must appear exactly once.',
      ),
    hero: section.extend({
      eyebrow: text(180),
      heading: optional(180),
      accentHeading: text(180),
      description: text(3000),
      learningLabel: optional(100),
      learningText: optional(1000),
      buttons: z.array(button).max(4),
      location: optional(150),
      note: optional(200),
      portrait: z.object({
        visible: z.boolean(),
        src: homeImage,
        alt: optional(180),
        topLabel: optional(120),
        index: optional(50),
        name: text(120),
        subtitle: optional(200),
        tags,
      }),
    }),
    highlights: section.extend({
      label: text(180),
      items: z
        .array(
          z.object({
            id,
            value: text(40),
            suffix: optional(30),
            label: text(180),
            context: optional(300),
          }),
        )
        .max(12),
    }),
    about: section.extend({
      eyebrow: text(120),
      heading: text(240),
      paragraphs: z.array(text(4000)).max(12),
      tags,
      link,
    }),
    experience: section.extend({
      eyebrow: text(120),
      heading: text(240),
      description: optional(3000),
      link,
      items: z
        .array(
          z.object({
            id,
            dates: text(100),
            role: text(180),
            company: text(180),
            description: text(3000),
          }),
        )
        .max(20),
    }),
    tools: section.extend({
      eyebrow: text(120),
      heading: text(240),
      link,
      items: z
        .array(
          z.object({
            id,
            title: text(180),
            description: text(2000),
            href: homeHref,
            icon: z.enum(homeIcons),
          }),
        )
        .max(16),
    }),
    writeups: section.extend({
      eyebrow: text(120),
      heading: text(240),
      description: optional(1000),
      count: z.number().int().min(1).max(6),
      link,
    }),
    contact: section.extend({
      eyebrow: text(120),
      heading: text(180),
      accentHeading: text(180),
      description: text(3000),
      email: z.email().max(254),
      emailLabel: optional(180),
      link,
    }),
  })
  .superRefine((data, ctx) => {
    const lists: [string, { id: string }[]][] = [
      ['navigation.items', data.navigation.items],
      ['footer.links', data.footer.links],
      ['hero.buttons', data.hero.buttons],
      ['highlights.items', data.highlights.items],
      ['experience.items', data.experience.items],
      ['tools.items', data.tools.items],
    ];
    for (const [path, items] of lists)
      if (new Set(items.map((x) => x.id)).size !== items.length)
        ctx.addIssue({
          code: 'custom',
          path: path.split('.'),
          message: 'Every item needs a unique identifier.',
        });
  });
export type Homepage = z.infer<typeof homepageSchema>;
export type HomepageSite = Pick<Homepage, 'branding' | 'navigation' | 'footer'>;
export type HomepageSaveResult = {
  success?: boolean;
  homepage?: Homepage;
  hashes?: import('./homepage-editing').HomepageHashes;
  merged?: boolean;
  error?: string;
  fields?: Record<string, string>;
  revision?: string;
  conflict?: boolean;
};
