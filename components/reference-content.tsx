'use client';
import { useEffect, useRef } from 'react';
export function ReferenceContent({ html, email }: { html: string; email: string }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const controller = new AbortController();
    const { signal } = controller;
    function filterTools() {
      const search = element!.querySelector<HTMLInputElement>(`#tool-search`);
      if (!search) return;
      const rows = [...element!.querySelectorAll<HTMLElement>(`[data-tool]`)];
      const attribute = 'data-tool-filter';
      const buttons = [...element!.querySelectorAll<HTMLButtonElement>(`[${attribute}]`)];
      let category = 'all';
      const apply = () => {
        const terms = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
        let count = 0;
        for (const row of rows) {
          const match =
            (category === 'all' || row.dataset.category === category) &&
            terms.every((term) => (row.dataset.search || '').includes(term));
          row.hidden = !match;
          if (match) count++;
        }
        const counter = element!.querySelector(`#tool-count`);
        if (counter) counter.textContent = `${count} of ${rows.length} tools`;
        const empty = element!.querySelector<HTMLElement>(`#tool-empty`);
        if (empty) empty.hidden = count !== 0;
        const reset = element!.querySelector<HTMLElement>(`#tool-reset`);
        if (reset) reset.hidden = !terms.length && category === 'all';
        buttons.forEach((b) =>
          b.setAttribute('aria-pressed', String(b.getAttribute(attribute) === category)),
        );
      };
      const controls = element!.querySelector<HTMLElement>(`#tool-controls`);
      if (controls) controls.hidden = false;
      search.addEventListener('input', apply, { signal });
      buttons.forEach((button) =>
        button.addEventListener(
          'click',
          () => {
            category = button.getAttribute(attribute) || 'all';
            apply();
          },
          { signal },
        ),
      );
      element!.querySelector(`#tool-reset`)?.addEventListener(
        'click',
        () => {
          category = 'all';
          search.value = '';
          apply();
          search.focus();
        },
        { signal },
      );
      apply();
    }
    filterTools();
    const copy = element.querySelector<HTMLButtonElement>('#copy-email');
    if (copy && navigator.clipboard && window.isSecureContext) {
      copy.hidden = false;
      copy.addEventListener(
        'click',
        async () => {
          const feedback = element.querySelector('#copy-feedback');
          try {
            await navigator.clipboard.writeText(email);
            if (feedback) feedback.textContent = 'Email address copied.';
          } catch {
            if (feedback) feedback.textContent = 'Please use the email link above.';
          }
        },
        { signal },
      );
    }
    return () => controller.abort();
  }, [html, email]);
  return <div ref={root} dangerouslySetInnerHTML={{ __html: html }} />;
}
