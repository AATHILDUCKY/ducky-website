export function safeForumUrl(value: string) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}
export function forumLink(
  value: string,
): { kind: 'instagram' | 'github' | 'link'; url: string; label: string; embed?: string } | null {
  if (!safeForumUrl(value)) return null;
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  const instagram =
    /^(?:www\.)?instagram\.com$/.test(host) &&
    url.pathname.match(/^\/(reel|reels|p|tv)\/([A-Za-z0-9_-]+)\/?$/);
  if (instagram) {
    const path = `/${instagram[1] === 'reels' ? 'reel' : instagram[1]}/${instagram[2]}/`;
    return {
      kind: 'instagram',
      url: 'https://www.instagram.com' + path,
      embed: 'https://www.instagram.com' + path + 'embed/',
      label: 'Instagram reel or post',
    };
  }
  if (host === 'github.com' || host === 'www.github.com')
    return {
      kind: 'github',
      url: url.href,
      label: url.pathname.split('/').filter(Boolean).slice(0, 2).join(' / ') || 'GitHub',
    };
  return { kind: 'link', url: url.href, label: host + (url.pathname === '/' ? '' : url.pathname) };
}
export function forumLinks(content: string, explicit = '') {
  const found = [explicit, ...(content.match(/https?:\/\/[^\s<>"\])]+/g) || [])];
  const seen = new Set<string>();
  return found
    .flatMap((value) => {
      const link = forumLink(value.replace(/[.,;!]+$/, ''));
      if (!link || seen.has(link.url)) return [];
      // Only the explicit link and recognized social links become cards.
      if (link.kind === 'link' && value !== explicit) return [];
      seen.add(link.url);
      return [link];
    })
    .slice(0, 3);
}
