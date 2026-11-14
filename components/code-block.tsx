'use client';
import { useRef, useState, useEffect } from 'react';
import { Check, Copy } from 'lucide-react';
export function CodeBlock({
  language,
  code,
  children,
}: {
  language: string;
  code: string;
  children: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  async function copy() {
    setError(false);
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(code);
      else {
        const input = document.createElement('textarea');
        input.value = code;
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.append(input);
        input.select();
        const result = document.execCommand('copy');
        input.remove();
        if (!result) throw new Error('Clipboard unavailable');
      }
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(true);
    }
  }
  return (
    <figure className="code-block">
      <figcaption>
        <span className="code-language">
          <span aria-hidden="true">&lt;/&gt;</span>
          {language === 'plaintext' ? 'Plain text' : language}
        </span>
        <button type="button" onClick={copy} aria-label={copied ? 'Code copied' : 'Copy code'}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </figcaption>
      <pre tabIndex={0}>{children}</pre>
      <span className="code-copy-status" role="status" aria-live="polite">
        {error
          ? 'Copy unavailable. Select the code and copy it manually.'
          : copied
            ? 'Code copied to clipboard.'
            : ''}
      </span>
    </figure>
  );
}
