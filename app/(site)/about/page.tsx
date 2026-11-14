import { ReferencePage } from '@/components/reference-page';
import './about.css';
export const metadata = {
  title: 'About',
  description:
    'Security Engineer and Full-Stack Developer Aathil Ahamed: experience, skills, and qualifications.',
  alternates: { canonical: '/about' },
};
export default function Page() {
  return <ReferencePage name="about" />;
}
