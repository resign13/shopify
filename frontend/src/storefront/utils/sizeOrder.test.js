import assert from 'node:assert/strict'
import { test } from 'node:test'
import { productSizeRows, normalizeSizeQuantity, selectedSizeLines } from './sizeOrder.js'

test('uses each real size stock even when the parent net balance is zero or negative', () => {
  const product = { stock: -50, price: 23, sizes: ['S','M','L','S'], sizePrices: [
    { sizeCode: 'S', price: 23, stock: 21 },
    { sizeCode: 'M', price: 25, stock: -3 },
    { sizeCode: 'L', stock: 0 },
    { sizeCode: 'XL', price: 27, stock: 10 },
  ] }
  const before = structuredClone(product)
  assert.deepEqual(productSizeRows(product), [
    { sizeCode: 'S', price: 23, stock: 21 },
    { sizeCode: 'M', price: 25, stock: 0 },
    { sizeCode: 'L', price: 23, stock: 0 },
    { sizeCode: 'XL', price: 27, stock: 10 },
  ])
  assert.deepEqual(product, before)
  const incomplete = { stock: 100, sizes: ['S','M'], sizePrices: [{ sizeCode: 'S', stock: 3, price: 17 }] }
  assert.equal(productSizeRows(incomplete)[1].stock, 0)
})

test('empty products and legacy size-free products are handled without invented sizes', () => {
  assert.deepEqual(productSizeRows(null), [])
  assert.deepEqual(productSizeRows({ stock: 4, price: 8 }), [{ sizeCode: '', stock: 4, price: 8 }])
  assert.deepEqual(productSizeRows({ sizes: [], sizePrices: [], stock: -4 }), [{ sizeCode: '', stock: 0, price: 0 }])
})

test('input quantities are nonnegative finite integers capped at per-size stock', () => {
  for (const value of [undefined, null, '', -1, 'not-a-number', Infinity, NaN]) assert.equal(normalizeSizeQuantity(value, 21), 0)
  assert.equal(normalizeSizeQuantity('2.8', 21), 2)
  assert.equal(normalizeSizeQuantity(100, 21), 21)
  assert.equal(normalizeSizeQuantity(3, -4), 0)
  assert.equal(normalizeSizeQuantity(3, Infinity), 0)
})

test('one selection contains all positive sizes and excludes unavailable or unselected sizes', () => {
  const rows = productSizeRows({ stock: 0, sizePrices: [
    { sizeCode: 'S', stock: 10, price: 17 }, { sizeCode: 'M', stock: 5, price: 19 },
    { sizeCode: 'L', stock: 0, price: 21 }, { sizeCode: 'XL', stock: -8, price: 23 },
  ] })
  const quantities = { S: 2, M: 3, L: 1, XL: 2, UNKNOWN: 100 }
  assert.deepEqual(selectedSizeLines(rows, quantities), [
    { sizeCode: 'S', stock: 10, price: 17, quantity: 2 },
    { sizeCode: 'M', stock: 5, price: 19, quantity: 3 },
  ])
  assert.deepEqual(quantities, { S: 2, M: 3, L: 1, XL: 2, UNKNOWN: 100 })
})
