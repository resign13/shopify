import assert from 'node:assert/strict'
import { test } from 'node:test'
import { inventorySnapshot, inventorySearchTerms, filterInventorySnapshot } from './inventoryData.js'
import { inventoryPdfPages, exportInventoryPdf } from './inventoryPdf.js'

test('inventory snapshot clips each shortage and is detached from public products', () => {
  const products = [{ id: 1, name: 'Shirt', sku: 'CS2-Black', categoryKey: 'shirts', stock: -3,
    weightGrams: 100, defectivePending: 7,
    sizePrices: [{ sizeCode: 'S/28', stock: 5 }, { sizeCode: 'M', stock: -8 }, { sizeCode: '2XL', stock: 2 }] }]
  const snapshot = inventorySnapshot(products)
  assert.equal(snapshot.totalStock, 7)
  assert.equal(snapshot.rows[0].sizeStocks.S, 5)
  assert.equal(snapshot.rows[0].sizeStocks.M, 0)
  assert.equal(snapshot.rows[0].sizeStocks.XXL, 2)
  products[0].sizePrices[0].stock = 100
  assert.equal(snapshot.rows[0].sizeStocks.S, 5)
  assert.doesNotMatch(JSON.stringify(snapshot), /weightGrams|defectivePending/)
})

test('real custom and empty size codes remain visible; nonfinite and legacy balances are safe', () => {
  const snapshot = inventorySnapshot([
    { id: 1, sku: 'A1', sizePrices: [{ sizeCode: '5-6Y', stock: 7 }, { sizeCode: '7-8Y', stock: -10 }, { sizeCode: '', stock: 2 }] },
    { id: 2, sku: 'A2', stock: -5 },
    { id: 3, sku: 'A3', stock: 4 },
    { id: 4, sku: 'A4', stock: 'invalid', sizePrices: [{ sizeCode: 'S', stock: Infinity }] },
  ])
  assert.equal(snapshot.totalStock, 13)
  assert.deepEqual(snapshot.columns.slice(6).map(c => c.label), ['5-6Y', '7-8Y', 'Unspecified'])
  assert.equal(snapshot.rows[0].sizeStocks['5-6Y'], 7)
  assert.equal(snapshot.rows[0].sizeStocks['7-8Y'], 0)
})

test('PDF plans every product across pages, repeats all size panels and never splits rows', () => {
  const rows = Array.from({ length: 163 }, (_, id) => ({ id }))
  const columns = Array.from({ length: 14 }, (_, id) => ({ key: String(id), label: String(id) }))
  const pages = inventoryPdfPages(rows, columns)
  assert.equal(pages[0].rows.length, 6)
  assert.ok(pages.slice(1).every(page => page.rows.length <= 7 && page.columns.length <= 6))
  for (let panelIndex = 0; panelIndex < 3; panelIndex++) {
    const panel = pages.filter(page => page.panelIndex === panelIndex)
    assert.deepEqual(panel.flatMap(page => page.rows.map(row => row.id)), rows.map(row => row.id))
    assert.deepEqual(panel[0].columns, columns.slice(panelIndex * 6, panelIndex * 6 + 6))
  }
  assert.equal(pages.filter(p => p.first).length, 1)
  assert.deepEqual(rows.map(row => row.id), Array.from({ length: 163 }, (_, id) => id))
})

test('empty and cancelled exports stop before loading the PDF library or drawing', async () => {
  await assert.rejects(exportInventoryPdf({ rows: [], columns: [] }), /No inventory/)
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(exportInventoryPdf({ rows: [{ id: 1 }], columns: [] }, { signal: controller.signal }), { name: 'AbortError' })
})

test('comma-separated search normalizes case, fullwidth commas, whitespace and duplicates', () => {
  assert.deepEqual(inventorySearchTerms(' ZM4757, cs5101，ZM4757, , '), ['zm4757', 'cs5101'])
  assert.deepEqual(inventorySearchTerms('，， , '), [])
  assert.deepEqual(inventorySearchTerms(null), [])
  assert.deepEqual(inventorySearchTerms('Cotton T-Shirt'), ['cotton t-shirt'])
})

test('multi-code OR search includes all colors; category remains AND and summary is filtered', () => {
  const all = inventorySnapshot([
    { id: 1, sku: 'ZM4757', categoryKey: 'tracksuit', sizePrices: [{ sizeCode: 'S', stock: 5 }, { sizeCode: 'M', stock: -8 }] },
    { id: 2, sku: 'CS5101-Black', categoryKey: 'shirt', sizePrices: [{ sizeCode: 'L', stock: 7 }] },
    { id: 3, sku: 'COL-99', styleCode: 'CS5101', categoryKey: 'shirt', sizePrices: [{ sizeCode: 'XL', stock: 11 }] },
    { id: 4, sku: 'OTHER', colorGroup: 'ET5101', categoryKey: 'kids', sizePrices: [{ sizeCode: '5-6Y', stock: 99 }] },
  ])
  const result = filterInventorySnapshot(all, { keyword: 'ZM4757,cs5101,CS5101' })
  assert.deepEqual(result.rows.map(row => row.id), [3, 2, 1])
  assert.equal(result.totalStock, 23)
  assert.equal(result.scopeLabel, 'Filtered results')
  assert.equal(result.filterSummary, 'Search: zm4757, cs5101')
  assert.equal(result.columns.length, 6)
  assert.deepEqual(filterInventorySnapshot(all, { keyword: 'ZM4757,CS5101', categoryKey: 'shirt' }).rows.map(row => row.id), [3, 2])
  assert.deepEqual(filterInventorySnapshot(all, { keyword: 'ET5101' }).rows.map(row => row.id), [4])
  assert.equal(filterInventorySnapshot(all, { keyword: 'ET5101' }).columns.at(-1).label, '5-6Y')
  assert.equal(filterInventorySnapshot(all, { keyword: ',， , ' }).totalStock, 122)
  assert.equal(filterInventorySnapshot(all).scopeLabel, 'All products')
  const absent = filterInventorySnapshot(all, { keyword: 'NOT-FOUND' })
  assert.equal(absent.rows.length, 0)
  assert.equal(absent.totalStock, 0)
  assert.equal(all.rows.length, 4)
  assert.equal(all.columns.length, 7)
})

test('filtered snapshot retains matches beyond the first screen page and does not duplicate rows', () => {
  const all = inventorySnapshot(Array.from({ length: 41 }, (_, index) => ({ id: index + 1, sku: `CS1-${index}`, sizePrices: [{ sizeCode: 'S', stock: 2 }] })))
  const result = filterInventorySnapshot(all, { keyword: 'CS1, CS1-40, CS1' })
  assert.equal(result.rows.length, 41)
  assert.equal(result.totalStock, 82)
  assert.deepEqual(inventoryPdfPages(result.rows, result.columns).flatMap(page => page.rows.map(row => row.id)), result.rows.map(row => row.id))
})
