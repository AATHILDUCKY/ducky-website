/** Retired internal destinations must not reappear in editable navigation. */
export function isRemovedPageHref(href) {
  return (
    typeof href === 'string' && /^\/(?:admin\/)?(?:projects|freelance)(?:\/|[?#]|$)/i.test(href)
  );
}
