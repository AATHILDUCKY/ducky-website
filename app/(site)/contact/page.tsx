import { ContactForm } from '@/components/contact-form';
import './contact.css';
import { ReferencePage } from '@/components/reference-page';
import { PageAd } from '@/components/page-ad';
export const metadata = {
  title: 'Contact',
  description:
    'Contact Aathil Ahamed for security engineering, software development, and collaboration.',
  alternates: { canonical: '/contact' },
};
export default function Page() {
  return (
    <>
      <ReferencePage name="contact" />
      <ContactForm />
      <PageAd contained />
    </>
  );
}
