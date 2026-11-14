# Original portfolio reference

The source for this layout is the user-provided website https://aathilducky.com/, retrieved on November 10, 2026.

`site.json` contains the About, Tools, and Contact main content, reviewed SVG symbol definitions, and tokens used by the PostgreSQL-backed profile renderer. Script elements, embedded objects, event-handler attributes, and executable links are removed at import.

The original stylesheet is scoped to `.reference-site` in `app/reference.css`; admin and publishing styles are scoped separately in `app/studio.css`. Layout, typography, section order, wording, original iconography, and responsive breakpoints are retained. The browser Tailwind compiler is not needed in the local application.

Images and fonts are served from `public/reference/`. The portrait and duck logo were downloaded from the original page and converted to WebP. The Manrope font license is included in `public/reference/fonts/OFL.txt`.

`npm run db:setup` synchronizes the imported templates while preserving profile edits, archived legacy templates, and the initial source comparison values. Projects and Freelance pages are retired; their data is not loaded by active routes.

Additional publishing functionality lives at `/blog`, `/research`, and `/admin`, preserving the original homepage navigation.
