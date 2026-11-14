'use client';
import { useActionState } from 'react';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import { login } from '@/app/admin/actions';
export function LoginForm() {
  const [state, action, pending] = useActionState(login, {});
  return (
    <form action={action} className="login-form">
      <div className="login-icon">
        <LockKeyhole size={24} />
      </div>
      <span className="eyebrow">YOUR LITTLE CORNER OF THE INTERNET</span>
      <h1>Welcome back.</h1>
      <p>Sign in to write, create, and make it yours.</p>
      <label>
        Username
        <input name="username" required autoComplete="username" autoFocus maxLength={200} />
      </label>
      <label>
        Password
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          maxLength={500}
        />
      </label>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <button className="button button-dark" disabled={pending}>
        {pending ? 'Signing in…' : 'Enter your studio'}
        <ArrowRight size={17} />
      </button>
      <small>Your credentials are configured in your server’s .env file.</small>
    </form>
  );
}
