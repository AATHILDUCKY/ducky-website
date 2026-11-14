# Forum implementation and research

The forum lives at `/forum`, with permanent, server-rendered discussions at `/forum/<id>`. Only the existing signed-in administrator can publish, edit, attach images, preview Markdown, or change a post to a private draft. Visitors can publish text replies without an account. The author can hide and restore replies. The public header, footer, and admin sidebar link to the forum.

## Feed and search

The forum now uses a content-only social feed with anonymous likes and Top/Latest ordering. See [current ranking policy and research](forum-feed-ranking.md) for the formula, bounded snapshots, cached counters, and reaction identity.

Each request reads at most 11 posts and renders 10. The extra row determines whether another page exists, without an expensive total count. An `IntersectionObserver` starts the next request near the end of the feed; a single-flight guard prevents concurrent duplicate loads. The next link remains an ordinary `<a href>` and its destination renders the same next batch without JavaScript. Failures retain already loaded posts and offer retry and regular navigation. Offscreen cards use `content-visibility: auto`; images are lazy-loaded with dimensions.

The Latest feed uses a partial B-tree index on `(created_at DESC, id DESC)` for published posts. A cursor records both values, preserving PostgreSQL microseconds. There is no growing `OFFSET` scan, and newly inserted posts do not shift previously read boundaries. Edits can change search ranking while someone is browsing; searching again gives the latest ranking.

Search uses PostgreSQL full-text search with a stored, weighted `tsvector` and a partial GIN index. `plainto_tsquery('simple', query)` combines all tokenized keywords with AND. Results must contain every term. `ts_rank_cd` gives stronger weight to title matches, then content, then shared links; publication time and ID provide deterministic tie breaks. Search cursors additionally include relevance and the query, so another query cannot reuse them accidentally. This supports case-insensitive whole-token matching across Unicode text. It deliberately does not claim typo correction, arbitrary substrings, or English stemming. Queries are bounded and SQL values are parameterized.

Research:

- [Google: pagination and incremental loading](https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading) recommends crawlable sequential links, distinct pagination URLs, self-canonical pagination, and avoiding indexing search/filter variants.
- [PostgreSQL: controlling text search](https://www.postgresql.org/docs/current/textsearch-controls.html) documents plain-text AND queries, weighted vectors, and cover-density relevance ranking.
- [PostgreSQL: preferred search indexes](https://www.postgresql.org/docs/current/textsearch-indexes.html) recommends GIN for text search.
- [PostgreSQL: LIMIT and OFFSET](https://www.postgresql.org/docs/current/queries-limit.html) explains the need for unique ordering and the cost of calculating skipped rows.
- [MDN: Intersection Observer](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) documents asynchronous observation without a continuous scroll handler.

## Media and replies

Image upload reuses the authenticated `/api/upload` endpoint and Sharp pipeline: valid raster inputs under 10 MB are decoded, rotated, stripped of metadata, and encoded as actual WebP strictly below 50,000 bytes. The media table enforces that ceiling as well. Four images per post, editable alternative text, sequential processing, and paste/drop upload keep the composer small. The server verifies attached IDs and uses stored dimensions. Public visitors cannot upload.

GitHub URLs become lightweight repository cards without GitHub API calls. Public Instagram reel/post URLs become cards with an explicit load button, an iframe, and an always-available source link. No Instagram SDK is downloaded by the parent page. Only `https://www.instagram.com` is added to `frame-src`; script and connection policies remain local. Private, removed, age-restricted, or embedding-disabled Instagram posts may not play. The fallback link remains usable. See [Meta: embedding Instagram posts](https://developers.facebook.com/documentation/instagram-platform/oembed).

Replies are bounded, escaped plain text; submitted HTML never executes. Public names are optional and are not verified identities. The author badge is determined by the server session. PostgreSQL enforces ten replies per visitor IP per ten minutes using an HMAC digest; raw IP addresses are not stored. Production Nginx must preserve the included configuration that overwrites `X-Forwarded-For` with the actual remote address. A unique submission ID and transaction lock deduplicate network retries before consuming another rate-limit allowance. Errors preserve typed content and success follows a committed database write. Replies are paginated in groups of 20. Hidden replies are excluded from public HTML and structured data.

## Indexing and sitemaps

`/sitemap.xml` is now a sitemap index. It references `/sitemaps/pages.xml`, `/sitemaps/blog-<bucket>.xml`, and `/sitemaps/forum-<bucket>.xml`. Stable identity ranges of 10,000 rows keep URLs in the same shard as new posts are created. Drafts and future blog publications are excluded. Sitemap generation selects only URL, modification, and image metadata; it does not load full post bodies. Forum modification dates include visible replies. XML is escaped, and image entries point to saved WebP media.

Each shard stays comfortably below Google's 50,000-URL/50 MB limits. The manifest has a five-minute server cache invalidated by publishing, editing, and moderation. Shards use five-minute shared HTTP cache headers; origin generation always reads current publication metadata in a bounded query. No fake modification time or arbitrary priority is generated. `robots.txt` advertises the index; admin, editor, drafts, and search results are not indexing targets. A permanent discussion has canonical/Open Graph metadata and `DiscussionForumPosting` JSON-LD containing visible comments. Older reply windows consolidate onto the main discussion URL.

Research:

- [Google: build and submit sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).
- [Google: sitemap index files](https://developers.google.com/search/docs/crawling-indexing/sitemaps/large-sitemaps).
- [Google: discussion forum structured data](https://developers.google.com/search/docs/appearance/structured-data/discussion-forum).

Set `SITE_URL` to the public HTTPS domain before the production build. Submit that domain's `/sitemap.xml` in the existing Search Console workflow under Admin → Search & SEO. Localhost cannot be crawled by Google. Sitemaps and structured data make published content discoverable and eligible; Google decides indexing, rich results, and ranking.

## Deployment and verification

Run `npm run db:setup` to apply the additive schema, then build and restart using the existing deployment workflow. Existing posts, settings, and contact requests are preserved. Back up `forum_posts`, `forum_replies`, and `media` with the other PostgreSQL tables.

`tests/forum.test.ts` covers URL allowlists, validation, cursor precision, and XML escaping/size limits. `tests/forum.e2e.ts` covers ten-at-a-time scrolling, no-JavaScript pagination, keyword AND/ranking, guest replies, replay deduplication, rate limits, moderation, authorization, Markdown rendering, WebP upload, drafts, and sitemap updates. Test posts and media are removed afterward.
