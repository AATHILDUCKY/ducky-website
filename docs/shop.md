# Shop operations

The storefront is `/shop`. Product and shop settings are at `/admin/shop` (**Products & shop** in the sidebar). Orders have a separate protected workspace at `/admin/orders` (**Orders**). Old `/admin/shop/orders` links redirect to the new workspace.

## Add and publish products

1. Select **Add product**, enter the name, URL slug, description/specifications, price, category and available stock.
2. Select and upload up to six product images at once. The first image is the default main image for the product page and shop card; use **Use as cover** to change it. Customers can tap the small photo thumbnails or previous/next controls to switch images. Existing uploads automatically compress to WebP under the site's image budget.
3. Save as a draft while preparing the listing. Choose **Published** and save to make it available in the storefront and product sitemap. Published products require an image. Zero stock shows as sold out.
4. Optional SEO title and description override the automatic defaults. Keep published URL slugs stable to preserve links.

Concurrent orders change stock. If a product changes while its editor is open, saving is rejected; refresh to review the current stock before saving again. Hide products using Draft; historical order details remain intact.

## Checkout and fulfilment

The shop starts with LKR, Sri Lanka delivery, payment arranged after ordering, and **cash on delivery disabled**. In Shop settings, **Enable cash on delivery (COD)** adds an optional COD choice at checkout and an availability message on the storefront. Arranged payment remains available. Disabling COD removes the choice and the server rejects stale or forged COD submissions; existing COD orders keep their original method. Set your delivery fee, delivery timing/instructions and returns information in **Shop settings** before selling. A delivery fee of zero adds no delivery charge. Changing currency does not convert numeric product prices; review prices when changing it.

Customers can search/filter products, add quantities to a persistent shopping bag, and check out without an account. Checkout collects full name, email, phone, street address, city, postal code, country, optional notes and fulfilment consent. The final review shows item prices, quantities, subtotal, delivery fee, total and payment information. Card details are never collected.

Orders are saved transactionally in PostgreSQL; the server checks current price, currency, delivery fee, payment method and stock. Stock is locked before allocation to prevent overselling. Repeated submissions of the same checkout do not create duplicate orders. Basic per-email order rate limiting is included.

After a saved order, customers see a DK order reference. They are told the owner will contact them; no email/SMS is automatically sent. Check **Manage orders** regularly and contact the customer using the recorded details to arrange payment and delivery.

Search orders by name, email, phone or a DK reference. Use fulfilment tabs, payment filters and newest/oldest sorting. The list fetches only summary fields in pages of 25; complete order details are loaded when an order is opened. Open an order to update fulfilment status, record payment, add tracking details and keep a private note. Concurrent edits are rejected when an order has changed in another tab; refresh and review the latest details before saving. Cancellation restores stock once and is final. Recording a refund does not move money; arrange and verify the refund separately.

## Customer payment proofs

Add real transfer/payment instructions under **Shop settings → Payment instructions**. These instructions appear publicly at checkout and on the customer's private order page. The site does not collect card details or process transfers.

After an arranged-payment purchase, customers can upload a PDF payment invoice, bank receipt or JPEG/PNG/WebP/HEIC image on the confirmation screen. The **Manage payment & view your order** link opens `/shop/orders/ORDER-ID`. Customers can bookmark it and return in the same browser for 30 days. Access uses a 256-bit random credential in an HttpOnly, SameSite cookie; only its hash is saved with the order. The URL alone grants no access. Using another browser or clearing cookies requires contacting the shop. Older orders created before this feature have no customer upload credential.

Uploads are limited to 5 MB per file and five proofs per order, with a per-order attempt limit. Image contents are validated, rotated, stripped of metadata and resized for legibility; proofs deliberately use a higher resolution than product photos. PDF bytes are retained, served as private attachments, and never embedded as executable HTML. Proof data lives in `shop_payment_proofs`, separate from public `media`, and is excluded from sitemaps. File requests verify the owning customer's cookie or admin session and send `private, no-store`, `noindex` and `nosniff` headers.

