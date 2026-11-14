'use client';
import { useEffect, useRef, useState } from 'react';
import { authorInitials } from '@/lib/article-author';
export function AuthorAvatar({ name, portrait }: { name: string; portrait: string }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    // Cached failures may finish before React attaches the image error listener.
    if (image.current?.complete && !image.current.naturalWidth) setFailedSource(portrait);
  }, [portrait]);
  return (
    <span className="author-avatar" aria-hidden="true">
      <span>{authorInitials(name)}</span>
      {portrait && portrait !== failedSource && (
        <img
          ref={image}
          src={portrait}
          alt=""
          width={48}
          height={48}
          decoding="async"
          onError={() => setFailedSource(portrait)}
        />
      )}
    </span>
  );
}
