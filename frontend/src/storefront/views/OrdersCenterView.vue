<template>
  <section class="account-page">
    <div class="container account-layout">
      <article class="panel-card">
        <div class="account-orders-head">
          <div>
            <p class="eyebrow">{{ copy.overline }}</p>
            <h1>{{ copy.title }}</h1>
            <p class="helper">{{ copy.subtitle }}</p>
          </div>
        </div>

        <div class="account-toolbar">
          <select v-model="selectedTimeRange" class="field checkout-select account-filter-select">
            <option value="all">{{ copy.filters.time.all }}</option>
            <option value="7d">{{ copy.filters.time.days7 }}</option>
            <option value="30d">{{ copy.filters.time.days30 }}</option>
            <option value="90d">{{ copy.filters.time.days90 }}</option>
            <option value="year">{{ copy.filters.time.thisYear }}</option>
          </select>

          <select v-model="selectedStatus" class="field checkout-select account-filter-select">
            <option value="all">{{ copy.filters.status.all }}</option>
            <option v-for="item in statusOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </div>

        <p v-if="catalog.error" class="error-text">{{ catalog.error }}</p>

        <div v-if="filteredOrders.length" class="account-order-list">
          <article v-for="order in filteredOrders" :key="order.id" class="account-order-item">
            <div class="account-order-main">
              <div>
                <strong>{{ order.orderNo }}</strong>
                <p>{{ summarizeItems(order.items) }}</p>
              </div>
              <span class="account-order-status" :class="`status-${order.status}`">
                {{ formatStatus(order.status) }}
              </span>
            </div>

            <div class="account-order-meta">
              <span>{{ formatDate(order.createdAt) }}</span>
              <span>{{ copy.itemCountLabel }} {{ order.itemCount }}</span>
              <span>{{ formatCurrency(order.totalAmount) }}</span>
            </div>

            <div class="account-order-extra">
              <span>{{ order.contactName || '--' }}</span>
              <span>{{ order.phone || '--' }}</span>
              <span>{{ order.trackingNo || copy.trackingEmpty }}</span>
            </div>

            <p class="helper">{{ order.shippingAddress }}</p>

            <div class="account-order-actions">
              <button class="secondary-button inline-button" type="button" @click="toggleExpanded(order.id)">
                {{ expandedOrderIds.has(order.id) ? copy.hideDetails : copy.viewDetails }}
              </button>
              <button
                v-if="order.canCancel"
                class="text-button account-cancel-button"
                type="button"
                :disabled="cancellingOrderId === order.id"
                @click="handleCancel(order.id)"
              >
                {{ cancellingOrderId === order.id ? locale.t('common.loading') : copy.cancelOrder }}
              </button>
            </div>

            <div v-if="expandedOrderIds.has(order.id)" class="account-order-detail">
              <div class="account-detail-grid">
                <div>
                  <span>{{ copy.contactLabel }}</span>
                  <strong>{{ order.contactValue || '--' }}</strong>
                </div>
                <div>
                  <span>{{ copy.phoneLabel }}</span>
                  <strong>{{ order.phone || '--' }}</strong>
                </div>
                <div>
                  <span>{{ copy.countryLabel }}</span>
                  <strong>{{ order.country || '--' }}</strong>
                </div>
                <div>
                  <span>{{ copy.marketingLabel }}</span>
                  <strong>{{ order.marketingOptIn ? copy.yes : copy.no }}</strong>
                </div>
                <div>
                  <span>{{ copy.trackingLabel }}</span>
                  <strong>{{ order.trackingNo || copy.trackingEmpty }}</strong>
                </div>
                <div>
                  <span>{{ copy.shippedAtLabel }}</span>
                  <strong>{{ formatDateTime(order.shippedAt) }}</strong>
                </div>
                <div>
                  <span>{{ copy.completedAtLabel }}</span>
                  <strong>{{ formatDateTime(order.completedAt) }}</strong>
                </div>
                <div>
                  <span>{{ copy.addressLabel }}</span>
                  <strong>{{ order.address || '--' }}</strong>
                </div>
                <div>
                  <span>{{ copy.apartmentLabel }}</span>
                  <strong>{{ order.apartment || '--' }}</strong>
                </div>
                <div>
                  <span>{{ copy.cityLabel }}</span>
                  <strong>{{ order.city || '--' }}</strong>
                </div>
                <div>
                  <span>{{ copy.stateLabel }}</span>
                  <strong>{{ order.state || '--' }}</strong>
                </div>
                <div>
                  <span>{{ copy.zipLabel }}</span>
                  <strong>{{ order.zip || '--' }}</strong>
                </div>
              </div>

              <div class="account-order-items">
                <div class="account-order-items-head">
                  <strong>{{ copy.itemsTitle }}</strong>
                </div>

                <article
                  v-for="item in order.items"
                  :key="`${order.id}-${item.productId}-${item.sku}-${item.sizeCode}`"
                  class="account-order-line"
                >
                  <img v-if="item.image" :src="item.image" :alt="item.productName" class="account-order-line-image" />
                  <div class="account-order-line-copy">
                    <strong>{{ item.productName }}</strong>
                    <span>SKU {{ item.sku }}</span>
                    <span v-if="item.sizeCode">{{ copy.sizeLabel }} {{ item.sizeCode }}</span>
                  </div>
                  <div class="account-order-line-meta">
                    <span>{{ copy.quantityLabel }} {{ item.quantity }}</span>
                    <strong>{{ formatCurrency(item.totalPrice) }}</strong>
                  </div>
                </article>
              </div>
            </div>
          </article>
        </div>

        <div v-else class="panel-card empty-state-card">
          <h3>{{ isFiltering ? copy.filterEmptyTitle : locale.t('common.ordersEmpty') }}</h3>
          <p class="helper">{{ isFiltering ? copy.filterEmptyText : copy.ordersEmptyText }}</p>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'

