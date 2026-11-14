# Aathilducky — portfolio, writing & studio

A portfolio matching aathilducky.com, with a PostgreSQL-backed Markdown blog and admin studio built with **Next.js 16, React 19, Node.js, and PostgreSQL**. Designed for a small 2 GB RAM Linux VPS. No separate API server, ORM engine, Redis, or background worker is needed.

## Build and run

Install **Node.js 22.9+** (24 LTS recommended), npm, and **PostgreSQL server 14+**. On Ubuntu/Debian, install PostgreSQL with `sudo apt install postgresql postgresql-contrib`, or configure an existing database using `DATABASE_URL`.

```bash
npm ci
npm run build
npm start
```

Open **http://localhost:3000** and **http://localhost:3000/admin**. This runs the full production application: public pages, admin studio, API routes, database-backed media, and static assets. No separate deployment script, asset-copy step, or API process is needed.

`npm run build` loads your environment, checks PostgreSQL, applies the idempotent schema and seed setup while preserving existing content, and builds Next.js with one worker and a 1 GB Node heap limit. On a fresh checkout with no environment configuration, it creates a private `.env` with unique admin, database, and session credentials. Open `.env` locally to view the credentials; it is excluded from Git and served assets. `.env.example` documents the settings without secrets.

`npm start` checks the production build and database, restarts the project's local PostgreSQL cluster if necessary, and runs the standard Next.js production server with a 384 MB Node heap limit. It serves `public/` and `.next/static/` directly. It does not reinstall dependencies or rebuild. Stop it with Ctrl+C; the database remains running so your data stays available. Run `node scripts/stop-db.mjs` to stop only this project's database.

If PostgreSQL binaries are installed and no database is listening at the configured local address, the application creates a private cluster in `.postgres/`, listening only on `127.0.0.1:55432` by default. This requires a normal OS user; do not run as root. To use a managed or existing database, set `DATABASE_URL` instead. Build and runtime must use the intended database; when changing to a fresh database after building, run `npm run db:setup` before starting.

