/** @param {string} title @param {string} id */
export function createForumSlug(title, id) {
  const words = title
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  const stem = Array.from(words).slice(0, 80).join('').replace(/-+$/g, '') || 'post';
  return `${stem}-${id.replaceAll('-', '').slice(0, 12)}`;
}
/** @param {{id:string,slug?:string|null}} post */
export function forumPostPath(post) {
  return '/forum/' + encodeURIComponent(post.slug || post.id);
}
