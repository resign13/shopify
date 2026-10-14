<template>
  <div class="app-shell">
    <SiteHeader />
    <main class="page-shell">
      <RouterView :key="auth.user?.id" />
    </main>
    <SiteFooter v-if="!isLoginRoute" />
  </div>
</template>

<script setup>
import { computed, watch, watchEffect } from 'vue'
import { RouterView, useRoute } from 'vue-router'

import SiteFooter from './components/SiteFooter.vue'
import SiteHeader from './components/SiteHeader.vue'
import { useLocaleStore } from './stores/locale'

import { useAuthStore } from './stores/auth'
import { useCartStore } from './stores/cart'
import { useCatalogStore } from './stores/catalog'
const auth = useAuthStore()
const cart = useCartStore()
const catalog = useCatalogStore()
watch(() => auth.user?.id, (id, previous) => {
  if (id !== previous) catalog.$reset()
  cart.attachAccount(id)
}, {immediate:true,flush:'sync'})
const locale = useLocaleStore()
const route = useRoute()
const isLoginRoute = computed(() => route.path === '/' || route.path === '/login')

watchEffect(() => {
  document.documentElement.lang = locale.current
})
</script>
