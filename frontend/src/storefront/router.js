import { createRouter, createWebHistory } from 'vue-router'

const LoginView = () => import('./views/LoginView.vue')
const AccountView = () => import('./views/AccountView.vue')
const OrdersCenterView = () => import('./views/OrdersCenterView.vue')
const CheckoutView = () => import('./views/CheckoutView.vue')
const ProductDetailView = () => import('./views/ProductDetailView.vue')
const ShopView = () => import('./views/ShopView.vue')
const InventoryView = () => import('./views/InventoryView.vue')
import { storefrontRoutes, storefrontAuthRedirect } from './utils/navigation'
import { pinia } from './stores'
import { useAuthStore } from './stores/auth'

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }

    if (to.hash) {
      return {
        el: to.hash,
        top: 104,
        behavior: 'smooth',
      }
    }

    return { top: 0, behavior: 'smooth' }
  },
  routes: storefrontRoutes({ LoginView, ShopView, InventoryView, ProductDetailView, CheckoutView, AccountView, OrdersCenterView }),
})

router.beforeEach(async (to) => {
  const auth = useAuthStore(pinia)
  if (!auth.initialized) {
    await auth.initialize()
  }

  return storefrontAuthRedirect(to, auth.isAuthenticated)
})

export default router
