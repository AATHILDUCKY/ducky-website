export function safeForumUrl(value: string) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}
export function forumLink(value: string): {
  kind: 'instagram' | 'youtube' | 'linkedin' | 'github' | 'link';
  url: string;
  label: string;
  embed?: string;
  portrait?: boolean;
} | null {
  if (!safeForumUrl(value)) return null;
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  const instagram =
    /^(?:www\.)?instagram\.com$/.test(host) &&
    url.pathname.match(/^\/(reel|reels|p|tv)\/([A-Za-z0-9_-]+)(?:\/embed(?:\/captioned)?)?\/?$/);
  if (instagram) {
    const path = `/${instagram[1] === 'reels' ? 'reel' : instagram[1]}/${instagram[2]}/`;
    return {
      kind: 'instagram',
      url: 'https://www.instagram.com' + path,
      embed: 'https://www.instagram.com' + path + 'embed/',
      label: 'Instagram reel or post',
    };
  }
  if (
    [
      'youtube.com',
      'www.youtube.com',
      'm.youtube.com',
      'music.youtube.com',
      'youtu.be',
      'www.youtu.be',
      'www.youtube-nocookie.com',
      'youtube-nocookie.com',
    ].includes(host)
  ) {
    const video =
      host === 'youtu.be' || host === 'www.youtu.be'
        ? url.pathname.match(/^\/([\w-]{11})\/?$/)?.[1]
        : url.pathname === '/watch'
          ? url.searchParams.get('v')
          : url.pathname.match(/^\/(?:shorts|live|embed)\/([\w-]{11})\/?$/)?.[1];
    if (video && /^[\w-]{11}$/.test(video)) {
      const time = url.searchParams.get('t') || url.searchParams.get('start') || '';
      const parts = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(time);
      const seconds = /^\d+$/.test(time)
        ? Number(time)
        : parts
          ? Number(parts[1] || 0) * 3600 + Number(parts[2] || 0) * 60 + Number(parts[3] || 0)
          : 0;
      const start =
        Number.isSafeInteger(seconds) && seconds > 0 && seconds <= 2147483647 ? seconds : 0;
      return {
        kind: 'youtube',
        url: url.pathname.startsWith('/shorts/')
          ? `https://www.youtube.com/shorts/${video}${start ? `?t=${start}` : ''}`
          : `https://www.youtube.com/watch?v=${video}${start ? `&t=${start}` : ''}`,
        embed: `https://www.youtube-nocookie.com/embed/${video}${start ? `?start=${start}` : ''}`,
        label: url.pathname.startsWith('/shorts/') ? 'YouTube Short' : 'YouTube video',
        portrait: url.pathname.startsWith('/shorts/'),
      };
    }
  }
  if (host === 'linkedin.com' || host === 'www.linkedin.com') {
    let path = url.pathname;
    try {
      path = decodeURIComponent(path);
    } catch {
      /* Keep malformed URLs as ordinary links. */
    }
    const urn = path.match(
      /^\/(?:embed\/)?feed\/update\/(urn:li:(?:activity|share|ugcPost):\d{10,25})\/?$/,
    )?.[1];
    const activity = path.match(/^\/posts\/[^/]+-activity-(\d{10,25})(?:-[\w-]+)?\/?$/)?.[1];
    const post = urn || (activity ? `urn:li:activity:${activity}` : '');
    if (post)
      return {
        kind: 'linkedin',
        url: `https://www.linkedin.com/feed/update/${post}/`,
        embed: `https://www.linkedin.com/embed/feed/update/${post}`,
        label: 'LinkedIn post',
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
/** Accept copied provider iframe code as a URL, never as executable HTML. */
export function normalizeForumLinkInput(value: string) {
  const input = value.trim();
  if (!/^<iframe\b/i.test(input)) return input;
  const source = input.match(/\bsrc\s*=\s*(["'])(.*?)\1/i)?.[2]?.replaceAll('&amp;', '&');
  const link = source && forumLink(source);
  return link && link.embed ? link.url : input;
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
