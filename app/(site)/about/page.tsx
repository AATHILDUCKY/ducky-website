import { ReferencePage } from '@/components/reference-page';
import './about.css';
import { PageAd } from '@/components/page-ad';
export const metadata = {
  title: 'About',
  description:
    'Security Engineer and Full-Stack Developer Aathil Ahamed: experience, skills, and qualifications.',
  alternates: { canonical: '/about' },
};
export default function Page() {
  return (
    <>
      <ReferencePage name="about" />
      <PageAd contained />
    </>
  );
}
