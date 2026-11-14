'use client';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import '@/app/(site)/public-theme.css';
import '@/app/(site)/home-signature.css';
import '@/app/(site)/home-poster.css';
import '@/app/(site)/home-editorial.css';
import '@/app/(site)/home-night.css';
import { Monitor, Smartphone, X } from 'lucide-react';
import { ReferenceFrame } from './reference-frame';
import { HomepageSections } from './homepage-sections';
import type { Homepage } from '@/lib/homepage-schema';
import type { Profile, PostSummary } from '@/lib/types';
export function HomepagePreview({
  data,
  posts,
  profile,
  icons,
  onClose,
}: {
  data: Homepage;
  posts: PostSummary[];
  profile: Profile;
  icons: string;
  onClose: () => void;
}) {
  const [mobile, setMobile] = useState(false);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [scale, setScale] = useState(1);
  const container = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') {
        const buttons = [
          ...document.querySelectorAll<HTMLButtonElement>('.homepage-preview-modal button'),
        ];
        if (event.shiftKey && document.activeElement === buttons[0]) {
          event.preventDefault();
          buttons.at(-1)?.focus();
        } else if (!event.shiftKey && document.activeElement === buttons.at(-1)) {
          event.preventDefault();
          buttons[0]?.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener('keydown', key);
    };
  }, [onClose]);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver((entries) =>
      setScale(
        Math.max(0.1, Math.min(1, (entries[0].contentRect.width - 24) / (mobile ? 390 : 1280))),
      ),
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [mobile]);
  function load() {
    const doc = frame.current?.contentDocument;
    if (!doc) return;
    doc.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') onClose();
    });
    for (const element of document.querySelectorAll('link[rel="stylesheet"],style'))
      doc.head.appendChild(element.cloneNode(true));
    const style = doc.createElement('style');
    style.textContent = 'body{margin:0}html{scroll-behavior:auto}';
    doc.head.appendChild(style);
    setTarget(doc.body);
  }
  return (
    <div className="homepage-preview-backdrop">
      <section
        className="homepage-preview-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="homepage-preview-title"
      >
        <header>
          <div>
            <h2 id="homepage-preview-title">Homepage preview</h2>
            <p>Previewing your current draft. Save changes to update the website.</p>
          </div>
          <div className="preview-device-buttons">
            <button
              type="button"
              aria-label="Desktop preview"
              aria-pressed={!mobile}
              className={!mobile ? 'selected' : ''}
              onClick={() => setMobile(false)}
            >
              <Monitor size={18} />
              <span>Desktop</span>
            </button>
            <button
              type="button"
              aria-label="Mobile preview"
              aria-pressed={mobile}
              className={mobile ? 'selected' : ''}
              onClick={() => setMobile(true)}
            >
              <Smartphone size={18} />
              <span>Mobile</span>
            </button>
          </div>
          <button
            ref={closeButton}
            className="icon-button"
            type="button"
            aria-label="Close homepage preview"
            onClick={onClose}
          >
            <X size={23} />
          </button>
        </header>
        <div className="homepage-preview-stage" ref={container}>
          <div
            style={{
              width: (mobile ? 390 : 1280) * scale,
              height: Math.max(400, window.innerHeight - 190),
            }}
          >
            <iframe
              ref={frame}
              srcDoc={
                '<!doctype html><html lang="en" data-theme="light"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body></body></html>'
              }
              sandbox="allow-same-origin"
              title="Homepage draft preview"
              onLoad={load}
              tabIndex={-1}
              style={{
                width: mobile ? 390 : 1280,
                height: Math.max(400, (window.innerHeight - 190) / scale),
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                border: 0,
                background: 'var(--color-page)',
              }}
            />
            {target &&
              createPortal(
                <div
                  onClickCapture={(event) => {
                    if ((event.target as Element).closest('a')) event.preventDefault();
                  }}
                >
                  <ReferenceFrame
                    icons={icons}
                    preview
                    site={{
                      branding: data.branding,
                      navigation: data.navigation,
                      footer: data.footer,
                    }}
                  >
                    <HomepageSections
                      data={data}
                      availability={profile.availability}
                      posts={posts}
                      profile={profile}
                    />
                  </ReferenceFrame>
                </div>,
                target,
              )}
          </div>
        </div>
      </section>
    </div>
  );
}