import { useCatalogStore } from '../stores/catalog'
import { useLocaleStore } from '../stores/locale'

const catalog = useCatalogStore()
const locale = useLocaleStore()

const expandedOrderIds = ref(new Set())
const cancellingOrderId = ref(0)
const selectedTimeRange = ref('all')
const selectedStatus = ref('all')

const copyByLocale = {
  zh: {
    overline: 'ORDER CENTER',
    title: '订单中心',
    subtitle: '按时间和状态筛选订单，查看物流状态、订单明细与下单商品。',
    ordersEmptyText: '还没有订单记录，可以先去商品页选品。',
    filterEmptyTitle: '没有符合筛选条件的订单',
    filterEmptyText: '可以切换时间范围或订单状态后再查看。',
    itemCountLabel: '件数',
    viewDetails: '查看详情',
    hideDetails: '收起详情',
    cancelOrder: '取消订单',
    contactLabel: '联系邮箱 / 手机',
    phoneLabel: '电话',
    countryLabel: '国家 / 地区',
    marketingLabel: '营销订阅',
    trackingLabel: '物流单号',
    trackingEmpty: '待发货',
    shippedAtLabel: '发货时间',
    completedAtLabel: '完成时间',
    addressLabel: '详细地址',
    apartmentLabel: '公寓 / 楼层',
    cityLabel: '城市',
    stateLabel: '省 / 州',
    zipLabel: '邮编',
    itemsTitle: '订单商品',
    sizeLabel: '尺码',
    quantityLabel: '数量',
    yes: '是',
    no: '否',
    statusMap: {
      pending: '待发货',
      paid: '已付款',
      packed: '备货中',
      shipped: '已发货',
      completed: '已完成',
      cancelled: '已取消',
    },
    filters: {
      time: {
        all: '全部时间',
        days7: '近 7 天',
        days30: '近 30 天',
        days90: '近 90 天',
        thisYear: '今年',
      },
      status: {
        all: '全部状态',
      },
    },
  },
  en: {
    overline: 'ORDER CENTER',
    title: 'Order Center',
    subtitle: 'Filter orders by time and status, review tracking progress and inspect order details.',
    ordersEmptyText: 'No orders yet. Start by browsing products.',
    filterEmptyTitle: 'No orders match the selected filters',
    filterEmptyText: 'Try another time range or order status.',
    itemCountLabel: 'Items',
    viewDetails: 'View Details',
    hideDetails: 'Hide Details',
    cancelOrder: 'Cancel Order',
    contactLabel: 'Email / Mobile',
    phoneLabel: 'Phone',
    countryLabel: 'Country / Region',
    marketingLabel: 'Marketing Opt-in',
    trackingLabel: 'Tracking No.',
    trackingEmpty: 'Pending shipment',
    shippedAtLabel: 'Shipped At',
    completedAtLabel: 'Completed At',
    addressLabel: 'Address',
    apartmentLabel: 'Apartment / Suite',
    cityLabel: 'City',
    stateLabel: 'State',
    zipLabel: 'ZIP code',
    itemsTitle: 'Order Items',
    sizeLabel: 'Size',
    quantityLabel: 'Qty',
    yes: 'Yes',
    no: 'No',
    statusMap: {
      pending: 'To Ship',
      paid: 'Paid',
      packed: 'Packed',
      shipped: 'Shipped',
      completed: 'Completed',
      cancelled: 'Cancelled',
    },
    filters: {
      time: {
        all: 'All Time',
        days7: 'Last 7 Days',
        days30: 'Last 30 Days',
        days90: 'Last 90 Days',
        thisYear: 'This Year',
      },
      status: {
        all: 'All Status',
      },
    },
  },
  fr: {
    overline: 'ORDER CENTER',
    title: 'Centre de commandes',
    subtitle: 'Filtrez les commandes par periode et statut, consultez le suivi et ouvrez le detail.',
    ordersEmptyText: 'Aucune commande pour le moment. Commencez par la page produits.',
    filterEmptyTitle: 'Aucune commande ne correspond aux filtres',
    filterEmptyText: 'Essayez une autre periode ou un autre statut.',
    itemCountLabel: 'Articles',
    viewDetails: 'Voir le detail',
    hideDetails: 'Masquer le detail',
    cancelOrder: 'Annuler la commande',
    contactLabel: 'E-mail / Mobile',
    phoneLabel: 'Telephone',
    countryLabel: 'Pays / Region',
    marketingLabel: 'Abonnement marketing',
    trackingLabel: 'Numero logistique',
    trackingEmpty: 'En attente d expedition',
    shippedAtLabel: 'Date expedition',
    completedAtLabel: 'Date completion',
    addressLabel: 'Adresse',
    apartmentLabel: 'Appartement / Suite',
    cityLabel: 'Ville',
    stateLabel: 'Etat / Region',
    zipLabel: 'Code postal',
    itemsTitle: 'Articles commandes',
    sizeLabel: 'Taille',
    quantityLabel: 'Qte',
    yes: 'Oui',
    no: 'Non',
    statusMap: {
      pending: 'A expedier',
      paid: 'Payee',
      packed: 'Preparee',
      shipped: 'Expediee',
      completed: 'Terminee',
      cancelled: 'Annulee',
    },
    filters: {
      time: {
        all: 'Toutes les periodes',
        days7: '7 derniers jours',
        days30: '30 derniers jours',
        days90: '90 derniers jours',
        thisYear: 'Cette annee',
      },
      status: {
        all: 'Tous les statuts',
      },
    },
  },
}

