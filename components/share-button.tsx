'use client';
import { Share2, Check } from 'lucide-react';
import { useState } from 'react';
export function ShareButton() {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="share-button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(location.href);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? <Check size={16} /> : <Share2 size={16} />}{' '}
      {copied ? 'Link copied' : 'Share article'}
    </button>
  );
}