Environment variables supplied by your hosting platform take precedence over `.env.production.local`, `.env.local`, `.env.production`, and `.env`, in that order. The database preparation and Next.js use the same configuration. Set `DATABASE_URL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and a `SESSION_SECRET` of at least 32 characters when configuring the environment yourself.

## Production deployment

Before building for your domain, configure these values in `.env` or your hosting environment:

```dotenv
SITE_URL=https://aathilducky.com
COOKIE_SECURE=true
APP_HOST=127.0.0.1
PORT=3000
```

`APP_HOST` defaults to `0.0.0.0` for hosting platforms and containers. Set it to `127.0.0.1` when using a local reverse proxy. Existing `HOSTNAME` settings in environment files remain supported; use `APP_HOST` for new deployments to avoid conflicting with the operating system's machine name. `PORT` is read from your environment files as well as hosting variables. CLI overrides also work, for example `npm start -- --port 4000`.

Use a unique admin password and keep the generated session secret. A password or username change invalidates previous sessions on restart. Changing `SITE_URL` requires rebuilding because static metadata uses that value.

For each release, install dependencies and run `npm run build`, then restart `npm start`. Stop the existing application before rebuilding in the same directory because Next.js replaces `.next/`. Keep the project, production dependencies in `node_modules/`, `public/`, and the complete `.next/` build on the server. After building, `npm prune --omit=dev` can remove development-only dependencies. The old `.runtime/` release packaging is no longer used.

`deploy/nginx.conf.example` includes reverse-proxy headers, gzip, static asset caching, and an 11 MB upload ceiling. Point your domain at the VPS, adapt the Nginx config, and configure HTTPS using your preferred certificate tooling. Keep the application and database ports private.

For automatic restart and reboot persistence, edit **all** paths and `User` in `deploy/ducky.service.example`, including the npm executable path (`command -v npm`), then install it after building:

```bash
sudo cp deploy/ducky.service.example /etc/systemd/system/ducky.service
sudo systemctl daemon-reload
sudo systemctl enable --now ducky
# after a subsequent successful build:
sudo systemctl restart ducky
```

The systemd service runs `npm start` without building at boot. If using NVM, make Node and npm available in the service PATH or set an explicit `Environment=PATH=...` line. `journalctl -u ducky -f` shows logs.

## Development

```bash
./run.sh
```

The development helper installs dependencies when necessary, prepares the database, and runs Next.js with hot reload. After dependencies and the database are ready, `npm run dev` also starts development mode. Development enables the script evaluation required by Next.js debugging and lazy-loaded editor modules; production keeps script evaluation disabled.

## Website design system

All public routes (Home, About, Tools, Writeups, article pages, Research, and Contact) share a coordinated colour theme in `app/(site)/public-theme.css`. The stylesheet loads in the public route layout and is scoped to `.reference-site.public-site[data-page]`. Admin and the isolated homepage draft preview keep their layout; shared Markdown and code styles also apply to article previews and the visual editor.

The homepage uses the existing locally hosted Manrope variable font, with 32–56px main headings, 28–34px section headings, and readable 17–19px body text. Other public routes keep Geist. Homepage sections, location, experience dates, tool links, and reading links use consistent Lucide outline icons. Code keeps a monospace face, and branding retains its configured wordmark. There are no new dependencies, external font requests, image downloads, animation loops, or client theme scripts. The Geist font license is in `public/fonts/Geist-LICENSE.txt`.

Light blue-white pages, dark slate text, blue actions, violet headings, teal learning notes, amber section accents, and rose status cues form the shared palette. Cards have softly tinted surfaces and rounded corners. Homepage contact and page-end invitations use an indigo gradient with light text. Logos, portraits, and toolkit icons retain their original colours. Focus rings, selected filters, field borders, and text feedback keep interaction states identifiable.

Public content is centred at a maximum width of 1440px, with responsive gutters from 20px to 40px. Desktop page introductions start at 64px; adjacent section edges combine to 88px of vertical space, scaling to 72px on phones. Headings scale from 36px on phones to 72px on desktop. Homepage introductory copy is 19–22px and supporting labels are at least 14–16px. Articles retain a separate 52rem reading column. Cards, navigation, tools, research, and the contact form follow the same type scale and spacing rhythm. Phone controls retain at least 44px touch targets and inputs use 16px text.

Markdown headings use blue, violet, and teal by level, with coloured list markers, teal blockquotes, blue table headers, alternating table rows, and violet inline code. Code blocks use a light blue surface and distinct colours for keywords, strings, functions, numbers, variables, and properties; copy controls and keyboard scrolling remain available. These styles use the existing syntax highlighter without adding dependencies.

The landing page retains its saved content, configurable section order, images, and links. The homepage editor remains the source for public content. `scripts/redesign-journal-homepage.mjs` is the earlier, optional journal-content migration; the current visual theme needs no database migration. The public frame adds its theme class only outside draft previews, preventing public stylesheet rules from changing admin presentation even after client navigation.

`reference/site.json` contains reviewed, sanitized templates for About, Tools, and Contact. Profile edits continue to populate the corresponding fields, and user values are escaped before insertion. React still handles navigation, directory search/filtering, email copying, writing search, and contact submission. Existing published writeups appear automatically on the homepage; images retain fixed aspect ratios and fallback thumbnails use the card's accent colour. Public theme changes do not modify data, publishing behavior, SEO content, or the separately hosted browser tools.

## Admin studio

- **Overview:** real database counts, recent posts, and quick actions.
- **Homepage:** a section-by-section editor for every homepage heading, paragraph, link, highlight, experience entry, tool, portrait, contact detail, and site-wide brand/navigation/footer. Add, remove, and reorder list items; hide and reorder whole sections. Preview the actual draft at desktop or mobile width before saving.
- **Writeups:** search and filter drafts/published posts; create, edit, unpublish, or delete.
- **Forum:** publish Markdown thoughts, images, GitHub links, and Instagram reels at `/forum`. Visitors can reply without accounts; only you can post. Manage posts under **Admin → Forum** and hide or restore replies on each discussion.
- **Writeup block editor:** Tiptap visual blocks, formatting toolbar, add-block menu, headings, lists, checklists, tables, quotes, dividers, images, block movement/removal, and undo/redo. Paste Markdown to render it automatically, or switch to Markdown source and Preview. Includes cover images, drag/drop and clipboard image upload, word count, read time, Ctrl/⌘+S, and recoverable local drafts. Explicit Save/Publish writes Markdown to PostgreSQL.
- **Contact requests:** a private inbox with search, status filters, pagination, progress tracking, private notes, and email reply links. New request counts appear in the sidebar and overview.
- **Profile:** update biography, portrait, contact details, toolkit, and experience entries.
- **Search & SEO:** homepage metadata, Google verification token, sitemap link, per-post checks, and a plain-language Search Console setup guide.

Admin pages and admin mutations require a signed, expiring, HttpOnly cookie. Cookies use SameSite=Lax and HTTPS-only protection when `COOKIE_SECURE=true`. Server Actions check request origins; uploads also enforce an explicit same-origin check. A PostgreSQL-backed account rate limit blocks more than 10 login attempts per 15 minutes. Queries use parameters. Markdown does not execute raw HTML or JavaScript. Deleting content requires an explicit confirmation in the interface.

### Logo and brand fonts

Open **Admin → Edit logo & fonts**, or **Homepage → Brand & navigation**, to upload or remove the logo, edit the brand name, and choose its font and weight. Available styles are System Sans, Friendly Sans, Editorial Serif, and Technical Mono, with medium through extra-bold weights. The live brand preview updates as you edit; **Save changes** applies the saved logo and lettering to the public header, footer, and admin sidebar. Existing branding defaults to System Sans and bold. These choices use available system fonts with explicit fallbacks and add no external font requests. Uploads keep the existing optimized WebP pipeline under 50 KB.

### Article author

Open **Admin → My profile → Article author** to customize the byline on every published writeup. Set an optional author display name and upload a separate author photo; the live preview shows the result. Blank names use the profile full name, and **Use profile photo** removes the photo override. The sticky **Save profile** bar publishes changes across articles and their author structured data. Profile identity and homepage branding stay independent of these optional author overrides.

Author uploads reuse the authenticated, same-origin image endpoint and WebP optimization under 50 KB. Photo references are checked against saved media before publishing. Existing profiles need no migration: articles use their current name and portrait automatically, with initials if a photo cannot load.

### Contact form and inbox

The separate form on **/contact** saves the visitor’s name, email, subject, and message directly to PostgreSQL. Review messages under **Admin → Contact requests** (`/admin/requests`). New messages stay marked **New** until you change their status; opening a message does not mark it handled. Reply by email opens your email app, while private notes and status changes remain inside the studio. Both the overview and inbox refresh every 30 seconds while visible, refresh when you return to the window, and include a manual Refresh button. This also updates the sidebar's new request count.

Submissions use server validation, a database limit of five requests per email per 15 minutes, and a unique submission token to prevent duplicate deliveries on network retries. Extra fields, including website values sent by older tabs or browser autofill, are ignored. Success is returned only after the request is saved or a previously saved delivery is confirmed. Request text renders as plain text. Concurrent admin edits cannot silently overwrite each other. Contact submissions do not send automatic emails or notifications.

`npm run build` creates the additive `contact_requests` and `contact_rate_limits` tables and indexes automatically. Existing content is preserved. The local database already has the new tables. Add contact requests to your usual database backup policy.

### Forum

Open **/forum**. Your existing admin login reveals **New post** and edit controls. The composer supports Markdown, server-rendered preview, pasted/dropped images, up to four attachments with image descriptions, and draft visibility. Uploaded images use the existing WebP optimizer and remain strictly below 50 KB. GitHub and Instagram links automatically become cards; Instagram content loads on demand and retains a direct link when embedding is unavailable.

The forum contains posts and compact controls, with no introduction, profile sidebar, or decorative footer. Readers can like, unlike, reply, and share without an account. A signed anonymous browser cookie remembers likes, and database uniqueness prevents duplicate delivery from adding extra reactions. Publishing remains admin-only.

**Top** balances freshness with capped, logarithmic like/reply signals. An indexed score and shared snapshot of up to 500 candidates keep each scrolling session stable as reactions change. Older content continues through a chronological tail. **Latest** uses chronological keyset pagination with crawlable links. Both load ten posts at a time. Search still matches all keywords and sorts by relevance. Counters update atomically instead of recounting reactions on every read. Public interactions have rate limits, and replies retain moderation and retry deduplication. See [feed ranking research and policy](docs/forum-feed-ranking.md).

`/sitemap.xml` is a sitemap index, with separate static-page, blog, and forum files split into stable 10,000-post ranges. Published discussions have canonical URLs, social metadata, and discussion structured data. Search results, drafts, and editing routes are excluded from indexing. A production build applies the additive tables and indexes automatically. See [forum architecture and research](docs/forum-architecture.md) for algorithms, sources, deployment, and indexing setup.

Forum posts now have stable title-based slugs, with permanent redirects for old UUID links. Clicking a comment count expands the discussion inside the feed; each comment supports nested replies with branch pagination and moderation. Sitemaps use real discussion modification dates and ETags for unchanged XML. A production build migrates existing posts automatically. See [URLs, comments, and SEO](docs/forum-urls-comments-seo.md) for the implementation and research.

### Editing the homepage

Open **/admin/homepage**, search for a section in the sidebar (or use the section selector on mobile), and edit the labeled fields. Item cards can be expanded individually or all at once. Field counters use the same limits as backend validation; clicking an error opens and focuses its field. The sticky save bar remains available while editing long sections. **Page layout** controls visibility and section order. **Brand & navigation** and **Footer** apply across the public site. Uploaded logos and portraits use the same WebP/50 KB optimization as blog images. Use `**bold text**` for emphasis in text blocks; HTML remains escaped.

**Preview** shows unsaved content in an isolated desktop/mobile frame. **Save changes** (or Ctrl/⌘+S) publishes the configuration to PostgreSQL and refreshes public caches. A local recovery copy is kept in this browser while editing; it never publishes automatically. **Reset this section** restores only the current section while keeping other edits. **Discard changes** restores the whole editor to its last saved version. If another tab saves changes to a different section, the server merges both versions in one transaction. If both tabs edit the same section, it rejects the conflicting save and keeps your draft for review.

Homepage settings live in `settings.homepage`. The editor manages seven sections: hero, highlights, about, experience, tools, recent writeups, and contact. Version 3 upgrades older configurations without changing the remaining custom content. Projects and Freelance routes, homepage sections, admin editors, mutation actions, dashboard counters, and sitemap entries have been removed. Existing project database tables and retired homepage fields are retained as archived data; active pages and client payloads no longer load them. Re-running setup preserves saved homepage changes and archived data. SEO titles/descriptions remain in **Search & SEO**.

### Visual writeups and code blocks

Open **Admin → Writeups**, edit an existing post, or choose **New writeup**. **Visual blocks** is the default. Paste Markdown directly into the writing area to turn headings, bold text, lists, checklists, tables, and code fences into editable blocks. The **Add block** menu inserts content at your cursor. The block controls below the document move or remove the selected block; Undo restores edits.

Use **Markdown** for direct source editing or importing a whole article, then **Visual blocks** or **Preview** to see the result. Content remains Markdown in PostgreSQL. Raw HTML is skipped on the public site. Upload/paste/drop images using the editor so they receive WebP/50 KB optimization.

Code blocks have a language selector and a shared dark syntax palette on light grey surfaces. Published blocks include a language label and **Copy** button. Standard fenced Markdown works:

````markdown
```python
def greet(name):
    return "Hello " + name
