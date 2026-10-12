// Clip each real size before summing: one size's shortage cannot cancel stock
// available in another size. Procurement stages are never sellable inventory.
export function catalogStock(variant) {
  const available = value => {
    const number = Number(value)
    return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0
  }
  if (Array.isArray(variant?.sizePrices) && variant.sizePrices.length)
    return variant.sizePrices.reduce((sum, size) => sum + available(size.stock), 0)
  return available(variant?.stock)
}

export function catalogSummary(group) {
  const summary = String(group?.summary || '').trim()
  const normalize = value => String(value || '').normalize('NFKC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('en')
  return normalize(summary) === normalize(group?.name) ? '' : summary
}
