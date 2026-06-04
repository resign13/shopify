import { defineStore } from 'pinia'

const STORAGE_KEY = 'gingtto-cart'

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

function resolveUnitPrice(item, quantity = 1) {
  const basePrice = Number(item.basePrice ?? item.price ?? 0)
  const tiers = Array.isArray(item.priceTiers) ? item.priceTiers : []
  let resolved = basePrice

  for (const tier of tiers) {
    const minQty = Number(tier.minQty ?? tier.min_qty ?? 0)
    const maxRaw = tier.maxQty ?? tier.max_qty ?? null
    const maxQty = maxRaw == null || maxRaw === '' ? null : Number(maxRaw)
    if (quantity < minQty || (maxQty != null && quantity > maxQty)) continue
    const fixedPrice = Number(tier.price ?? tier.tierPrice ?? tier.tier_price ?? 0)
    if (fixedPrice > 0) {
      resolved = fixedPrice
    } else {
      const discount = tier.discountPercent ?? tier.discount_percent
      if (discount != null && discount !== '') {
        resolved = Number((basePrice * (1 - Number(discount) / 100)).toFixed(2))
      }
    }
  }

  return resolved
}

function makeLineKey(item) {
  return `${item.id}:${item.sizeCode || ''}`
}

function hydrateItem(item) {
  const quantity = Math.max(1, Number(item.quantity || 1))
  const basePrice = Number(item.basePrice ?? item.price ?? 0)
  const priceTiers = Array.isArray(item.priceTiers) ? item.priceTiers : []
  const unitPrice = resolveUnitPrice({ basePrice, priceTiers }, quantity)
  const lineTotal = Number((unitPrice * quantity).toFixed(2))

  return {
    ...item,
    quantity,
    basePrice,
    priceTiers,
    price: unitPrice,
    formattedPrice: formatCurrency(unitPrice),
    unitPrice,
    formattedUnitPrice: formatCurrency(unitPrice),
    lineTotal,
    formattedLineTotal: formatCurrency(lineTotal),
    lineKey: item.lineKey || makeLineKey(item),
  }
}

function readInitialState() {
  try {
    const items = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(items) ? items.map(hydrateItem) : []
  } catch {
    return []
  }
}

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: readInitialState(),
  }),
  getters: {
    itemCount: (state) => state.items.reduce((total, item) => total + item.quantity, 0),
    subtotal: (state) =>
      state.items.reduce((total, item) => total + Number((Number(item.unitPrice ?? item.price ?? 0) * item.quantity).toFixed(2)), 0),
  },
  actions: {
    persist() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items))
    },
    syncItemPricing(item) {
      return hydrateItem(item)
    },
    addItem(product, quantity = 1, sizeCode = '') {
      const availableStock = Math.max(0, Number(product.stock ?? 0))
      if (availableStock <= 0) return

      const lineKey = `${product.id}:${sizeCode || ''}`
      const existing = this.items.find((item) => item.lineKey === lineKey)
      const basePayload = {
        id: product.id,
        slug: product.slug,
        name: product.name,
        image: product.image,
        sku: product.sku,
        stock: availableStock,
        sizeCode,
        sizeLabel: sizeCode,
        quantity: Math.min(quantity, availableStock),
        basePrice: product.basePrice ?? product.price,
        priceTiers: product.priceTiers || [],
        colorName: product.colorName || '',
        colorHex: product.colorHex || '',
      }

      if (existing) {
        const nextQuantity = Math.min(existing.quantity + quantity, availableStock)
        Object.assign(
          existing,
          this.syncItemPricing({
            ...existing,
            ...basePayload,
            quantity: nextQuantity,
          })
        )
      } else {
        this.items.push(
          this.syncItemPricing({
            ...basePayload,
            lineKey,
          })
        )
      }
      this.persist()
    },
    setSingleItem(product, quantity = 1, sizeCode = '') {
      this.items = []
      this.addItem(product, quantity, sizeCode)
    },
    updateQuantity(lineKey, quantity) {
      const item = this.items.find((entry) => entry.lineKey === lineKey)
      if (!item) return
      Object.assign(
        item,
        this.syncItemPricing({
          ...item,
          quantity: Math.max(1, Math.min(quantity, item.stock)),
        })
      )
      this.persist()
    },
    removeItem(lineKey) {
      this.items = this.items.filter((item) => item.lineKey !== lineKey)
      this.persist()
    },
    clear() {
      this.items = []
      this.persist()
    },
  },
})
