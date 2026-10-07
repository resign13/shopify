<template>
  <footer class="site-footer">
    <div class="site-footer-dark">
      <div class="container storefront-footer-main">
        <RouterLink class="footer-brand-wordmark" :to="defaultStorefrontPath">{{ locale.t('brand.name') }}</RouterLink>
        <nav aria-label="Footer navigation" class="storefront-footer-links">
          <RouterLink v-for="item in storefrontNavigation" :key="item.to" :to="item.to">{{ item.label }}</RouterLink>
        </nav>
      </div>

      <div class="container footer-bottom-bar">
        <p>© {{ new Date().getFullYear() }} GINGTTO</p>
        <div class="footer-payment-badges">
          <span>Visa</span>
          <span>Mastercard</span>
          <span>Amex</span>
          <span>Apple Pay</span>
          <span>PayPal</span>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { RouterLink } from 'vue-router'

import { useLocaleStore } from '../stores/locale'
import { defaultStorefrontPath, storefrontNavigation } from '../utils/navigation'

const locale = useLocaleStore()
</script>

<style scoped>
.storefront-footer-main { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 24px; }
.storefront-footer-links { display: flex; gap: 28px; flex-wrap: wrap; }
</style>
