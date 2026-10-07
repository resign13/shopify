function availableStock(value) {
  const stock = Number(value)
  return Number.isFinite(stock) ? Math.max(0, Math.trunc(stock)) : 0
}

export function normalizeSizeQuantity(value, stock) {
  const quantity = Number(value)
  return Number.isFinite(quantity) ? Math.max(0, Math.min(Math.trunc(quantity), availableStock(stock))) : 0
}

export function productSizeRows(product) {
  if (!product) return []
  const prices = Array.isArray(product.sizePrices) ? product.sizePrices : []
  const configured = Array.isArray(product.sizes) ? product.sizes : []
  const sizes = [...new Set([...configured, ...prices.map(item => item.sizeCode)].filter(size => typeof size === 'string'))]
  if (!sizes.length) sizes.push('')
  return sizes.map(sizeCode => {
    const record = prices.find(item => item.sizeCode === sizeCode)
    return {
      sizeCode,
      price: Number(record?.price ?? product.price ?? 0),
      // Sized stock must come from the actual size, never from the parent net balance.
      stock: availableStock(record?.stock ?? (prices.length ? 0 : product.stock ?? 0)),
    }
  })
}

export function selectedSizeLines(rows, quantities) {
  return rows.map(row => ({ ...row, quantity: normalizeSizeQuantity(quantities[row.sizeCode], row.stock) }))
    .filter(row => row.quantity > 0)
}

export function addSizeLinesToCart(cart, product, lines, replace = false) {
  if (!product || !lines.length) return
  if (replace) cart.clear()
  for (const row of lines) {
    cart.addItem({ ...product, basePrice: row.price, stock: row.stock }, row.quantity, row.sizeCode)
  }
}
