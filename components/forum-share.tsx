'use client';
import { useState } from 'react';
import { Check, Share2 } from 'lucide-react';
export function ForumShare({ url, title }: { url: string; title: string }) {
  const [message, setMessage] = useState('');
  return (
    <button
      type="button"
      onClick={async () => {
        const absolute = new URL(url, location.origin).href;
        try {
          if (navigator.share) await navigator.share({ url: absolute, title });
          else {
            await navigator.clipboard.writeText(absolute);
            setMessage('Link copied');
          }
        } catch (error) {
          if ((error as Error).name !== 'AbortError') setMessage(absolute);
        }
      }}
    >
      {message ? <Check size={17} /> : <Share2 size={17} />}
      <span>{message || 'Share'}</span>
    </button>
  );
}
