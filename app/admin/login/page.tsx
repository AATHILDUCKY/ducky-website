import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth';
import { LoginForm } from '@/components/login-form';
export default async function Login() {
  if (await isAdmin()) redirect('/admin');
  return (
    <main className="login-page">
      <Link className="login-brand" href="/">
        aathilducky<span className="accent">.</span> <span>studio</span>
      </Link>
      <LoginForm />
      <Link className="text-link" href="/">
        ← Back to the website
      </Link>
    </main>
  );
}
