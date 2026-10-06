import assert from 'node:assert/strict'
import { test } from 'node:test'
import { inventorySku, sortInventoryProducts } from './inventoryOrder.js'

test('inventory keeps category priority and groups color SKUs in natural order', () => {
  const products = [
    { productCode: 'CS3103-浅卡', categoryKey: 'shirt' },
    { productCode: 'ZM4762', categoryKey: 'shirt' },
    { productCode: 'CS3102-黑', categoryKey: 'shirt' },
    { productCode: 'ZM10', categoryKey: 'tracksuit' },
    { productCode: 'ZM4760', categoryKey: 'shirt' },
    { productCode: 'CS3102-灰', categoryKey: 'shirt' },
    { productCode: 'ZM2', categoryKey: 'tracksuit' },
  ]
  const original = structuredClone(products)
  const categories = [{ key: 'tracksuit' }, { key: 'shirt' }]
  const codes = (items) => items.map(inventorySku)
  assert.deepEqual(codes(sortInventoryProducts(products, categories)), [
    'ZM2', 'ZM10', 'CS3102-灰', 'CS3102-黑', 'CS3103-浅卡', 'ZM4760', 'ZM4762',
  ])
  assert.deepEqual(codes(sortInventoryProducts(products, [...categories].reverse())), [
    'CS3102-灰', 'CS3102-黑', 'CS3103-浅卡', 'ZM4760', 'ZM4762', 'ZM2', 'ZM10',
  ])
  assert.deepEqual(products, original)
  assert.deepEqual(categories, [{ key: 'tracksuit' }, { key: 'shirt' }])
})

test('inventory uses displayed SKU, trims blanks and keeps equal/missing SKUs stable', () => {
  const products = [
    { id: 1, productCode: ' ', sku: ' CS10 ' },
    { id: 2, productCode: null },
    { id: 3, productCode: 'CS2', sku: 'ZZ99' },
    { id: 4, productCode: ' cs2 ' },
    { id: 5, productCode: '', sku: '' },
    { id: 6, sku: 'CS3' },
  ]
  assert.deepEqual(sortInventoryProducts(products).map((p) => p.id), [3, 4, 6, 1, 2, 5])
  assert.equal(inventorySku(products[0]), 'CS10')
  assert.equal(inventorySku(products[2]), 'CS2')
  assert.deepEqual(sortInventoryProducts([]), [])
})

test('inventory respects category metadata fallback and leaves unknown categories last', () => {
  const products = [
    { id: 1, productCode: 'AA1', categoryId: 1, categorySortOrder: 5 },
    { id: 2, productCode: 'ZZ10', categoryId: 2, categorySortOrder: 0 },
    { id: 3, productCode: 'ZZ2', categoryId: 2, categorySortOrder: 0 },
    { id: 4, productCode: 'AA0' },
  ]
  assert.deepEqual(sortInventoryProducts(products).map((p) => p.id), [3, 2, 1, 4])
  assert.deepEqual(sortInventoryProducts([
    { id: 1, productCode: 'AA1', categoryKey: 'unknown' },
    { id: 2, productCode: 'ZZ1', categoryKey: 'shirt' },
  ], [{ key: 'shirt' }]).map((p) => p.id), [2, 1])
})
