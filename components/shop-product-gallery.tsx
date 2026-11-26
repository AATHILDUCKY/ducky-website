'use client';

import { useId, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Package } from 'lucide-react';

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [selected, setSelected] = useState(images[0]);
  const imageId = useId();
  const active = Math.max(0, images.indexOf(selected));
  const current = images[active];
  function move(direction: number) {
    setSelected(images[(active + direction + images.length) % images.length]);
  }
  return (
    <figure className="shop-gallery" aria-label={`${name} product photos`}>
      <div className="shop-detail-image" id={imageId}>
        {current ? (
          <Image
            key={current}
            src={`/media/${current}`}
            alt={`${name} — photo ${active + 1} of ${images.length}`}
            fill
            loading="eager"
            fetchPriority="high"
            sizes="(max-width:760px) 90vw, 48vw"
          />
        ) : (
          <Package size={64} aria-label="No product photo" />
        )}
        {images.length > 1 && (
          <div className="shop-gallery-controls">
            <button
              type="button"
              aria-label="Previous product photo"
              aria-controls={imageId}
              onClick={() => move(-1)}
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              aria-label="Next product photo"
              aria-controls={imageId}
              onClick={() => move(1)}
            >
              <ChevronRight size={22} />
            </button>
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div className="shop-thumbnails" role="group" aria-label="Choose a product photo">
          {images.map((id, index) => (
            <button
              key={id}
              type="button"
              className="shop-thumbnail"
              aria-label={`Show photo ${index + 1}${index === 0 ? ' (main image)' : ''}`}
              aria-pressed={active === index}
              aria-controls={imageId}
              onClick={() => setSelected(id)}
            >
              <Image src={`/media/${id}`} alt="" fill sizes="72px" />
            </button>
          ))}
        </div>
      )}
      {current && (
        <figcaption className="shop-gallery-caption" aria-live="polite" aria-atomic="true">
          Photo {active + 1} of {images.length}
          {active === 0 ? ' · Main image' : ''}
        </figcaption>
      )}
    </figure>
  );
}
