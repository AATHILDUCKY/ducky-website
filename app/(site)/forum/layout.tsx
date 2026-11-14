import type { Viewport } from 'next';
import './forum.css';
export const viewport: Viewport = { themeColor: '#0d1015', colorScheme: 'dark' };
export default function ForumLayout({ children }: { children: React.ReactNode }) {
  return children;
}
