import { ContactForm } from '@/components/contact-form';
import './contact.css';
import { ReferencePage } from '@/components/reference-page';
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
    </>
  );
}
