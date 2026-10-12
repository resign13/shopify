# English storefront

- Storefront UI and system errors use English, including legacy `lang=zh` links.
- Categories and product copy use English translation records. Missing English
  product titles use the existing product code/SKU; untranslated descriptions are
  omitted rather than silently falling back to Chinese.
- Historical Chinese order item titles display the existing English product title
  (or SKU when unavailable), without changing stored order snapshots.
- Original identifiers and customer-entered names, addresses and notes remain
  unchanged. This does not translate or overwrite business data.
- Backend validation errors and frontend mixed-release/network errors have an
  English boundary. Admin UI and shared admin validation messages are untouched.

## Verification

- Backend: 26 isolated PostgreSQL unit/interface tests passed, including six
  English-specific regression tests.
- Frontend: 20 Node tests passed, including fixed-interface Chinese-literal guard.
- Browser: 16 assertions passed against `gingtto_catalog_browser_test`, covering
  login failure, legacy Chinese backend errors, catalog, presale, inventory,
  orders, account, checkout, product detail and mobile layout.
- Frontend production build passed; business data is not rewritten by this change.

Browser fixtures must have English product copy in their English translation
slots. The shared admin fixture deliberately copies Chinese test titles into
both languages, so only the isolated browser test data is prepared with English
titles/colors before this storefront browser check.

## Catalog stock and repeated summary cleanup

- Catalog and pre-sale style headers show `Total stock: N pcs`; each color card
  shows `Stock: N pcs`. Each size's negative balance is clipped to zero before
  aggregation, so shortages do not cancel another size/color's available stock.
- No procurement-stage quantity is counted. Existing checkout and inventory
  rules, API responses and stored balances are unchanged.
- A summary equal to the title (ignoring casing and whitespace) is omitted from
  the size line. Real material/description summaries remain visible.
- Current frontend regression: 23 tests passed. Isolated browser regression:
  11 checks passed including shortage zero, style/color totals, summary cleanup,
  preservation of material copy, pre-sale reuse and mobile overflow.

## Release

The existing GitHub Actions deploy workflow preserves uploaded images, runtime
configuration and business data, backs up code/database, and performs health and
read-only catalog checks. The admin release provides compatible presale schema
and configuration before the storefront switches to the new grouped catalog.
