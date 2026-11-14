# Forum URLs, threaded comments, and sitemaps

## Descriptive permanent URLs

Each post receives a title-based slug and a short ID suffix to distinguish duplicate titles. Unicode letters and combining marks are preserved, including Tamil. Slugs remain stable when a post is edited. The additive migration backfills existing posts. Old `/forum/<uuid>` links permanently redirect with HTTP 308; public links, sharing, canonical metadata, Open Graph, structured data, and sitemaps all use the descriptive URL.

[Google recommends descriptive URL words and the audience's language](https://developers.google.com/search/docs/crawling-indexing/url-structure). Every published post is independently server-rendered, has an index/follow directive, and appears in its sitemap shard. Drafts return 404 to visitors; editing remains private. Actual indexing and ranking are Google's decisions.

## Recursive comments

Click a comment count to expand the discussion inside a feed card. Each comment has Reply and each branch has View replies. Permanent post pages include initial comments in server-rendered HTML, and branch links have working server-rendered destinations without JavaScript.

The data model stores parent IDs, root IDs, and checked depth. Server and database validation reject cross-post parents, hidden parents, and nesting beyond 32 levels. Visual indentation stops growing earlier to preserve phone readability. A parent/timestamp/ID index serves 20 children plus one lookahead row; expanding a branch never downloads the entire recursive tree. Counters update inside the same transactions as their source records.

Branch requests return bounded data rendered as escaped React text. Replies update the direct parent's count and matching open branch without refetching unrelated branches. Existing rate limits and retry deduplication apply at every depth. Only the owner can moderate. Hiding a parent conceals descendants, while restoring it respects independently hidden children. Public queries and structured data exclude ancestor-hidden comments as well as directly hidden ones.

Thread windows and older comment pages are noindex/follow and consolidate onto their main discussion URL, avoiding a combinatorial set of duplicate indexing targets. Every main published post remains crawlable.

## Sitemap algorithm

The root sitemap indexes static pages and stable blog/forum shards of 10,000 posts, below Google's 50,000 URL/50 MB limits. Numeric identity ranges keep older URLs in their existing shards as new content arrives. Queries read URL, image, and modification metadata without fetching post bodies.

A stored discussion timestamp advances when comments change. Sitemap generation takes the later of that timestamp and the content edit timestamp, replacing per-post comment aggregation with direct metadata reads. The index includes genuine shard modification dates. Likes do not inflate SEO modification dates. XML is escaped, and images remain represented in image-sitemap entries.

The manifest has a five-minute cache invalidated by publishing and discussion mutations. Origin shard generation reads current publication state. Shared HTTP caching and content-derived ETags permit 304 responses for unchanged XML. Drafts, editing routes, search results, transient ranked windows, and UUID aliases are excluded.

Sources:

- [Google: build and submit sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).
- [Google: sitemap indexes](https://developers.google.com/search/docs/crawling-indexing/sitemaps/large-sitemaps).
- [Google: discussion forum structured data](https://developers.google.com/search/docs/appearance/structured-data/discussion-forum).
- [Google: using significant comment changes for lastmod](https://developers.google.com/search/help/office-hours/2023/january).

Before a production rebuild, run `npm run db:setup` for the additive schema and slug migration. Existing content and UUID links are preserved. Set the public HTTPS `SITE_URL` and submit its `/sitemap.xml` in Search Console; localhost cannot be indexed.

Tests cover Unicode and duplicate titles, redirects, canonical/indexing metadata, sitemap inclusion and ETags, in-feed comments, replies to replies, branch pagination, cross-post validation, responsive layouts, and hide/restore behavior.
