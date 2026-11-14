import { renderReference } from '@/lib/reference';
import { getProfile } from '@/lib/db';
import { ReferenceContent } from './reference-content';
export async function ReferencePage({ name }: { name: 'about' | 'tools' | 'contact' }) {
  const [html, profile] = await Promise.all([renderReference(name), getProfile()]);
  const pageHtml =
    name === 'about'
      ? html.replace(
          /(<h[12]\b[^>]*id="(?:about-heading|experience-heading)"[^>]*>)([\s\S]*?)(<\/h[12]>)/g,
          (_match, opening: string, content: string, closing: string) =>
            opening +
            content
              .split(/<br\s*\/?>/i)
              .map((line: string) => `<span class="about-title-line">${line}</span>`)
              .join('') +
            closing,
        )
      : html;
  return <ReferenceContent html={pageHtml} email={profile.email} />;
}
