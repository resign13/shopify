import { createRouter, createWebHistory } from 'vue-router'

import LoginView from './views/LoginView.vue'
import AccountView from './views/AccountView.vue'
import OrdersCenterView from './views/OrdersCenterView.vue'
import CheckoutView from './views/CheckoutView.vue'
import ProductDetailView from './views/ProductDetailView.vue'
import ShopView from './views/ShopView.vue'
import InventoryView from './views/InventoryView.vue'
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
