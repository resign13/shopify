import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createPinia } from 'pinia'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'

test('inventory renders category then natural SKU order before pagination, preserving available stock', async () => {
  const originalStorage = globalThis.localStorage
  const server = await createServer({
    configFile: false,
    plugins: [vue()],
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true },
  })
  globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} }
  try {
    const { default: InventoryView } = await server.ssrLoadModule('/src/storefront/views/InventoryView.vue')
    const { useCatalogStore } = await server.ssrLoadModule('/src/storefront/stores/catalog.js')
    const pinia = createPinia()
    const catalog = useCatalogStore(pinia)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/inventory', component: InventoryView },
        { path: '/product/:slug', component: { render: () => null } },
      ],
    })
    await router.push('/inventory')
    const renderInventory = () => renderToString(createSSRApp(InventoryView).use(pinia).use(router))
    const product = (category, index) => ({
      id: `${category}-${index}`,
      slug: `${category}-${index}`,
      productCode: `${category}-${index}`,
      name: `${category} product ${index}`,
      categoryKey: category,
      categoryLabel: category,
      // Legacy payload: no categoryId/categorySortOrder, and net balance is zero.
      stock: 0,
      sizePrices: [{ sizeCode: 'S', stock: 10 }, { sizeCode: 'M', stock: -10 }],
    })
    const shirts = Array.from({ length: 7 }, (_, i) => product('shirt', i + 1))
    const tracksuits = Array.from({ length: 21 }, (_, i) => product('tracksuit', i + 1))
    catalog.categories = [{ key: 'tracksuit', label: 'Tracksuit' }, { key: 'shirt', label: 'Shirt' }]
    // Both categories and SKUs arrive unsorted. Natural order must place 2 before
    // 10 and sorting must happen before selecting the first 20 records.
    const unsortedProducts = [...shirts].reverse().concat([...tracksuits].reverse())
    catalog.products = unsortedProducts
    const skus = (html) => [...html.matchAll(/<td[^>]*class="inventory-sku"[^>]*>([^<]*)<\/td>/g)].map((m) => m[1])
    const html = await renderInventory()
    assert.deepEqual(skus(html), tracksuits.slice(0, 20).map((p) => p.productCode))
    assert.equal([...html.matchAll(/class="inventory-total"[^>]*>10<\/td>/g)].length, 20)
    assert.match(html, /<strong[^>]*>280<\/strong>/)
    assert.doesNotMatch(html, />-10</)

    // Editing category order must update the rows rather than retain API order.
    catalog.categories = [...catalog.categories].reverse()
    assert.deepEqual(
      skus(await renderInventory()),
      [...shirts, ...tracksuits].slice(0, 20).map((p) => p.productCode),
    )
    assert.deepEqual(catalog.products.map((p) => p.productCode), unsortedProducts.map((p) => p.productCode))

    // Screenshot regression: colors from one SKU must stay together, instead of
    // ZM codes interrupting the CS3102 / CS3103 groups.
    catalog.products = ['ZM4760', 'CS3102-黑', 'CS3103-浅卡', 'CS3102-灰', 'ZM4762']
      .map((sku, index) => ({ ...product('shirt', index), productCode: sku }))
    assert.deepEqual(skus(await renderInventory()), [
      'CS3102-灰', 'CS3102-黑', 'CS3103-浅卡', 'ZM4760', 'ZM4762',
    ])
  } finally {
    globalThis.localStorage = originalStorage
    await server.close()
  }
})
