import { sortProductsByCategory } from './catalogOrder.js'

const skuCollator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })

export function inventorySku(product) {
  return String(product?.productCode ?? '').trim() || String(product?.sku ?? '').trim()
}

export function sortInventoryProducts(products, categories = []) {
  const bySku = [...products].sort((left, right) => {
    const leftSku = inventorySku(left)
    const rightSku = inventorySku(right)
    if (!leftSku || !rightSku) return Number(!leftSku) - Number(!rightSku)
    return skuCollator.compare(leftSku, rightSku)
  })
  // Stable category grouping keeps SKU order within each category. Sort the full
  // list before filtering/pagination, without changing shared catalog ordering.
  return sortProductsByCategory(bySku, categories)
}
