import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sortProductsByCategory } from './catalogOrder.js'

test('ordered categories group legacy product responses without changing within-category order', () => {
  const products = [
    { id: 9, categoryKey: 't-shirt' },
    { id: 7, categoryKey: 'tracksuit' },
    { id: 8, categoryKey: 't-shirt' },
    { id: 6, categoryKey: 'denim' },
    { id: 5, categoryKey: 'tracksuit' },
  ]
  const categories = [{ key: 'tracksuit' }, { key: 'denim' }, { key: 't-shirt' }]
  assert.deepEqual(sortProductsByCategory(products, categories).map((p) => p.id), [7, 5, 6, 9, 8])
  assert.deepEqual(products.map((p) => p.id), [9, 7, 8, 6, 5])
  assert.deepEqual(categories.map((c) => c.key), ['tracksuit', 'denim', 't-shirt'])

  assert.deepEqual(
    sortProductsByCategory(products, [...categories].reverse()).map((p) => p.id),
    [9, 8, 6, 7, 5],
  )
})

test('category rank metadata is used when the full category list is unavailable', () => {
  const products = [
    { id: 9, categoryId: 1, categorySortOrder: 3 },
    { id: 7, categoryId: 2, categorySortOrder: 0 },
    { id: 8, categoryId: 1, categorySortOrder: 3 },
    { id: 6, categoryId: 3, categorySortOrder: 0 },
    { id: 5 },
  ]
  assert.deepEqual(sortProductsByCategory(products).map((p) => p.id), [7, 6, 9, 8, 5])
})

test('uncategorized and unknown categories follow configured categories', () => {
  const products = [
    { id: 5 },
    { id: 6, categoryKey: 'unknown' },
    { id: 7, categoryKey: 'denim' },
    { id: 8, categoryKey: 'denim' },
  ]
  assert.deepEqual(
    sortProductsByCategory(products, [{ key: 'denim' }]).map((p) => p.id),
    [7, 8, 5, 6],
  )
  assert.deepEqual(sortProductsByCategory([]), [])
})
