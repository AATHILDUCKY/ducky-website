export const ADSENSE_CLIENT = 'ca-pub-6405478732026557';
export const ADSENSE_SCRIPT_URL = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;

export function isAdPage(pathname: string) {
  const path = pathname.replace(/\/+$/, '') || '/';
  return (
    ['/about', '/tools', '/contact', '/research', '/blog', '/forum'].includes(path) ||
    /^\/blog\/[^/]+$/.test(path) ||
    (path !== '/forum/new' && /^\/forum\/[^/]+$/.test(path))
  );
}

export function adSlotId(value: string | undefined) {
  const slot = value?.trim() || '';
  return /^\d+$/.test(slot) ? slot : '';
}
