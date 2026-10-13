async (page) => {
  if (!page.url().startsWith('http://127.0.0.1:5371/')) throw new Error('Isolated *_test fixture server required')
  let checks = 0
  const check = (value, message) => { if (!value) throw new Error(message); checks++ }
  await page.setViewportSize({ width: 1600, height: 1000 })
  if (await page.getByRole('textbox', { name: 'Email' }).count()) {
    await page.getByRole('textbox', { name: 'Email' }).fill('buyer@gingtto.test')
    await page.getByRole('textbox', { name: 'Password' }).fill('Fixture-Only')
    await page.getByRole('button', { name: 'Login to Continue' }).click()
    await page.waitForURL('**/shop')
  }
  const products = Array.from({ length: 163 }, (_, i) => ({
    id: i + 1, slug: `pdf-shirt-${i + 1}`, name: i === 1 ? 'Mercerized Cotton T-Shirt - a very long product name for wrapping' : 'Tracksuit - Without hood',
    productCode: `PDF-${String(i + 1).padStart(3, '0')}${i === 0 ? '-黑' : ''}`, categoryKey: 'tracksuit', categoryLabel: 'Tracksuit - Without hood',
    colorName: ['Black', 'White', 'Brown'][i % 3], image: '/uploads/pdf-fixture.jpg', stock: 0,
    sizePrices: [{ sizeCode: 'S', stock: 42 }, { sizeCode: 'M', stock: -123 }, { sizeCode: 'L', stock: 120 }, { sizeCode: 'XL', stock: 86 }, { sizeCode: 'XXL', stock: 51 }],
  }))
  let requests = 0, fail = false, hold = false, release
  const gate = new Promise(resolve => { release = resolve })
  await page.route('**/api/products?**', async route => {
    requests++
    if (hold) await gate
    if (fail) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Inventory is temporarily unavailable.' }) })
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ items: products }) })
  })
  // Synthetic image, no filesystem/production content or business write needed.
  await page.route('**/uploads/pdf-fixture.jpg', route => route.fulfill({
    contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="200"><rect width="160" height="200" fill="#f0f0f0"/><path d="M58 20L35 30L8 70L37 90L45 70L45 180L115 180L115 70L123 90L152 70L125 30L102 20Q80 40 58 20" fill="#333"/></svg>',
  }))
  await page.goto('http://127.0.0.1:5371/inventory')
  await page.locator('.inventory-sku').first().waitFor()
  check(await page.locator('.inventory-sku').count() === 20, 'Expected paginated inventory')
  await page.getByRole('searchbox').fill('PDF-001')
  check(await page.locator('.inventory-sku').count() === 1, 'Search must still filter the on-screen table')
  await page.getByRole('searchbox').fill('')
  check(await page.locator('.inventory-sku').count() === 20, 'Clearing search must restore all products')
  const button = page.getByRole('button', { name: 'Export PDF', exact: true })
  check(await button.isVisible(), 'Export control missing')
  // Change stock after page load; export must use a fresh response, not old rows.
  products[0].sizePrices[0].stock = 99
  const before = requests
  hold = true
  const downloadPromise = page.waitForEvent('download')
  await button.click()
  check(await page.locator('.inventory-export-button').isDisabled(), 'Export must prevent duplicate clicks')
  await page.getByRole('searchbox').fill('PDF-001')
  hold = false
  release()
  const download = await downloadPromise
  await download.saveAs('D:/dulizhan/output/pdf/inventory-all-test.pdf')
  await page.getByRole('status').filter({ hasText: 'PDF downloaded:' }).waitFor()
  check(requests === before + 1, 'Expected one fresh full product request')
  check(await page.getByRole('status').innerText() === 'PDF downloaded: 163 color SKUs, 24 pages.', 'Export omitted rows or images')
  check(download.suggestedFilename().startsWith('GINGTTO-Inventory-'), 'Download filename incorrect')
  check(await button.isEnabled(), 'Control not restored after download')
  await page.getByRole('searchbox').fill('')
  await page.screenshot({ path: 'output/playwright/inventory-pdf-desktop.png', fullPage: false })

  fail = true
  await button.click()
  await page.getByRole('alert').waitFor()
  check((await page.getByRole('alert').innerText()).includes('temporarily unavailable'), 'Request error must be visible; no cached PDF')
  check(await button.isEnabled(), 'Control not restored after failure')
  fail = false

  await page.getByRole('searchbox').fill(' PDF-001, pdf-002\uFF0CPDF-025,PDF-001, ')
  check(await page.locator('.inventory-sku').count() === 3, 'Multiple codes must match any code, including other pages, without duplicates')
  const filteredDownload = page.waitForEvent('download')
  await button.click()
  await (await filteredDownload).saveAs('D:/dulizhan/output/pdf/inventory-multi-code-test.pdf')
  await page.getByRole('status').filter({ hasText: 'PDF downloaded: 3 color SKUs' }).waitFor()
  check((await page.getByRole('status').innerText()) === 'PDF downloaded: 3 color SKUs, 1 pages.', 'Filtered PDF includes unwanted products')
  await page.screenshot({ path: 'output/playwright/inventory-pdf-multi-code.png', fullPage: false })

  // Match across more than one screen page: PDF must not stop at 20 rows.
  await page.getByRole('searchbox').fill('PDF-0')
  check(await page.locator('.inventory-sku').count() === 20, 'Expected paginated multi-match result')
  const pagedDownload = page.waitForEvent('download')
  await button.click()
  await (await pagedDownload).saveAs('D:/dulizhan/output/pdf/inventory-filtered-pages-test.pdf')
  await page.getByRole('status').filter({ hasText: 'PDF downloaded: 99 color SKUs' }).waitFor()
  check((await page.getByRole('status').innerText()) === 'PDF downloaded: 99 color SKUs, 15 pages.', 'Filtered export truncated to displayed page')

  await page.getByRole('searchbox').fill('NOT-FOUND,ALSO-NOT-FOUND')
  await button.click()
  await page.getByRole('alert').waitFor()
  check((await page.getByRole('alert').innerText()).includes('Nothing to export'), 'Empty filtered results must not download all products')
  check(await button.isEnabled(), 'Retry control missing after empty result')

  await page.getByRole('searchbox').fill('PDF-001,PDF-002')
  await page.getByRole('combobox', { name: 'Category', exact: true }).selectOption('denim')
  check(await page.locator('.inventory-sku').count() === 0, 'Category must combine with the code query')
  await button.click()
  await page.getByRole('alert').waitFor()
  check((await page.getByRole('alert').innerText()).includes('Nothing to export'), 'PDF ignored category filter')
  await page.getByRole('combobox', { name: 'Category', exact: true }).selectOption('')
  // Test all genuine extra sizes, missing-image fallback, Unicode and panels.
  products.splice(1)
  products[0].sizePrices.push({ sizeCode: '5-6Y', stock: 7 }, { sizeCode: '7-8Y', stock: -8 })
  products[0].image = '/uploads/does-not-exist-pdf-test.jpg'
  await page.goto('http://127.0.0.1:5371/inventory')
  await page.locator('.inventory-sku').first().waitFor()
  check(await page.getByRole('columnheader', { name: '5-6Y', exact: true }).isVisible(), 'Extra sizes disappeared from the table')
  const panelDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export PDF', exact: true }).click()
  await (await panelDownload).saveAs('D:/dulizhan/output/pdf/inventory-extra-sizes-test.pdf')
  await page.getByRole('status').filter({ hasText: 'PDF downloaded:' }).waitFor()
  check((await page.getByRole('status').innerText()).includes('1 color SKUs, 2 pages'), 'Extra size panel missing')
  check((await page.getByRole('status').innerText()).includes('1 product images could not be loaded'), 'Failed images must not be silent')
  await page.setViewportSize({ width: 390, height: 844 })
  check(await page.getByRole('button', { name: 'Export PDF', exact: true }).isVisible(), 'Mobile export missing')
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Mobile outer layout overflow')
  await page.screenshot({ path: 'output/playwright/inventory-pdf-mobile.png', fullPage: false })
  return { checks, all163Rows: true, multiCodeFilteredPdf: true, fullwidthCommas: true, categoryAndSearch: true, emptyResults: true, freshSnapshot: true, filteredPaginationDoesNotTruncateExport: true, extraSizes: true, errors: true, mobile: true }
}
