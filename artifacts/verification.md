# Verification

Verified locally on November 10, 2026, with Node.js 24.22.0 and PostgreSQL 17.

- Next.js production build: passed, including TypeScript.
- Unit tests: 6 passed (WebP byte budget, dimensions/rotation, metadata stripping, invalid images, post validation, URL safety).
- Browser tests in installed Google Chrome: 3 passed, covering public routes/metadata, search, mobile menus/layouts, authentication, Markdown, image uploads, draft privacy, publishing/unpublishing, sitemap invalidation, profile edits, verification tags, and project creation/deletion.
- Production dependencies: npm audit reported 0 known vulnerabilities after updating Sharp to 0.35.5.
- `deply.sh`, `deply.sh --build-only`, and `deply.sh --start-only`: verified with the packaged standalone server.
- `run.sh`: verified on a separate test port; homepage and health endpoint returned HTTP 200.
- Fresh PostgreSQL bootstrap: verified in an isolated temporary cluster; cluster removed afterward.
- Backup: a custom-format dump was generated successfully and inspected using pg_restore --list; all application tables and table data were present.
- Desktop and mobile previews: saved in this directory. No browser JavaScript errors observed.
- Homepage subresources transferred approximately 239 KB during a local desktop Chrome load (measurement is illustrative, not a traffic/load benchmark).
- Temporary test content was removed. Final seed content: profile, 10 imported projects, 1 attributed introductory post, and the database-backed portrait.

VPS DNS, TLS, systemd installation, and Google Search Console ownership verification require the owner's hosting/domain setup. Examples and instructions are in README.md and deploy/. No remote VPS deployment was performed.

## Cybersecurity light-theme revision

- Replaced the public layout with a light violet, teal, and amber theme, dark readable headings, clearer spacing, and text-based project cards.
- Removed public portraits, author photos, decorative images, and mockup artwork. Deliberately uploaded article content remains supported.
- Added the Research page, navigation entry, sitemap entry, and published-research filtering through the existing editor.
- Production build and TypeScript checks passed.
- All 3 browser tests passed, including homepage without images, mobile public/admin layouts, research publication, and existing editing workflows.
- Desktop/mobile screenshots were updated; research-desktop.png shows the new research collection.
- No browser JavaScript errors were observed.

## Original website match

The latest revision uses the original aathilducky.com layout and stylesheet, scoped for Next.js, with locally served Manrope fonts, original duck logo, and portrait. Original Home, About, Tools, Projects, Freelance, and Contact page markup is imported into PostgreSQL. The admin retains its editing functionality and uses the matching cream, forest-green, and terracotta palette.

- Desktop homepage screenshot: 1440 × 4088 for both original and local.
- Mobile homepage screenshot: 390 × 5634 for both original and local.
- Final desktop homepage mean absolute RGB channel difference: 0.00893 on a 0–255 scale; minor image-compression differences remain.
- All six original pages have identical full-page heights and identical H1 top positions and widths at the tested 1440px desktop viewport. Details: reference-comparison.json.
- No browser JavaScript errors observed in the comparison.
- Production build, TypeScript, six unit tests, and three browser tests passed.
- The portrait is 18,306 bytes; the duck logo is 5,806 bytes, both WebP.
- Browser Tailwind compilation and external font/icon requests are removed. Admin styles are loaded for the admin/publishing routes rather than the reference homepage.
- Existing tools remain linked to their original live applications.

## Standalone hero portrait

The latest homepage customization removes the portrait card background, border, grid, caption divider, and decorative image rings. Production build passed. Desktop (1440px) and mobile (390px) checks confirmed the portrait loads, the outer styling is absent, and the page has no horizontal overflow. Homepage screenshots were updated; the earlier original-site comparison describes the prior baseline.

## Writeup thumbnail cards

The Writeups listing now uses each post's cover image as a lazy-loaded 16:9 thumbnail. Posts without a cover, or with an image load failure, show a lightweight category preview. The existing WebP/50 KB upload limits remain in use. Cards have updated spacing, excerpts, metadata, and matching colors. Mobile search and filter controls provide 44px tap targets.

Production build and TypeScript passed. All three end-to-end browser tests passed, including publishing an uploaded cover and verifying that the Writeups card loads that exact image. Desktop/mobile layout and search checks passed, with no horizontal overflow. Updated screenshots: writeups-desktop.png and writeups-mobile.png.


## Homepage content editor

Added **Admin → Homepage** at `/admin/homepage`. All eight homepage sections now render from validated PostgreSQL settings rather than a fixed HTML template. The initial setup preserves the current content and design, including existing profile/project edits. Saved homepage copy can be customized independently of full profile and project pages.

- Structured fields cover headings, paragraphs, links/buttons, portrait and logo uploads, highlights, experience, tools, project cards, service tags, contact details, navigation, and footer.
- Sections and list items can be reordered, hidden, added, or removed. The editor uses a sidebar on desktop and an accessible section selector on mobile.
- Desktop/mobile draft previews use the actual page renderer in an isolated frame. Previewed edits do not change the public website until Save.
- Saved settings refresh public caches. Local draft recovery and discard controls are included. PostgreSQL revision checks reject stale saves from another browser tab.
- Uploads still become WebP files strictly under 50,000 bytes. Text is escaped, and links and image sources are validated on both client and server. Admin saves require authentication.
- Production build and TypeScript passed. Ten unit tests passed. Four production browser tests passed, including private previews, publishing, image conversion, invalid-link rejection, section order/visibility, stale-tab conflicts, draft recovery, and all editor panels at 390px width.
- Original homepage content was restored after testing; temporary posts, projects, and test uploads were removed. Screenshots are `homepage-editor-desktop.png`, `homepage-editor-mobile.png`, `homepage-editor-hero.png`, `homepage-editor-hero-mobile.png`, `homepage-preview-desktop.png`, and `homepage-preview-mobile.png`. No browser JavaScript errors were observed during capture.
- No new npm dependencies were added. The public homepage remains server-rendered; editor code loads in the authenticated admin area.