const copy = computed(() => copyByLocale[locale.current] || copyByLocale.en)
const statusOptions = computed(() =>
  ['pending', 'shipped', 'completed', 'cancelled'].map((value) => ({
    value,
    label: copy.value.statusMap[value] || value,
  }))
)
const isFiltering = computed(() => selectedTimeRange.value !== 'all' || selectedStatus.value !== 'all')

const filteredOrders = computed(() =>
  catalog.orders.filter((order) => {
    const statusMatch = selectedStatus.value === 'all' || order.status === selectedStatus.value
    const timeMatch = matchesTimeRange(order.createdAt, selectedTimeRange.value)
    return statusMatch && timeMatch
  })
)

function matchesTimeRange(value, range) {
  if (range === 'all') return true
  const target = new Date(value)
  if (Number.isNaN(target.getTime())) return false
  const now = new Date()
  const msPerDay = 24 * 60 * 60 * 1000
  const diffDays = (now.getTime() - target.getTime()) / msPerDay
  if (range === '7d') return diffDays <= 7
  if (range === '30d') return diffDays <= 30
  if (range === '90d') return diffDays <= 90
  if (range === 'year') return target.getFullYear() === now.getFullYear()
  return true
}

function formatCurrency(value) {
  const amount = Number(value || 0)
  return new Intl.NumberFormat(locale.current === 'fr' ? 'fr-FR' : locale.current === 'en' ? 'en-US' : 'zh-CN', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatDate(value) {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return '--'
  return new Intl.DateTimeFormat(locale.current === 'fr' ? 'fr-FR' : locale.current === 'en' ? 'en-US' : 'zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function formatDateTime(value) {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return '--'
  return new Intl.DateTimeFormat(locale.current === 'fr' ? 'fr-FR' : locale.current === 'en' ? 'en-US' : 'zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatStatus(status) {
  return copy.value.statusMap[status] || status
}

function summarizeItems(items) {
  return items.map((item) => item.productName).filter(Boolean).join(' / ')
}

function toggleExpanded(orderId) {
  const next = new Set(expandedOrderIds.value)
  if (next.has(orderId)) next.delete(orderId)
  else next.add(orderId)
  expandedOrderIds.value = next
}

async function handleCancel(orderId) {
  cancellingOrderId.value = orderId
  const updated = await catalog.cancelOrder(orderId)
  if (updated) {
    const next = new Set(expandedOrderIds.value)
    next.add(orderId)
    expandedOrderIds.value = next
  }
  cancellingOrderId.value = 0
}

onMounted(() => {
  catalog.loadMyOrders()
})
</script>
