import { defineStore } from 'pinia'

import { request } from '../api'
import {
  applyHomeImageOverrides,
  applyProductDetailImageOverrides,
  applyProductsImageOverrides,
} from '../imageOverrides'
import { useAuthStore } from './auth'


function normalizeCategoryLabel(item = {}) {
  const key = String(item?.key || item?.categoryKey || '').trim().toLowerCase()
  const labels = {
    womenswear: 'Womenswear',
    menswear: 'Menswear',
    pants: 'Pants',
    denim: 'Denim',
    outerwear: 'Outerwear',
    shirts: 'Shirts',
    tops: 'Tops',
    accessories: 'Accessories',
  }
  const fallback = key
    ? key.replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
    : 'Category'
  return {
    ...item,
    label: labels[key] || item?.label || fallback,
    categoryLabel: labels[key] || item?.categoryLabel || item?.label || fallback,
  }
}

function normalizeProductCategory(item = {}) {
  const normalized = normalizeCategoryLabel({
    key: item.categoryKey,
    categoryKey: item.categoryKey,
    label: item.categoryLabel,
    categoryLabel: item.categoryLabel,
  })
  return {
    ...item,
    categoryLabel: normalized.categoryLabel,
  }
}


export const useCatalogStore = defineStore('catalog', {
  state: () => ({
    banners: [],
    featured: [],
    homeSections: {
      bestSeller: [],
      newArrival: [],
      specialPrice: [],
    },
    collectionSections: {
      bestSeller: [],
      newArrival: [],
      specialPrice: [],
    },
    categories: [],
    homeCategories: [],
    stats: [],
    products: [],
    currentProduct: null,
    related: [],
    orders: [],
    ordersTotal: 0,
    ordersPage: 1,
    ordersLoading: false,
    ordersError: '',
    ordersRevision: 0,
    detailRevision: 0,
    productsRevision: 0,
    loading: false,
    detailLoading: false,
    orderSubmitting: false,
    orderSuccessMessage: '',
    error: '',
  }),
  actions: {
    primeHomeLoading() {
      this.loading = true
      this.error = ''
    },
    authHeaders() {
      const auth = useAuthStore()
      return auth.sessionId
        ? {

          }
        : {}
    },
    async loadCategories(lang = 'en') {
      const data = await request(`/api/catalog/categories?lang=${encodeURIComponent(lang)}`, {headers: this.authHeaders()})
      this.categories = (data.items || []).map(normalizeCategoryLabel)
    },
    async loadHome(lang) {
      this.loading = true
      this.error = ''
      try {
        const raw = await request(`/api/home?lang=${encodeURIComponent(lang)}`)
        const data = applyHomeImageOverrides(raw)
        this.banners = data.banners
        this.featured = data.featured || data.sections?.bestSeller || []
        this.homeSections = {
          bestSeller: (data.sections?.bestSeller || []).map((item) => normalizeProductCategory(item)),
          newArrival: (data.sections?.newArrival || []).map((item) => normalizeProductCategory(item)),
          specialPrice: (data.sections?.specialPrice || []).map((item) => normalizeProductCategory(item)),
        }
        // Home and collection requests can finish in either order. An omitted
        // collection must not erase products fetched by the collection endpoint.
        for (const key of ['bestSeller', 'newArrival', 'specialPrice']) {
          if (Array.isArray(data.collectionSections?.[key])) {
            this.collectionSections[key] = data.collectionSections[key].map((item) => normalizeProductCategory(item))
          }
        }
        this.homeCategories = (data.categories || []).map((item) => normalizeCategoryLabel(item))
        this.categories = (data.allCategories || data.categories || []).map((item) => normalizeCategoryLabel(item))
        this.stats = data.stats
      } catch (error) {
        this.error = error.message || 'Home load failed'
      } finally {
        this.loading = false
      }
    },
    async loadCollectionSection(sectionSlug, lang = 'zh') {
      this.loading = true
      this.error = ''
      try {
        const data = await request(
          `/api/collections/${encodeURIComponent(sectionSlug)}?lang=${encodeURIComponent(lang)}`,
          {
            headers: this.authHeaders(),
          }
        )
        this.collectionSections[data.sectionKey] = (data.items || []).map((item) => normalizeProductCategory(item))
      } catch (error) {
        this.error = error.message || 'Collection load failed'
      } finally {
        this.loading = false
      }
    },
    async loadProducts(filters = {}, lang = 'zh') {
      const revision = ++this.productsRevision
      const params = new URLSearchParams({ lang })
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value)
      })
      this.loading = true
      this.error = ''
      try {
        const raw = await request(`/api/products?${params.toString()}`, {
          headers: this.authHeaders(),
        })
        if (revision !== this.productsRevision) return
        const data = applyProductsImageOverrides(raw)
        this.products = (data.items || []).map((item) => normalizeProductCategory(item))
      } catch (error) {
        if (revision === this.productsRevision) this.error = error.message || 'Product load failed'
      } finally {
        if (revision === this.productsRevision) this.loading = false
      }
    },
    async loadProduct(slug, lang = 'zh') {
      const revision = ++this.detailRevision
      this.detailLoading = true
      this.error = ''
      try {
        const raw = await request(`/api/products/${slug}?lang=${encodeURIComponent(lang)}`, {
          headers: this.authHeaders(),
        })
        if (revision !== this.detailRevision) return
        const data = applyProductDetailImageOverrides(raw)
        this.currentProduct = normalizeProductCategory(data.product || {})
        this.related = (data.related || []).map((item) => normalizeProductCategory(item))
      } catch (error) {
        if (revision !== this.detailRevision) return
        this.currentProduct = null
        this.related = []
        this.error = error.message || 'Detail load failed'
      } finally {
        if (revision === this.detailRevision) this.detailLoading = false
      }
    },
    async createOrder(payload) {
      this.orderSubmitting = true
      this.error = ''
      this.orderSuccessMessage = ''
      try {
        const data = await request('/api/orders', {
          method: 'POST',
          headers: this.authHeaders(),
          body: JSON.stringify(payload),
        })
        this.orderSuccessMessage = data.message
        await this.loadMyOrders()
        return data.order
      } catch (error) {
        this.error = error.message || 'Order submit failed'
        return null
      } finally {
        this.orderSubmitting = false
      }
    },
    async uploadOrderAttachment(files) {
      this.error = ''
      const formData = new FormData()
      const list = Array.isArray(files) ? files : [files]
      list.forEach((file) => formData.append('files', file))
      try {
        return await request('/api/order-attachments', {
          method: 'POST',
          headers: this.authHeaders(),
          body: formData,
        })
      } catch (error) {
        this.error = error.message || 'Attachment upload failed'
        return null
      }
    },
    async loadMyOrders(filters = {}) {
      const auth = useAuthStore()
      const sessionId = auth.sessionId
      const revision = ++this.ordersRevision
      if (!sessionId) {
        this.orders = []
        this.ordersTotal = 0
        this.ordersLoading = false
        return false
      }
      this.ordersLoading = true
      this.ordersError = ''
      try {
        const params = new URLSearchParams({ page:1, pageSize:25, ...(typeof filters === 'string' ? { q: filters } : filters) })
        const data = await request(`/api/store/orders?${params}`, { headers: this.authHeaders() })
        if (revision !== this.ordersRevision || sessionId !== auth.sessionId) return false
        this.orders = data.items
        this.ordersTotal = data.total ?? data.items.length
        this.ordersPage = data.page || 1
        return true
      } catch (error) {
        if (revision === this.ordersRevision && sessionId === auth.sessionId) {
          this.ordersError = error.message || 'Order load failed'
        }
        return false
      } finally {
        if (revision === this.ordersRevision) this.ordersLoading = false
      }
    },
    async cancelOrder(orderId) {
      this.error = ''
      try {
        const data = await request(`/api/store/orders/${orderId}/cancel`, {
          method: 'POST',
          headers: this.authHeaders(),
        })
        this.orders = this.orders.map((item) => (item.id === data.order.id ? data.order : item))
        return data.order
      } catch (error) {
        this.error = error.message || 'Order cancel failed'
        return null
      }
    },
    resetOrderState() {
      this.ordersRevision++
      this.ordersLoading = false
      this.ordersTotal = 0
      this.ordersError = ''
      this.orders = []
      this.orderSubmitting = false
      this.orderSuccessMessage = ''
      this.error = ''
    },
    clearMessages() {
      this.error = ''
      this.orderSuccessMessage = ''
    },
  },
})