Submitting evidence leaves the order **unpaid** and the proof **awaiting verification**. Use **Orders → Payment proof to review** to find submissions, then open an order's **Payment proofs** section. Compare the evidence against your actual bank/payment records. **Verify payment & mark paid** atomically approves the pending proof and records payment as paid. **Reject proof** requires a customer-visible explanation and leaves payment unpaid so the customer can resubmit. Reviewed submissions cannot be silently re-reviewed, and cancelled/refunded/paid orders cannot be approved through this action. Proofs, reviews and internal management controls are omitted from customer invoices and printouts.

## Receipts, invoices and shipping documents

Each order has three document cards. **View & print** opens a document with A4 print controls. **PDF** downloads an actual PDF directly, generated on demand by the Node server without launching a browser or adding PDF code to the storefront bundle.

- **Order receipt:** acknowledges the order and records its current payment status. It does not claim that an unpaid order has been paid.
- **Invoice:** includes the seller profile name/email, customer and delivery details, invoice/order reference, purchase-time items, quantities, prices, delivery charge, total and amount due. Cancelled, paid and refunded orders show no amount due. No tax or due date is invented.
- **Shipping invoice:** a packing and dispatch document with delivery address, contact details, tracking reference, items/quantities, total units and handover lines. Item prices are excluded; an unpaid cash-on-delivery order shows the amount to collect. Cancelled orders are marked clearly.

Documents use the saved order data. Admin navigation, private internal notes and editing controls are omitted from print and downloads. Every PDF request checks admin authentication, validates the order/type, and returns private `no-store` and `noindex` headers. Previews and downloads share a document model for seller identity, document references, totals, payment status, item counts and delivery instructions. Templates use the saved storefront brand name and profile name/email/location, plus the configured public site URL. No employer/company name, tax registration, discount, payment date or due date is invented. Unassigned tracking is labelled honestly. PDFs use a coordinated A4 layout with a product table, repeated headings on continuation pages, and page numbers. PDFs embed subsets of bundled regular and bold DejaVu Sans fonts (license in `assets/fonts/DejaVuSans-LICENSE.txt`); no remote font or document service is needed. Sending a downloaded document to a customer remains a manual action.

## Deployment and Google discovery

`npm run build` applies the additive `db/schema.sql` migration through the existing setup script. Existing products, orders and other content are preserved. The local database has been initialized; a production deployment must use its own persistent PostgreSQL database and the normal build process. Set `SITE_URL` to the real HTTPS origin so canonical links, uploads and sitemap URLs use your domain.

Published products have server-rendered pages, descriptive URLs, canonical metadata, social previews and Product/Offer JSON-LD using actual prices, currency and stock. Published products and images appear in separate sharded files such as `/sitemaps/products-0.xml`, linked from `/sitemap.xml`. Drafts, checkout, customer details and admin pages are excluded. Sitemap responses support ETags and cache revalidation.

Use the existing **Search & SEO** admin section for the Google verification token, verify the live domain in Google Search Console, and submit `https://YOUR-DOMAIN/sitemap.xml`. Inspect a published product URL and use Google's Rich Results Test after deployment. Indexing and rich search results are Google's decision and cannot be guaranteed. See [Google's indexing requirements](https://developers.google.com/search/docs/essentials/technical).

## Document design references

The document structure was informed by [Stripe’s invoice layout guidance](https://stripe.com/resources/more/creating-an-invoice-explained), [Shopify’s order-document types](https://help.shopify.com/en/manual/fulfillment/managing-orders/printing-orders/creating-document-templates), and [Shopify’s packing-slip customisation guidance](https://help.shopify.com/en/manual/fulfillment/managing-orders/printing-orders/customizing-packing-slips). The implementation uses original styling with the site's warm accent, actual stored order data and merchant settings. Invoice references and order placement dates are labelled as such; the system does not invent a separate legal issue or payment date.
