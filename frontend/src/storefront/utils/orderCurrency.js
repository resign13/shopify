export function formatOrderCurrency(value, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: currency === 'CNY' ? 'CNY' : 'USD',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(Number(value || 0));
}
