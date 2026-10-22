import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createPinia, setActivePinia } from 'pinia'
import { createServer } from 'vite'

test('order and product races keep latest results; network failure preserves orders', async () => {
  const oldFetch=globalThis.fetch, oldStorage=globalThis.localStorage
  const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true}})
  globalThis.localStorage={getItem:()=>null,setItem(){},removeItem(){}}
  try {
    const {useCatalogStore}=await server.ssrLoadModule('/src/storefront/stores/catalog.js')
    const {useAuthStore}=await server.ssrLoadModule('/src/storefront/stores/auth.js')
    setActivePinia(createPinia())
    const catalog=useCatalogStore(), auth=useAuthStore()
    auth.sessionId='test-session'
    const pending=[]
    const response=(data)=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}})
    globalThis.fetch=()=>new Promise(resolve=>pending.push(resolve))
    const a=catalog.loadMyOrders({page:1}), b=catalog.loadMyOrders({page:2})
    pending[1](response({items:[{id:2}],total:26,page:2}));await b
    pending[0](response({items:[{id:1}],total:26,page:1}));await a
    assert.deepEqual(catalog.orders.map(row=>row.id),[2])
    assert.equal(catalog.ordersPage,2)
    globalThis.fetch=async()=>{throw new Error('offline')}
    assert.equal(await catalog.loadMyOrders(),false)
    assert.deepEqual(catalog.orders.map(row=>row.id),[2])
    assert.ok(catalog.ordersError)
    assert.equal(catalog.ordersLoading,false)
    pending.length=0
    globalThis.fetch=()=>new Promise(resolve=>pending.push(resolve))
    const first=catalog.loadProduct('first'),last=catalog.loadProduct('last')
    pending[1](response({product:{id:2},related:[]}));await last
    pending[0](response({product:{id:1},related:[]}));await first
    assert.equal(catalog.currentProduct.id,2)
    const changing=catalog.loadMyOrders()
    auth.sessionId='another-session';catalog.resetOrderState()
    pending[2](response({items:[{id:3}],total:1,page:1}));await changing
    assert.deepEqual(catalog.orders,[])
  } finally {
    globalThis.fetch=oldFetch;globalThis.localStorage=oldStorage
    await server.close()
  }
})

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
    const response = (value) => new Response(JSON.stringify(value), {headers:{'Content-Type':'application/json'}})
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
