import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia } from 'pinia'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { defaultStorefrontPath, storefrontNavigation, storefrontRoutes, storefrontAuthRedirect } from './navigation.js'

const placeholder = { render: () => null }
const views = Object.fromEntries(['LoginView', 'ShopView', 'InventoryView', 'ProductDetailView', 'CheckoutView', 'AccountView', 'OrdersCenterView'].map(name => [name, placeholder]))
function makeRouter(authenticated) {
  const router = createRouter({ history: createMemoryHistory(), routes: storefrontRoutes(views) })
  router.beforeEach(to => storefrontAuthRedirect(to, authenticated))
  return router
}

test('inventory is the default; removed pages and old anchors do not render or leave broken links', async () => {
  assert.deepEqual(storefrontNavigation.map(item => item.to), ['/shop', '/inventory'])
  assert.equal(defaultStorefrontPath, '/inventory')
  const router = makeRouter(true)
  for (const path of ['/', '/login', '/home', '/home#about', '/home#contact', '/collections/best-seller', '/collections/new-arrival', '/collections/special-price', '/pages/about-us', '/pages/contact', '/pages/privacy-policy', '/unknown?old=1#old']) {
    await router.push(path)
    assert.equal(router.currentRoute.value.fullPath, '/inventory', path)
  }
})

test('guest access stays protected; shopping, cart, account and order utilities remain available', async () => {
  const guest = makeRouter(false)
  for (const path of ['/', '/home', '/shop', '/inventory', '/product/example', '/checkout', '/account', '/orders', '/pages/contact']) {
    await guest.push(path)
    assert.equal(guest.currentRoute.value.path, '/login', path)
  }
  const member = makeRouter(true)
  for (const path of ['/shop?category=denim', '/inventory', '/product/example', '/checkout', '/account', '/orders']) {
    await member.push(path)
    assert.equal(member.currentRoute.value.fullPath, path)
  }
  await member.push('/order')
  assert.equal(member.currentRoute.value.path, '/orders')
})

test('header/footer expose only shop and inventory display pages, preserving category and cart links', async () => {
  const originalStorage = globalThis.localStorage
  const server = await createServer({ configFile: false, plugins: [vue()], optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, ws: false } })
  globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} }
  try {
    const { default: SiteHeader } = await server.ssrLoadModule('/src/storefront/components/SiteHeader.vue')
    const { default: SiteFooter } = await server.ssrLoadModule('/src/storefront/components/SiteFooter.vue')
    const { useAuthStore } = await server.ssrLoadModule('/src/storefront/stores/auth.js')
    const { useCatalogStore } = await server.ssrLoadModule('/src/storefront/stores/catalog.js')
    const pinia = createPinia()
    const auth = useAuthStore(pinia)
    auth.token = 'test-token'; auth.user = { id: 1 }
    useCatalogStore(pinia).categories = [{ key: 'denim', label: 'Denim' }]
    const router = makeRouter(true)
    await router.push('/inventory')
    const render = component => renderToString(createSSRApp(component).use(pinia).use(router))
    const header = await render(SiteHeader)
    const footer = await render(SiteFooter)
    for (const html of [header, footer]) {
      assert.match(html, /href="\/shop"/)
      assert.match(html, /href="\/inventory"/)
      assert.doesNotMatch(html, /href="\/(?:home|pages|collections)/)
      assert.doesNotMatch(html, /BEST SELLER|NEW ARRIVAL|PRE-ORDER|ABOUT|CONTACT|Privacy Policy|Terms of Service/)
    }
    assert.match(header, /href="\/shop\?category=denim"/)
    for (const path of ['/checkout', '/account', '/orders']) assert.ok(header.includes(`href="${path}"`))
    auth.token = ''; auth.user = null
    const guestHeader = await render(SiteHeader)
    assert.match(guestHeader, /href="\/login"/)
    assert.doesNotMatch(guestHeader, /class="nav-links"/)
  } finally {
    globalThis.localStorage = originalStorage
    await server.close()
  }
})
