// A transparent starting policy, not LinkedIn's proprietary prediction model.
export const FORUM_RANKED_CANDIDATES = 500;
export const FORUM_FEED_CACHE_SECONDS = 60;
export function forumFeedScore(createdAt: string, likes: number, replies: number) {
  return (
    new Date(createdAt).getTime() / 3600000 +
    8 * Math.log1p(Math.min(1000, Math.max(0, likes)) + 2 * Math.min(20, Math.max(0, replies)))
  );
}
export function forumSort(value: unknown): 'top' | 'latest' {
  return value === 'latest' ? 'latest' : 'top';
}
