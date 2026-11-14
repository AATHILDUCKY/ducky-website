import { ReferencePage } from '@/components/reference-page';
import { PageAd } from '@/components/page-ad';
export const metadata = {
  title: 'Tools',
  description: 'Browser-based tools for identity security, application security, and 3D design.',
  alternates: { canonical: '/tools' },
};
export default function Page() {
  return (
    <>
      <ReferencePage name="tools" />
      <PageAd contained />
    </>
  );
}
