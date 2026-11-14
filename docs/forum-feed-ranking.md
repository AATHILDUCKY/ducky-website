# Lightweight social feed

The forum shows posts, a compact search/sort bar, and owner-only publishing controls. Readers can like, unlike, reply, and share. Introductions, decorative art, the profile sidebar, and the large footer have been removed.

## Research

[LinkedIn's community-focused feed work](https://www.linkedin.com/blog/engineering/feed/community-focused-feed-optimization) describes a two-pass architecture and multiple engagement objectives. [LinkedIn's dwell-time work](https://www.linkedin.com/blog/engineering/feed/leveraging-dwell-time-to-improve-member-experiences-on-the-linkedin-feed) adds implicit consumption signals and prediction models. [Reddit's official recommendations documentation](https://support.reddithelp.com/hc/en-us/articles/23511859482388-Reddit-s-Approach-to-Content-Recommendations) describes candidate generation, filtering, post age, votes, and comments.

This implementation borrows candidate selection and freshness/engagement balancing. The following formula is this site's own policy, not either platform's proprietary algorithm. There is one publisher and no visitor account graph, so no follower-affinity model, impression logging, dwell tracking, or ML service is needed.

## Score and serving

```text
score = created_at_in_hours + 8 × ln(1 + min(likes, 1000) + 2 × min(visible_replies, 20))
```

At a given moment, sorting this is equivalent to sorting logarithmic engagement minus age in hours. Replies have twice the initial weight of likes. Diminishing returns, caps, and freshness limit how far old highly engaged posts can rise. These constants are a transparent starting policy, not claimed to be empirically optimal.

PostgreSQL stores and indexes the score as a generated column. Database triggers update counters in the same transactions as likes/replies, including reply hiding/restoration. Reads do not scan all reactions to calculate counts. There is no periodic age-update job or full-table application sort.

Top selects at most 500 ranked IDs through the index and shares that snapshot for up to 60 seconds. A small PostgreSQL UUID array preserves the order for continued scrolling. Each request renders ten posts, with one extra row to detect a next page. Unpublished/deleted posts are excluded immediately. Remaining older content uses a chronological tail excluding the ranked IDs; timestamp/ID cursors and the snapshot's upper time boundary avoid duplicates and growing SQL OFFSET scans. Snapshots are cleaned up after one day; expired windows offer Refresh. New publishing and reply/moderation changes invalidate fresh snapshots; likes influence fresh ranking within the cache interval. Existing sessions keep their order.

Latest retains stable, crawlable timestamp/ID pagination across all published posts. Expiring Top continuation URLs are noindex/follow; Latest and permanent discussions remain crawlable and published post URLs remain in the sitemap. Search keeps its GIN-backed all-keyword matching and relevance ranking.

## Anonymous reactions

An HttpOnly, SameSite=Lax, HMAC-signed cookie identifies a browser. A unique `(post_id, visitor_id)` pair and an explicit desired Like/Unlike state make retries idempotent. Likes survive refreshes and can be undone; independent browsers react independently. These represent browsers, not verified unique people.

The server verifies publication, serializes each post's counter changes, and limits changed reactions to 120 per IP-HMAC per ten minutes. Raw IP addresses are not stored. Keep the supplied Nginx configuration that overwrites forwarding headers. Cookie clearing can create another identity, so the rate limit provides modest abuse resistance rather than guaranteed one-person-one-vote enforcement. The UI updates optimistically and rolls back on failure.

No packages, Redis, worker process, tracking model, or external ranking service were added. Tests cover score behavior, PostgreSQL score agreement, like persistence/replay/undo, independent browsers, rate limits, private posts, reply counters, and stable pagination while engagement changes.
