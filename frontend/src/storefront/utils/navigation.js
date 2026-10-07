export const defaultStorefrontPath = '/inventory'

export const storefrontNavigation = [
  { label: 'SHOP', to: '/shop' },
  { label: 'INVENTORY', to: '/inventory' },
]

export function storefrontRoutes(views) {
  return [
    { path: '/', redirect: { path: defaultStorefrontPath, query: {}, hash: '' } },
    { path: '/login', component: views.LoginView, meta: { guestOnly: true } },
    { path: '/shop', component: views.ShopView, meta: { requiresAuth: true } },
    { path: '/inventory', component: views.InventoryView, meta: { requiresAuth: true } },
    { path: '/product/:slug', component: views.ProductDetailView, meta: { requiresAuth: true } },
    { path: '/checkout', component: views.CheckoutView, meta: { requiresAuth: true } },
    { path: '/account', component: views.AccountView, meta: { requiresAuth: true } },
    { path: '/orders', component: views.OrdersCenterView, meta: { requiresAuth: true } },
    { path: '/order', redirect: '/orders' },
    // Removed display pages and old bookmarks now open inventory, not a dead page.
    { path: '/:pathMatch(.*)*', redirect: { path: defaultStorefrontPath, query: {}, hash: '' } },
  ]
}

export function storefrontAuthRedirect(to, isAuthenticated) {
  if (to.meta.requiresAuth && !isAuthenticated) {
    return { path: '/login', query: { redirect: '1' } }
  }
  if (to.meta.guestOnly && isAuthenticated) return defaultStorefrontPath
  return true
}
