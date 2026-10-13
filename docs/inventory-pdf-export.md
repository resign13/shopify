# Storefront inventory PDF export

The **Export PDF** button on `/inventory` downloads all active products matching
the current search/category filters, including other pages. With no filters it
downloads all active products available to the signed-in buyer.
The interface and document labels remain English.

Enter multiple style codes separated by commas, e.g. `ZM4757,CS5101`.
Search terms use OR; the selected category combines with the query using AND.
Both ASCII/fullwidth commas, surrounding spaces and mixed case work. Blank
terms are ignored, duplicate terms do not duplicate products, and a single
search still supports titles, color SKUs, explicit style codes and colors.
The chosen scope is frozen at click time; input edits during generation affect
only the next export. Empty results produce a visible message, not an all-product
fallback. PDF summary totals, size panels and filter labels reflect exported rows.

## Data and layout

- Fetch `/api/products?lang=en` once at click time using the existing buyer login.
  No new endpoint, database column, order or inventory write is introduced.
- Use a detached public-only snapshot and the same category/natural SKU sorting,
  size normalization and available-stock calculation as the inventory screen.
- Clip each negative real-size balance to zero **before** summing. Preserve true
  nonstandard sizes (including children's sizes), and never substitute procurement
  stages or weight for available stock.
- Export A4 landscape pages with the brand, inventory timestamp, first-page
  summary cards, beige table headers, images, stock pills and all-size totals.
  Repeat headers/footers; keep each row on one page. More than six size columns
  use labelled panels with repeated product identity and explicitly nonadditive
  all-size totals. Images retain their proportions.
- Browser-font high-resolution page rendering supports Unicode SKU suffixes
  without introducing a font server. PDF page images are rasterized at 2x logical
  resolution; the table text is not a selectable text layer.
- The PDF library is loaded only when exporting. Images are fetched with bounded
  concurrency, an eight-second attempt timeout, CORS and original-source fallback.
  Unavailable images use `No Image`, with a visible missing-image count after download.
- Failed inventory requests do not export old cached rows. Disable duplicate
  clicks; cancel work when leaving the page or changing login identity. Display
  English request/rendering/download errors and allow retry.

## Local validation

1. Run frontend regressions and build from `frontend`:
   `node --test src/storefront/utils/*.test.js src/storefront/stores/*.test.js src/storefront/views/*.test.js`
   followed by `npm run build`.
2. Run `scripts/verify-inventory-pdf-browser.js` with Playwright CLI `run-code`
   against the explicit isolated `*_test` server on port 5371. It uses the
   existing buyer fixture and intercepted synthetic products/images, not the
   synchronized manual database. Check unfiltered 163-product/24-page export,
   input changes during export, three comma-separated matches, a 99-product
   filtered cross-page export, category intersections and no-match results,
   a fresh stock change, duplicate prevention, request failure, extra-size panels,
   missing-image feedback and mobile layout.
3. Render the downloaded PDF using Poppler or PyMuPDF. Inspect the first,
   intermediate and final pages, long names, Unicode SKUs, totals and size panels.
4. Manual verification uses the current branch's built frontend at
   `http://127.0.0.1:5011/inventory`, connected to the synchronized local database
   `127.0.0.1:55439/lumiere_admin`; use the existing real account/password.

No production deployment is performed by this feature's implementation.
