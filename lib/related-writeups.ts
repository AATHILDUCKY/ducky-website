import type { Post, PostSummary } from './types';

type Topic = Pick<Post, 'id' | 'slug' | 'title' | 'category' | 'tags'>;
export type RelatedWriteup = { post: PostSummary; reason: string };
const stopWords = new Set(
  'a an and are as at be by for from how i in into is it my of on or our the this to use using was we what when with your'.split(
    ' ',
  ),
);
const normalize = (value: string) => value.normalize('NFKC').trim().toLowerCase();
const titleWords = (title: string) =>
  new Set(
    (normalize(title).match(/[\p{L}\p{N}]+/gu) || []).filter(
      (word) => word.length > 2 && !stopWords.has(word),
    ),
  );
const overlap = (a: Set<string>, b: Set<string>) => {
  const shared = [...a].filter((value) => b.has(value)).length;
  return shared ? shared / (a.size + b.size - shared) : 0;
};

/** Rank topic relevance before freshness, without loading article bodies or tracking readers. */
export function relatedWriteups(
  current: Topic,
  candidates: readonly PostSummary[],
  limit = 3,
  now = Date.now(),
): RelatedWriteup[] {
  const tags = new Set(current.tags.map(normalize).filter(Boolean));
  const category = normalize(current.category);
  const words = titleWords(current.title);
  const seen = new Set<string>();
  return candidates
    .filter((post) => {
      const published = post.published_at ? new Date(post.published_at).getTime() : NaN;
      if (
        post.id === current.id ||
        post.slug === current.slug ||
        post.status !== 'published' ||
        !Number.isFinite(published) ||
        published > now ||
        seen.has(post.slug)
      )
        return false;
      seen.add(post.slug);
      return true;
    })
    .map((post) => {
      const candidateTags = new Set(post.tags.map(normalize).filter(Boolean));
      const tagMatch = overlap(tags, candidateTags);
      const categoryMatch = Boolean(category && category === normalize(post.category));
      const titleMatch = overlap(words, titleWords(post.title));
      return {
        post,
        score: 12 * tagMatch + (categoryMatch ? 4 : 0) + 3 * titleMatch,
        reason: tagMatch
          ? 'Shared topics'
          : categoryMatch
            ? 'Same category'
            : titleMatch
              ? 'Related subject'
              : 'More to explore',
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        new Date(b.post.published_at!).getTime() - new Date(a.post.published_at!).getTime() ||
        a.post.slug.localeCompare(b.post.slug, 'en'),
    )
    .slice(0, Math.max(0, Math.min(3, Math.floor(limit))))
    .map(({ post, reason }) => ({ post, reason }));
}