```
````

Triple apostrophe fences such as `'''python` and `'''` are also accepted on Markdown paste, preview, and save. Supported languages include JavaScript/JSX, TypeScript/TSX, Python, Bash, JSON, HTML/XML, CSS, SQL, YAML, Go, Rust, Java, C/C++, C#, PHP, Dockerfile, Diff, and PowerShell. Unknown languages display as plain text. Highlighting uses explicit languages rather than costly automatic detection; blocks over 40,000 characters stay copyable plain text.

The public homepage shows up to three recent published writeups by default, including cover thumbnails and a **See more writeups** button to `/blog`. Change its heading, button, visibility, position, and count under **Homepage → Recent writeups**. It updates on publishing/unpublishing and stays hidden when there are no published posts. Posts without cover images get a lightweight themed category thumbnail. No sample research posts are invented to fill the section.

Each published article ends with **Your next read**, showing up to three other published writeups. Recommendations reuse the cached summary list and rank normalized tag overlap (12 × Jaccard similarity), category match (4), and meaningful title-word overlap (3 × Jaccard similarity). Publication date breaks relevance ties; unrelated recent posts fill remaining slots. Current articles, duplicate slugs, drafts, and future publications are excluded. Cards show the article cover thumbnail (or a category fallback), explain the match, and include reading time. Cover images load lazily. The section hides when no alternatives exist, requires no reader tracking or new packages, and uses the existing content-cache invalidation when posts change. Ranking and eligibility edge cases are covered in `tests/related-writeups.test.ts`.

Tiptap and its dependencies are loaded only for the admin editor. Public article syntax is rendered on the server; only the small copy control is interactive. Gradients are static CSS, with no background animation or extra image requests.

Implementation references: [Tiptap Markdown](https://tiptap.dev/docs/editor/markdown/api/editor), [Markdown paste](https://tiptap.dev/docs/editor/markdown/examples), and [code-block highlighting](https://tiptap.dev/docs/editor/extensions/nodes/code-block-lowlight).

## Images and database

**All content is persisted in PostgreSQL:** homepage configuration, profile, Markdown posts, SEO settings, imported source snapshots, and optimized image bytes. Media has a database constraint enforcing **strictly less than 50,000 bytes**, not just a UI label. The upload handler validates and decodes images with Sharp, fixes rotation, strips metadata, converts to WebP, and reduces quality/dimensions until under budget. Raster inputs up to 10 MB and 20 million pixels are accepted; SVG is rejected. Animated uploads become still images. Only one image conversion runs at a time per Node process to keep memory bounded.

A small, local portrait copy is included for initial import. After setup, the profile points to its database-backed media URL. Media responses have immutable cache headers. Failed uploads do not save partial rows. Removing a cover detaches it; previously uploaded media remains available so inline images and existing links keep working.

The schema lives in `db/schema.sql`. Setup is idempotent: existing profile, posts, and archived data are preserved. It applies versioned homepage upgrades without dropping retired tables. It is not a general migration framework. The application pool is limited to three connections. The included local PostgreSQL cluster uses 64 MB shared buffers, 20 maximum connections, and 2 MB work memory.

## SEO and Search Console

The application includes server-rendered article content, canonical URLs, unique titles and descriptions, Person/BlogPosting JSON-LD, an Open Graph image, `robots.txt`, `/feed.xml`, and `/sitemap.xml`. Drafts never enter public queries, RSS, or the sitemap. Publishing, editing, unpublishing, and deleting immediately expire cached data from authenticated Server Actions; the next sitemap request reflects the change automatically. Sitemap modification dates come from actual content updates. The admin route is `noindex` and requires authentication.

Connect the real domain and HTTPS, then follow **Admin → Search & SEO**:

1. Add and verify a Domain property with a DNS TXT record, or use a URL-prefix property and save the HTML tag's token in the admin.
2. Submit `https://aathilducky.com/sitemap.xml` under Sitemaps.
3. Use URL Inspection on a published article; test the live URL and request indexing when appropriate.
4. Monitor the Page indexing and Performance reports. Indexing and rankings are Google's decision and are not guaranteed by this application.

