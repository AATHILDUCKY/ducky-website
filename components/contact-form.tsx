'use client';
import { useActionState, useEffect, useRef, useState } from 'react';
import { Send, CheckCircle2 } from 'lucide-react';
import { submitContactRequest } from '@/app/contact-actions';
const empty = { name: '', email: '', subject: '', message: '' };
export function ContactForm() {
  const [state, action, pending] = useActionState(submitContactRequest, {});
  const [values, setValues] = useState(empty);
  const [submissionId, setSubmissionId] = useState('');
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    setSubmissionId(crypto.randomUUID());
  }, []);
  useEffect(() => {
    if (state.success) {
      setValues(empty);
      setSubmissionId(crypto.randomUUID());
    } else if (state.errors)
      ref.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state]);
  return (
    <section className="contact-request-section container" aria-labelledby="contact-request-title">
      <div className="contact-request-intro">
        <span className="eyebrow">LET’S CONNECT</span>
        <h2 id="contact-request-title">Send me a message.</h2>
        <p>Have a question, an idea, or a collaboration in mind? Leave the details here.</p>
        <span className="contact-privacy">Your message is shared privately with Aathil.</span>
      </div>
      <form ref={ref} action={action} className="contact-request-form">
        <input type="hidden" name="submissionId" value={submissionId} />
        <div className="contact-field-grid">
          {(['name', 'email', 'subject', 'message'] as const).map((field) => (
            <div className={`contact-field contact-field-${field}`} key={field}>
              <label htmlFor={`contact-${field}`}>
                {field === 'name'
                  ? 'Your name'
                  : field === 'email'
                    ? 'Email address'
                    : field === 'subject'
                      ? 'Subject'
                      : 'Message'}
              </label>
              {field === 'message' ? (
                <textarea
                  id={`contact-${field}`}
                  name={field}
                  required
                  minLength={10}
                  maxLength={5000}
                  rows={6}
                  value={values[field]}
                  onChange={(e) => setValues({ ...values, [field]: e.target.value })}
                  aria-invalid={!!state.errors?.[field]}
                  aria-describedby={state.errors?.[field] ? `${field}-error` : undefined}
                  placeholder="Tell me a little about what you have in mind…"
                />
              ) : (
                <input
                  id={`contact-${field}`}
                  name={field}
                  required
                  type={field === 'email' ? 'email' : 'text'}
                  autoComplete={field === 'name' ? 'name' : field === 'email' ? 'email' : undefined}
                  minLength={field === 'name' ? 2 : field === 'subject' ? 3 : undefined}
                  maxLength={field === 'name' ? 100 : field === 'email' ? 254 : 160}
                  value={values[field]}
                  onChange={(e) => setValues({ ...values, [field]: e.target.value })}
                  aria-invalid={!!state.errors?.[field]}
                  aria-describedby={state.errors?.[field] ? `${field}-error` : undefined}
                />
              )}
              {state.errors?.[field] && (
                <small className="contact-field-error" id={`${field}-error`}>
                  {state.errors[field][0]}
                </small>
              )}
            </div>
          ))}
        </div>
        <div
          className={`contact-feedback ${state.success ? 'success' : ''}`}
          role="status"
          aria-live="polite"
        >
          {state.success && <CheckCircle2 size={19} />} {state.message}
        </div>
        <button className="button button-dark" disabled={pending} type="submit">
          <Send size={18} />
          {pending ? 'Sending…' : 'Send message'}
        </button>
      </form>
    </section>
  );
}
