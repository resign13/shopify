import { inventorySku, sortInventoryProducts } from './inventoryOrder.js'

export const standardSizeColumns = [
  { key: 'S', label: 'S/28', aliases: ['S', '28'] },
  { key: 'M', label: 'M/30', aliases: ['M', '30'] },
  { key: 'L', label: 'L/32', aliases: ['L', '32'] },
  { key: 'XL', label: 'XL/34', aliases: ['XL', '34'] },
  { key: 'XXL', label: 'XXL/36', aliases: ['XXL', '2XL', '36'] },
  { key: 'XXXL', label: 'XXXL/38', aliases: ['XXXL', '3XL', '38'] },
]
const aliases = Object.fromEntries(standardSizeColumns.flatMap(column => column.aliases.map(alias => [alias, column.key])))

export function availableStock(value) {
  const stock = Number(value)
  return Number.isFinite(stock) ? Math.max(0, Math.trunc(stock)) : 0
}

function sizeKey(value) {
  const raw = String(value || '').trim().toUpperCase().replace(/\s+/g, '')
  if (!raw) return 'UNSPECIFIED'
  const alias = [raw, ...raw.split(/[^A-Z0-9]+/)].find(part => aliases[part])
  return alias ? aliases[alias] : raw
}

function categoryLabel(product) {
  const label = product.categoryLabel || ''
  if (label && !/[\u3400-\u9fff]/.test(label)) return label
  return String(product.categoryKey || 'Category').replace(/[-_]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
}

// Both the screen and PDF use the same ordered, detached, public-only snapshot.
// Clip each real size before summing: a shortage must not offset another size.
export function inventorySnapshot(products = [], categories = []) {
  const columns = standardSizeColumns.map(({ key, label }) => ({ key, label }))
  const known = new Set(columns.map(column => column.key))
  const rows = sortInventoryProducts(products, categories).map(product => {
    const sizeStocks = Object.create(null)
    const sizes = Array.isArray(product.sizePrices) ? product.sizePrices : []
    for (const item of sizes) {
      const key = sizeKey(item.sizeCode)
      if (!known.has(key)) {
        known.add(key)
        columns.push({ key, label: key === 'UNSPECIFIED' ? 'Unspecified' : String(item.sizeCode).trim() })
      }
      sizeStocks[key] = (sizeStocks[key] || 0) + availableStock(item.stock)
    }
    const label = categoryLabel(product)
    return {
      id: product.id,
      slug: product.slug,
      name: product.name || product.productCode || product.sku || 'Untitled Product',
      colorSku: inventorySku(product) || '-',
      image: product.image || '',
      colorName: product.colorName || '',
      categoryKey: product.categoryKey || '',
      categoryLabel: label,
      sizeStocks,
      totalStock: sizes.length ? Object.values(sizeStocks).reduce((sum, stock) => sum + stock, 0) : availableStock(product.stock),
      searchText: [product.name, product.styleCode, product.colorGroup, product.productCode, product.sku, product.colorName, product.categoryKey, label].filter(Boolean).join(' ').normalize('NFKC').toLowerCase(),
    }
  })
  return { rows, columns, totalStock: rows.reduce((sum, row) => sum + row.totalStock, 0) }
}

export function inventorySearchTerms(value = '') {
  return [...new Set(String(value ?? '').normalize('NFKC').split(/[,，]/).map(term => term.trim().toLowerCase()).filter(Boolean))]
}

// OR across comma-separated search terms, AND with the selected category.
// Empty terms never act as wildcards. Filter before pagination for screen/PDF.
export function filterInventorySnapshot(snapshot, { keyword = '', categoryKey = '' } = {}) {
  const terms = inventorySearchTerms(keyword)
  const rows = snapshot.rows.filter(row =>
    (!categoryKey || row.categoryKey === categoryKey) &&
    (!terms.length || terms.some(term => row.searchText.includes(term))),
  )
  const defaults = new Set(standardSizeColumns.map(column => column.key))
  const columns = snapshot.columns.filter(column => defaults.has(column.key) || rows.some(row => Object.hasOwn(row.sizeStocks, column.key)))
  return {
    rows,
    columns,
    totalStock: rows.reduce((sum, row) => sum + row.totalStock, 0),
    scopeLabel: terms.length || categoryKey ? 'Filtered results' : 'All products',
    filterSummary: [categoryKey ? `Category: ${categoryKey}` : '', terms.length ? `Search: ${terms.join(', ')}` : ''].filter(Boolean).join(' | '),
  }
}
