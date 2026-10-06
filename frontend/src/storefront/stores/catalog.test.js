import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createPinia, setActivePinia } from 'pinia'
import { createServer } from 'vite'

test('home responses preserve concurrently loaded collection products and category ranks', async () => {
  const originalFetch = globalThis.fetch
  const originalStorage = globalThis.localStorage
  const server = await createServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true },
  })
  globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} }
  try {
    const { useCatalogStore } = await server.ssrLoadModule('/src/storefront/stores/catalog.js')
    setActivePinia(createPinia())
    const catalog = useCatalogStore()
    let finishHome
    const product = { id: 7, categoryKey: 'denim', categoryId: 2, categorySortOrder: 3 }
    const response = (value) => ({ ok: true, text: async () => JSON.stringify(value) })
    globalThis.fetch = async (url) => {
      if (url.includes('/api/home')) return new Promise((resolve) => { finishHome = resolve })
      if (url.includes('/api/collections/')) return response({ sectionKey: 'bestSeller', items: [product] })
      throw new Error('Unexpected test request: ' + url)
    }
    const pendingHome = catalog.loadHome('en')
    await catalog.loadCollectionSection('best-seller', 'en')
    assert.deepEqual(catalog.collectionSections.bestSeller.map((p) => p.id), [7])
    finishHome(response({ banners: [], sections: {}, categories: [], stats: [] }))
    await pendingHome
    assert.deepEqual(catalog.collectionSections.bestSeller.map((p) => p.id), [7])
    assert.equal(catalog.collectionSections.bestSeller[0].categorySortOrder, 3)
    assert.equal(catalog.error, '')

    // Explicitly supplied collection arrays still update or clear that section.
    const secondHome = catalog.loadHome('en')
    finishHome(response({ banners: [], sections: {}, categories: [], stats: [], collectionSections: { bestSeller: [] } }))
    await secondHome
    assert.deepEqual(catalog.collectionSections.bestSeller, [])
  } finally {
    globalThis.fetch = originalFetch
    globalThis.localStorage = originalStorage
    await server.close()
  }
})