Official references researched for the implementation:

- [Google: build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Google: article structured data](https://developers.google.com/search/docs/appearance/structured-data/article)
- [Google: verify site ownership](https://support.google.com/webmasters/answer/9008080)

## Imported content

Profile, experience, skills, public contact links, and all ten projects were researched from [aathilducky.com](https://aathilducky.com/), its [about](https://aathilducky.com/about/), [projects](https://aathilducky.com/projects/), and [contact](https://aathilducky.com/contact/) pages on November 10, 2026. The portrait comes from the GitHub avatar linked on that website. A readable source snapshot is in `db/source-snapshot.json` and is also imported into PostgreSQL.

The introductory post is an adaptation of the existing biography, with attribution inside the article. No technical findings, testimonials, traffic numbers, or research articles were invented.

## Back up and restore

Back up regularly, including before upgrades:

```bash
node --env-file=.env scripts/backup.mjs
```

This writes a private custom-format PostgreSQL dump to `backups/`, including images and all content. Keep an off-server copy and a separate secure copy of `.env`. To restore into an **empty** database, use `pg_restore --no-owner --no-acl --dbname=YOUR_TARGET_DATABASE backup.dump`; provide credentials with standard PostgreSQL environment variables. Never commit `.env`, `.postgres/`, `.runtime/`, or backups.

## Checks

```bash
npm run typecheck
npm test
npm run build  # prepares and checks the configured PostgreSQL database
```

The test suite checks homepage migration, safe links, text escaping, section visibility/order, image byte budgets, actual WebP output, metadata removal, rotation, malformed uploads, slugs, post validation, and unsafe link rejection. `tests/e2e.spec.ts` exercises the protected admin, publishing/sitemap changes, image upload, Markdown output, homepage drafts/preview/publishing, stale-save protection, and mobile layout against a running server:

```bash
# Terminal 1 (after npm run build)
npm start
# Terminal 2
node --env-file=.env node_modules/@playwright/test/cli.js test
```

The supplied Playwright configuration uses installed Google Chrome, so no browser download is needed. Set `PLAYWRIGHT_CHROME_PATH` if your Chrome executable is elsewhere.

## Resource expectations

Public pages use Next's server rendering/ISR and cached queries; the homepage composes fresh HTML over cached database loaders to keep published writing current; fonts are served locally. Most public content has no client JavaScript beyond navigation and search/filter controls. Editor and admin code load only for the studio. There is no analytics beacon. The visual editor framework is isolated to authenticated writeup editing and is loaded on demand.

Runtime budgets are configured for a 2 GB VPS, but actual memory depends on traffic, post size, image uploads, Node, and PostgreSQL. Building needs more memory than serving; build on another Linux host of the same architecture or provide swap if a heavily loaded VPS cannot build comfortably. Keep to one Node process and monitor real RSS before increasing concurrency. `/api/health` reports database connectivity without exposing credentials.
