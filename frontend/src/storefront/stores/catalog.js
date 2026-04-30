import { defineStore } from 'pinia'

import { request } from '../api'
import {
  applyHomeImageOverrides,
  applyProductDetailImageOverrides,
  applyProductsImageOverrides,
} from '../imageOverrides'
import { useAuthStore } from './auth'

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
    stats: [],
    products: [],
    currentProduct: null,
    related: [],
    orders: [],
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
      return auth.token
        ? {
            Authorization: `Bearer ${auth.token}`,
          }
        : {}
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
          bestSeller: data.sections?.bestSeller || [],
          newArrival: data.sections?.newArrival || [],
          specialPrice: data.sections?.specialPrice || [],
        }
        this.collectionSections = {
          bestSeller: data.collectionSections?.bestSeller || [],
          newArrival: data.collectionSections?.newArrival || [],
          specialPrice: data.collectionSections?.specialPrice || [],
        }
        this.categories = data.categories
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
        this.collectionSections[data.sectionKey] = data.items || []
      } catch (error) {
        this.error = error.message || 'Collection load failed'
      } finally {
        this.loading = false
      }
    },
    async loadProducts(filters = {}, lang = 'zh') {
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
        const data = applyProductsImageOverrides(raw)
        this.products = data.items
      } catch (error) {
        this.error = error.message || 'Product load failed'
      } finally {
        this.loading = false
      }
    },
    async loadProduct(slug, lang = 'zh') {
      this.detailLoading = true
      this.error = ''
      try {
        const raw = await request(`/api/products/${slug}?lang=${encodeURIComponent(lang)}`, {
          headers: this.authHeaders(),
        })
        const data = applyProductDetailImageOverrides(raw)
        this.currentProduct = data.product
        this.related = data.related
      } catch (error) {
        this.currentProduct = null
        this.related = []
        this.error = error.message || 'Detail load failed'
      } finally {
        this.detailLoading = false
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
    async loadMyOrders(query = '') {
      const auth = useAuthStore()
      if (!auth.token) {
        this.orders = []
        return
      }
      try {
        const suffix = query ? `?q=${encodeURIComponent(query)}` : ''
        const data = await request(`/api/store/orders${suffix}`, {
          headers: this.authHeaders(),
        })
        this.orders = data.items
      } catch (error) {
        this.orders = []
        this.error = error.message || 'Order load failed'
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
