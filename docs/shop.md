# Shop operations

The storefront is `/shop`. Product and shop settings are at `/admin/shop` (**Products & shop** in the sidebar). Orders have a separate protected workspace at `/admin/orders` (**Orders**). Old `/admin/shop/orders` links redirect to the new workspace.

## Add and publish products

1. Select **Add product**, enter the name, URL slug, description/specifications, price, category and available stock.
2. Select and upload up to six product images at once. The first image is the default main image for the product page and shop card; use **Use as cover** to change it. Customers can tap the small photo thumbnails or previous/next controls to switch images. Existing uploads automatically compress to WebP under the site's image budget.
3. Save as a draft while preparing the listing. Choose **Published** and save to make it available in the storefront and product sitemap. Published products require an image. Zero stock shows as sold out.
4. Optional SEO title and description override the automatic defaults. Keep published URL slugs stable to preserve links.

Concurrent orders change stock. If a product changes while its editor is open, saving is rejected; refresh to review the current stock before saving again. Hide products using Draft; historical order details remain intact.

## Checkout and fulfilment

The shop starts with LKR, Sri Lanka delivery, and payment arranged after ordering. Set your delivery fee, delivery timing/instructions and returns information in **Shop settings** before selling. A delivery fee of zero adds no delivery charge. Changing currency does not convert numeric product prices; review prices when changing it.

Customers can search/filter products, add quantities to a persistent shopping bag, and check out without an account. Checkout collects full name, email, phone, street address, city, postal code, country, optional notes and fulfilment consent. The final review shows item prices, quantities, subtotal, delivery fee, total and payment information. Card details are never collected.

Orders are saved transactionally in PostgreSQL; the server checks current price, currency, delivery fee, payment method and stock. Stock is locked before allocation to prevent overselling. Repeated submissions of the same checkout do not create duplicate orders. Basic per-email order rate limiting is included.

After a saved order, customers see a DK order reference. They are told the owner will contact them; no email/SMS is automatically sent. Check **Manage orders** regularly and contact the customer using the recorded details to arrange payment and delivery.

Search orders by name, email, phone or a DK reference. Use fulfilment tabs, payment filters and newest/oldest sorting. The list fetches only summary fields in pages of 25; complete order details are loaded when an order is opened. Open an order to update fulfilment status, record payment, add tracking details and keep a private note. Concurrent edits are rejected when an order has changed in another tab; refresh and review the latest details before saving. Cancellation restores stock once and is final. Recording a refund does not move money; arrange and verify the refund separately.

## Receipts, invoices and shipping documents

Each order has three document cards. **View & print** opens a document with A4 print controls. **PDF** downloads an actual PDF directly, generated on demand by the Node server without launching a browser or adding PDF code to the storefront bundle.

- **Order receipt:** acknowledges the order and records its current payment status. It does not claim that an unpaid order has been paid.
- **Invoice:** includes the seller profile name/email, customer and delivery details, invoice/order reference, purchase-time items, quantities, prices, delivery charge, total and amount due. Cancelled, paid and refunded orders show no amount due. No tax or due date is invented.
- **Shipping invoice:** a packing and dispatch document with delivery address, contact details, tracking reference, items/quantities, total units and handover lines. Item prices are excluded; an unpaid cash-on-delivery order shows the amount to collect. Cancelled orders are marked clearly.

Documents use the saved order data. Admin navigation, private internal notes and editing controls are omitted from print and downloads. Every PDF request checks admin authentication, validates the order/type, and returns private `no-store` and `noindex` headers. PDFs embed a subset of a bundled DejaVu Sans font (license in `assets/fonts/DejaVuSans-LICENSE.txt`); no remote font or document service is needed. Sending a downloaded document to a customer remains a manual action.

## Deployment and Google discovery

`npm run build` applies the additive `db/schema.sql` migration through the existing setup script. Existing products, orders and other content are preserved. The local database has been initialized; a production deployment must use its own persistent PostgreSQL database and the normal build process. Set `SITE_URL` to the real HTTPS origin so canonical links, uploads and sitemap URLs use your domain.

Published products have server-rendered pages, descriptive URLs, canonical metadata, social previews and Product/Offer JSON-LD using actual prices, currency and stock. Published products and images appear in separate sharded files such as `/sitemaps/products-0.xml`, linked from `/sitemap.xml`. Drafts, checkout, customer details and admin pages are excluded. Sitemap responses support ETags and cache revalidation.

Use the existing **Search & SEO** admin section for the Google verification token, verify the live domain in Google Search Console, and submit `https://YOUR-DOMAIN/sitemap.xml`. Inspect a published product URL and use Google's Rich Results Test after deployment. Indexing and rich search results are Google's decision and cannot be guaranteed. See [Google's indexing requirements](https://developers.google.com/search/docs/essentials/technical).