## Premium light theme, live content, and visual writeups

- Added quiet cream/green/terracotta CSS gradients without animation loops or extra images. Combined the two original platform vulnerability metrics into one **100+ vulnerabilities identified** item while preserving experience highlights.
- Added a configurable **Recent writeups** homepage section, with published-post thumbnails, dates, read times, and a **See more writeups** button to `/blog`. Drafts are excluded. Homepage HTML is composed fresh over cached PostgreSQL loaders to avoid stale generated cards after publication.
- Added **Admin → Freelance** for client projects. The shared freelance introduction, services, and highlight update both `/` and `/freelance`. Project saves synchronize linked homepage cards transactionally; deletion removes linked cards. Project form values remain available after saving, including newly created records.
- Added an on-demand Tiptap visual block editor under **Admin → Writeups**, with Markdown paste/source/preview modes, block inserter, headings, formatting, lists, checklists, tables, quotes, dividers, optimized image uploads, block movement/removal, and undo/redo. Content remains Markdown in PostgreSQL.
- Code blocks support language selection and a matching light syntax palette. Published code is escaped, server-rendered, and copyable. Common language aliases are supported; unsupported languages and unusually large blocks fall back to plain text. Triple apostrophe fences are accepted in addition to standard backtick fences.
- Authenticated saves use Next.js `updateTag` for immediate data expiration. Cached query loaders and the three-connection PostgreSQL pool remain in place. Editor dependencies are limited to admin editing; public articles only hydrate their copy controls.
- Production build and TypeScript passed. Fourteen unit tests and six production browser tests passed. Browser coverage includes homepage image cards after publishing, draft privacy, Markdown paste and round-trip, actual clipboard contents, syntax tokens, mobile editing, freelance creation/repeated edits/deletion, shared intro changes, stale homepage tab protection, and sitemap updates.
- Final captures include `home-desktop.png`, `home-mobile.png`, `home-writeups.png`, `homepage-editor-desktop.png`, `homepage-editor-mobile.png`, `freelance-admin.png`, `block-editor-desktop.png`, `block-editor-mobile.png`, and `code-preview.png`. Editor screenshot content is an unsaved demonstration, not a published post.


Final visual checks confirmed 30px desktop / 20px mobile title padding, disabled spellcheck inside editable code, matching green article-preview accents, a balanced horizontal card when only one writeup is available, and no horizontal overflow at 390px. Temporary content was removed: the database retains the original 10 projects and one introductory post. No browser JavaScript errors were observed during final captures.

## Homepage studio reliability and usability

Refreshed `/admin/homepage` with a clearer light-theme workspace, enabled/edited section counts, section search, per-item expand/collapse controls, section reset, and a sticky save bar. Inputs and character counters now use the backend schema's limits. Validation opens collapsed items and focuses the exact invalid field; error messages link back to fields. New items receive focus automatically. Unsaved content is also copied on page exit, protecting the last edits between debounce intervals.

Homepage saves now lock the PostgreSQL settings row and check section hashes. Changes to different sections from separate tabs are merged atomically; conflicting edits to the same section are rejected without replacing the local draft. Successful saves return the canonical saved homepage and updated revision, then expire public content caches. Logo/portrait references are checked before commit. No new packages or services were added.

- Production build and TypeScript passed.
- Sixteen unit tests passed, including schema-matched input limits and revision merging/conflicts.
- Nine production browser tests passed. The expanded coverage edits every homepage content section, saves and reloads it, verifies the public output, uploads a portrait below 50 KB, checks collapsed-field validation/focus, resets one section while retaining other edits, verifies mobile save controls, and merges independent edits from two tabs.
- Final desktop/mobile captures are `homepage-studio-desktop.png`, `homepage-studio-mobile.png`, `homepage-editor-desktop.png`, `homepage-editor-mobile.png`, `homepage-editor-hero.png`, and `homepage-editor-hero-mobile.png`. No browser JavaScript errors were observed during capture.
- Original homepage content and database-backed portraits were restored and checked after testing. The final database contains 10 original projects, one introductory post, and no temporary QA portraits.

## Blog editor loading fix

Reproduced the reported issue in the running development application: `/admin/posts/new` stayed on “Preparing your writing space…” and Chrome reported Content Security Policy errors blocking JavaScript evaluation. The production-only browser checks from earlier revisions did not expose this development-mode restriction.

The policy now permits the evaluation required by Next.js development bundles only when `NODE_ENV=development`. Production retains its no-eval policy. No editor packages or public-page dependencies were added. The local application was restarted with `./run.sh` on port 3000; existing open tabs need a reload to receive the new document policy.

- Production build and TypeScript passed.
- Eighteen unit tests passed, including development/production policy checks.
- Three targeted browser workflows passed against development and the same three passed against production: public routes/mobile layouts, visual Markdown/code editing, and creating/reopening/editing/publishing/unpublishing a post through the blog dashboard.
- Actual HTTP response headers were checked on ports 3000 and 3004: eval enabled only in development.
- The working development editor is captured in `blog-editor-loaded-development.png`; it displayed its editable textbox without a loading placeholder or browser JavaScript errors.
- Temporary test posts were removed. The isolated production preview was stopped; the restored local application remains available at http://localhost:3000.
