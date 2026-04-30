<template>
  <section class="account-page">
    <div class="container account-layout">
      <article class="panel-card account-profile-card">
        <p class="eyebrow">{{ copy.overline }}</p>
        <h1>{{ copy.title }}</h1>
        <p class="helper">{{ copy.subtitle }}</p>

        <div class="account-profile-grid">
          <div>
            <span>{{ copy.buyer }}</span>
            <strong>{{ auth.user?.name || '--' }}</strong>
          </div>
          <div>
            <span>{{ copy.company }}</span>
            <strong>{{ auth.user?.companyName || '--' }}</strong>
          </div>
          <div>
            <span>{{ copy.email }}</span>
            <strong>{{ auth.user?.email || '--' }}</strong>
          </div>
          <div>
            <span>{{ copy.status }}</span>
            <strong>{{ auth.user?.status || copy.active }}</strong>
          </div>
        </div>
      </article>

      <article class="panel-card account-shortcuts-card">
        <div class="account-shortcuts-head">
          <div>
            <p class="eyebrow">{{ copy.quickOverline }}</p>
            <h2>{{ copy.quickTitle }}</h2>
            <p class="helper">{{ copy.quickText }}</p>
          </div>
        </div>

        <div class="account-shortcuts-grid">
          <RouterLink class="account-shortcut-item" to="/orders">
            <strong>{{ copy.ordersTitle }}</strong>
            <span>{{ copy.ordersText }}</span>
          </RouterLink>

          <RouterLink class="account-shortcut-item" to="/shop">
            <strong>{{ copy.shopTitle }}</strong>
            <span>{{ copy.shopText }}</span>
          </RouterLink>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import { useAuthStore } from '../stores/auth'
import { useLocaleStore } from '../stores/locale'

const auth = useAuthStore()
const locale = useLocaleStore()

const copyByLocale = {
  zh: {
    overline: 'BUYER CENTER',
    title: '用户中心',
    subtitle: '查看当前商城账号资料，并从这里进入订单中心或继续选品。',
    buyer: '联系人',
    company: '公司',
    email: '邮箱',
    status: '状态',
    active: '正常',
    quickOverline: 'QUICK ACCESS',
    quickTitle: '快捷入口',
    quickText: '订单和账号资料现在已经分成两个独立页面。',
    ordersTitle: '订单中心',
    ordersText: '查看订单、筛选状态、取消未发货订单与查看详情。',
    shopTitle: '继续选品',
    shopText: '返回商城分类页，继续浏览商品并加入购物车。',
  },
  en: {
    overline: 'BUYER CENTER',
    title: 'User Center',
    subtitle: 'Review the current buyer account and jump into orders or product browsing.',
    buyer: 'Buyer',
    company: 'Company',
    email: 'Email',
    status: 'Status',
    active: 'Active',
    quickOverline: 'QUICK ACCESS',
    quickTitle: 'Quick Access',
    quickText: 'Account details and order management now live on separate pages.',
    ordersTitle: 'Order Center',
    ordersText: 'View orders, filter by status, cancel pending orders and inspect details.',
    shopTitle: 'Continue Shopping',
    shopText: 'Go back to the storefront and keep browsing products.',
  },
  fr: {
    overline: 'BUYER CENTER',
    title: 'Centre utilisateur',
    subtitle: 'Consultez le compte acheteur et accedez ensuite aux commandes ou au catalogue.',
    buyer: 'Acheteur',
    company: 'Societe',
    email: 'E-mail',
    status: 'Statut',
    active: 'Actif',
    quickOverline: 'QUICK ACCESS',
    quickTitle: 'Acces rapide',
    quickText: 'Les informations du compte et les commandes sont maintenant sur deux pages separees.',
    ordersTitle: 'Centre de commandes',
    ordersText: 'Consultez les commandes, filtrez par statut et ouvrez le detail.',
    shopTitle: 'Continuer les achats',
    shopText: 'Retournez au catalogue et continuez a parcourir les produits.',
  },
}

const copy = computed(() => copyByLocale[locale.current] || copyByLocale.en)
</script>
