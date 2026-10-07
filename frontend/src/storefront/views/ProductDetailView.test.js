import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createPinia } from 'pinia'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { productSizeRows, selectedSizeLines, addSizeLinesToCart } from '../utils/sizeOrder.js'

test('multi-size cart additions keep existing lines, merge by actual SKU/size and respect stock and price', async () => {
  const originalStorage = globalThis.localStorage
  const stored = new Map()
  globalThis.localStorage = { getItem: key => stored.get(key) || null, setItem: (key, value) => stored.set(key, value), removeItem: key => stored.delete(key) }
  const server = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, ws: false } })
  try {
    const { useCartStore } = await server.ssrLoadModule('/src/storefront/stores/cart.js')
    const cart = useCartStore(createPinia())
    const product = { id: 1, slug: 'black', sku: 'CS2209-黑', stock: -10, price: 17, sizePrices: [
      { sizeCode: 'S', stock: 5, price: 17 }, { sizeCode: 'M', stock: 3, price: 19 }, { sizeCode: 'L', stock: 0, price: 21 },
    ] }
    cart.addItem({ id: 90, stock: 1, price: 50 }, 1)
    const lines = selectedSizeLines(productSizeRows(product), { S: 2, M: 1, L: 1 })
    addSizeLinesToCart(cart, product, lines)
    assert.equal(cart.items.length, 3)
    assert.equal(cart.itemCount, 4)
    assert.equal(cart.subtotal, 103)
    addSizeLinesToCart(cart, product, lines)
    addSizeLinesToCart(cart, product, lines)
    assert.equal(cart.items.find(item => item.lineKey === '1:S').quantity, 5)
    assert.equal(cart.items.find(item => item.lineKey === '1:M').quantity, 3)
    assert.equal(cart.items.some(item => item.sizeCode === 'L'), false)
    assert.equal(cart.subtotal, 192)
    assert.equal(useCartStore(createPinia()).itemCount, 9)
    const brown = { ...product, id: 2, sku: 'CS2209-棕' }
    addSizeLinesToCart(cart, brown, lines, true)
    assert.equal(cart.items.length, 2)
    assert.equal(cart.items.every(item => item.id === 2 && item.sku === 'CS2209-棕'), true)
    assert.equal(cart.itemCount, 3)
    assert.equal(cart.subtotal, 53)
    addSizeLinesToCart(cart, product, [], true)
    assert.equal(cart.itemCount, 3)
  } finally {
    globalThis.localStorage = originalStorage
    await server.close()
  }
})

test('detail renders one quantity input per size with stock labels and unavailable sizes disabled', async () => {
  const originalStorage = globalThis.localStorage
  globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} }
  const server = await createServer({ configFile: false, plugins: [vue()], optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, ws: false } })
  try {
    const { default: ProductDetailView } = await server.ssrLoadModule('/src/storefront/views/ProductDetailView.vue')
    const { useCatalogStore } = await server.ssrLoadModule('/src/storefront/stores/catalog.js')
    const pinia = createPinia()
    useCatalogStore(pinia).currentProduct = {
      id: 1, slug: 'black', name: 'Shirt', image: '', stock: -5, price: 23,
      sizePrices: [{ sizeCode: 'S', stock: 21, price: 23 }, { sizeCode: 'M', stock: 37, price: 25 }, { sizeCode: 'L', stock: 0 }, { sizeCode: 'XL', stock: -5 }, { sizeCode: 'XXL', stock: 15 }],
    }
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/product/:slug', component: ProductDetailView }, { path: '/checkout', component: { render: () => null } }] })
    await router.push('/product/black')
    const html = await renderToString(createSSRApp(ProductDetailView).use(pinia).use(router))
    assert.equal((html.match(/class="detail-size-stepper"/g) || []).length, 5)
    assert.match(html, /aria-label="Quantity S"/)
    assert.match(html, /21 in stock/)
    assert.match(html, /37 in stock/)
    assert.doesNotMatch(html, /-5 in stock/)
    assert.match(html, /disabled[^>]*aria-label="Quantity L"/)
    assert.match(html, /disabled[^>]*aria-label="Quantity XL"/)
    assert.match(html, /ADD TO CART/)
    assert.match(html, /0 pcs · 0 sizes selected/)
    assert.doesNotMatch(html, /class="detail-size-button"/)
  } finally {
    globalThis.localStorage = originalStorage
    await server.close()
  }
})
