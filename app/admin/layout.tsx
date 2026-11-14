import '@/app/studio.css';
import '@/app/block-editor.css';
import './social-settings.css';
export const metadata = {
  title: { default: 'Studio · Aathilducky', template: '%s · Studio' },
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="app-theme">{children}</div>;
}
