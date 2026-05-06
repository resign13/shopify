<template>
  <section class="product-detail-page">
    <div v-if="catalog.detailLoading" class="container product-detail-layout detail-skeleton-layout">
      <div class="product-gallery-column">
        <div class="product-main-image skeleton-media skeleton-media-detail"></div>
        <div class="product-thumb-row">
          <div v-for="item in thumbSkeletons" :key="item" class="product-thumb skeleton-thumb"></div>
        </div>
      </div>

      <div class="product-buy-column detail-copy-skeleton">
        <span class="skeleton-line skeleton-line-xs"></span>
        <span class="skeleton-line skeleton-line-title"></span>
        <span class="skeleton-line skeleton-line-sm"></span>
        <span class="skeleton-line skeleton-line-lg"></span>
        <span class="skeleton-line skeleton-line-md"></span>

        <div class="detail-size-grid">
          <span v-for="item in sizeSkeletons" :key="item" class="skeleton-button skeleton-size-button"></span>
        </div>

        <div class="skeleton-benefits">
          <span v-for="item in benefitSkeletons" :key="item" class="skeleton-line skeleton-line-lg"></span>
        </div>
      </div>
    </div>

    <template v-else-if="catalog.currentProduct">
        <div class="container product-detail-layout">
        <div class="product-gallery-column">
          <div class="product-main-image">
            <LazyImage :src="activeImage" :alt="catalog.currentProduct.name" eager fit="contain" natural-height />
          </div>

          <div class="product-thumb-row">
            <button
              v-for="image in productGallery"
              :key="image"
              :class="['product-thumb', { active: image === activeImage }]"
              type="button"
              @click="activeImage = image"
            >
              <LazyImage :src="image" :alt="catalog.currentProduct.name" aspect-ratio="1 / 1.18" />
            </button>
          </div>
        </div>

        <div class="product-buy-column">
          <p class="detail-category">{{ catalog.currentProduct.categoryLabel }}</p>
          <h1>{{ catalog.currentProduct.name }}</h1>

          <div class="detail-price-stack">
            <p class="detail-price">{{ formatCurrency(selectedSizePrice) }}</p>
            <p class="detail-code-line">
              <span>{{ detailCopy.codeLabel }}</span>
              <strong>{{ catalog.currentProduct.productCode || catalog.currentProduct.sku }}</strong>
            </p>
            <p class="detail-subprice">{{ selectedSizeLabel }} · {{ detailCopy.basePriceLabel }} {{ formatCurrency(selectedSizePrice) }}</p>
          </div>

          <div class="detail-tier-card premium-tier-card">
            <div class="detail-tier-title-row">
              <div>
                <strong>{{ detailCopy.tierTitle }}</strong>
                <span>{{ detailCopy.tierHint }}</span>
              </div>
              <span class="detail-tier-badge">{{ activeTierLabel }}</span>
            </div>

            <div class="detail-tier-list">
              <button
                v-for="tier in displayPriceTiers"
                :key="tier.label"
                :class="['detail-tier-pill', { active: tier.active }]"
                type="button"
                @click="selectedQuantity = tier.minQty"
              >
                <span class="detail-tier-pill-range">{{ tier.label }}</span>
                <strong>{{ formatCurrency(tier.price) }}</strong>
                <small>-{{ tier.discountPercent }}%</small>
              </button>
            </div>
          </div>

          <div v-if="colorOptions.length" class="detail-option-group detail-color-section">
            <p class="detail-color-title">
              {{ detailCopy.colorLabel }}: <strong>{{ selectedColorLabel }}</strong>
            </p>
            <div class="detail-color-grid">
              <button
                v-for="(option, index) in colorOptions"
                :key="option.slug"
                :class="['detail-color-tile', { active: option.slug === catalog.currentProduct.slug }]"
                type="button"
                @click="handleColorChange(option)"
              >
                <span v-if="index === 0" class="detail-color-badge">Hot</span>
                <span class="detail-color-tile-image">
                  <LazyImage :src="option.image" :alt="option.colorName || option.productCode" aspect-ratio="3 / 4" />
                </span>
              </button>
            </div>
          </div>

          <div class="detail-option-group">
            <div class="detail-size-head">
              <strong>{{ locale.t('detail.size') }}: {{ selectedSizeLabel }}</strong>
              <span>{{ locale.t('detail.sizeFinder') }}</span>
            </div>

            <div class="detail-size-grid">
              <button
                v-for="size in catalog.currentProduct.sizes"
                :key="size"
                :class="['detail-size-button', { active: size === selectedSize }]"
                type="button"
                @click="selectedSize = size"
              >
                {{ size }}
              </button>
            </div>
          </div>

          <div class="detail-option-group detail-quantity-section">
            <div class="detail-size-head">
              <strong>{{ detailCopy.quantityLabel }}</strong>
              <span>{{ detailCopy.quantityHint }}</span>
            </div>

            <div class="detail-quantity-card">
              <div class="detail-quantity-stepper">
                <button type="button" class="detail-qty-button" @click="decreaseQuantity">-</button>
                <input
                  v-model.number="selectedQuantity"
                  class="detail-qty-input"
                  type="number"
                  min="1"
                  :max="catalog.currentProduct.stock"
                  @change="normalizeQuantity"
                />
                <button type="button" class="detail-qty-button" @click="increaseQuantity">+</button>
              </div>
              <div class="detail-quantity-meta">
                <strong>{{ formatCurrency(activeTierPrice) }}</strong>
                <span>{{ stockText }}</span>
              </div>
            </div>
          </div>

          <div class="detail-action-row detail-action-row-elevated">
            <button class="detail-action-button secondary" type="button" @click="addToCart">
              {{ locale.t('common.addToCart') }}
            </button>
            <button class="detail-action-button primary" type="button" @click="buyNow">
              {{ locale.t('common.buyNow') }}
            </button>
          </div>

          <div class="detail-media-stack">
            <section v-if="catalog.currentProduct.sizeChartImage" class="detail-media-card">
              <button
                class="detail-media-head detail-media-toggle"
                type="button"
                :aria-expanded="sizeChartExpanded"
                @click="sizeChartExpanded = !sizeChartExpanded"
              >
                <strong>{{ detailCopy.sizeChartTitle }}</strong>
                <span :class="['detail-media-chevron', { expanded: sizeChartExpanded }]">⌄</span>
              </button>
              <div v-show="sizeChartExpanded" class="detail-media-body">
                <LazyImage
                  :src="catalog.currentProduct.sizeChartImage"
                  :alt="detailCopy.sizeChartTitle"
                  fit="contain"
                  natural-height
                />
              </div>
            </section>

            <section v-if="catalog.currentProduct.descriptionImage" class="detail-media-card">
              <button
                class="detail-media-head detail-media-toggle"
                type="button"
                :aria-expanded="descriptionExpanded"
                @click="descriptionExpanded = !descriptionExpanded"
              >
                <strong>{{ detailCopy.descriptionImageTitle }}</strong>
                <span :class="['detail-media-chevron', { expanded: descriptionExpanded }]">⌄</span>
              </button>
              <div v-show="descriptionExpanded" class="detail-media-body">
                <LazyImage
                  :src="catalog.currentProduct.descriptionImage"
                  :alt="detailCopy.descriptionImageTitle"
                  fit="contain"
                  natural-height
                />
              </div>
            </section>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import LazyImage from '../components/LazyImage.vue'
import { useCartStore } from '../stores/cart'
import { useCatalogStore } from '../stores/catalog'
import { useLocaleStore } from '../stores/locale'

const route = useRoute()
const router = useRouter()
const cart = useCartStore()
const catalog = useCatalogStore()
const locale = useLocaleStore()
const activeImage = ref('')
const selectedSize = ref('')
const selectedQuantity = ref(1)
const sizeChartExpanded = ref(false)
const descriptionExpanded = ref(false)
const thumbSkeletons = [1, 2, 3, 4]
const sizeSkeletons = [1, 2, 3, 4, 5]
const benefitSkeletons = [1, 2, 3, 4]

const detailCopyByLocale = {
  zh: {
    colorLabel: '颜色',
    codeLabel: '款号',
    basePriceLabel: '尺码基础价',
    tierTitle: '阶梯价格',
    tierHint: '数量越高，单价越优',
    quantityLabel: '下单数量',
    quantityHint: '支持直接选择采购数量',
    sizeChartTitle: '尺码表图',
    descriptionImageTitle: '商品信息描述图',
  },
  en: {
    colorLabel: 'Color',
    codeLabel: 'Code',
    basePriceLabel: 'Base price',
    tierTitle: 'Tier Pricing',
    tierHint: 'Higher quantity, better unit price',
    quantityLabel: 'Quantity',
    quantityHint: 'Choose the purchase quantity directly',
    sizeChartTitle: 'Size Chart',
    descriptionImageTitle: 'Description Image',
  },
  fr: {
    colorLabel: 'Couleur',
    codeLabel: 'Code',
    basePriceLabel: 'Prix de base',
    tierTitle: 'Prix par palier',
    tierHint: 'Plus la quantite est grande, meilleur est le prix',
    quantityLabel: 'Quantite',
    quantityHint: 'Choisissez directement la quantite a commander',
    sizeChartTitle: 'Guide des tailles',
    descriptionImageTitle: 'Description produit',
  },
}

const detailCopy = computed(() => detailCopyByLocale[locale.current] || detailCopyByLocale.en)

const productGallery = computed(() => {
  if (!catalog.currentProduct) return []
  return catalog.currentProduct.gallery?.length ? catalog.currentProduct.gallery : [catalog.currentProduct.image]
})

const colorOptions = computed(() => catalog.currentProduct?.colorOptions || [])
const selectedColorLabel = computed(() => catalog.currentProduct?.colorName || '--')

const selectedSizePrice = computed(() => {
  const sizePrices = catalog.currentProduct?.sizePrices || []
  const found = sizePrices.find((item) => item.sizeCode === selectedSize.value)
  return Number(found?.price ?? catalog.currentProduct?.price ?? 0)
})

const selectedSizeLabel = computed(() => selectedSize.value || '--')

const displayPriceTiers = computed(() => {
  const tiers = catalog.currentProduct?.priceTiers || []
  const normalized = tiers.length
    ? tiers.map((tier) => ({
        ...tier,
        discountPercent: Number(tier.discountPercent ?? tier.discount_percent ?? 0),
        label: tier.maxQty ? `${tier.minQty}-${tier.maxQty}` : `>=${tier.minQty}`,
      }))
    : [
        { minQty: 1, maxQty: 99, discountPercent: 5, label: '1-99' },
        { minQty: 100, maxQty: 200, discountPercent: 10, label: '100-200' },
        { minQty: 201, maxQty: 1000, discountPercent: 15, label: '201-1000' },
      ]

  return normalized.map((tier) => {
    const price = Number((selectedSizePrice.value * (1 - Number(tier.discountPercent || 0) / 100)).toFixed(2))
    return {
      ...tier,
      price,
      active: selectedQuantity.value >= tier.minQty && (tier.maxQty == null || selectedQuantity.value <= tier.maxQty),
    }
  })
})

const activeTier = computed(() => displayPriceTiers.value.find((tier) => tier.active) || displayPriceTiers.value[0])
const activeTierLabel = computed(() => `${detailCopy.value.quantityLabel}: ${activeTier.value?.label || '1-99'}`)
const activeTierPrice = computed(() => activeTier.value?.price || selectedSizePrice.value)

const stockText = computed(() => {
  if (!catalog.currentProduct) return ''
  const base = catalog.currentProduct.stock <= 100 ? locale.t('detail.lowStock') : locale.t('detail.readyStock')
  return `${base} | ${catalog.currentProduct.stock}`
})

function formatCurrency(value) {
  return new Intl.NumberFormat(locale.current === 'fr' ? 'fr-FR' : locale.current === 'en' ? 'en-US' : 'zh-CN', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

function normalizeQuantity() {
  const max = Number(catalog.currentProduct?.stock || 1)
  const value = Number(selectedQuantity.value || 1)
  selectedQuantity.value = Math.max(1, Math.min(value, max))
}

function decreaseQuantity() {
  selectedQuantity.value = Math.max(1, Number(selectedQuantity.value || 1) - 1)
}

function increaseQuantity() {
  const max = Number(catalog.currentProduct?.stock || 1)
  selectedQuantity.value = Math.min(max, Number(selectedQuantity.value || 1) + 1)
}

function loadDetail() {
  catalog.loadProduct(route.params.slug, locale.current)
}

function handleColorChange(option) {
  if (!option?.slug) return
  if (option.slug === route.params.slug) {
    activeImage.value = option.image || catalog.currentProduct?.image || ''
    return
  }
  router.push(`/product/${option.slug}`)
}

function addToCart() {
  if (!catalog.currentProduct) return
  normalizeQuantity()
  cart.addItem(
    {
      ...catalog.currentProduct,
      basePrice: selectedSizePrice.value,
    },
    selectedQuantity.value,
    selectedSize.value
  )
}

function buyNow() {
  if (!catalog.currentProduct) return
  normalizeQuantity()
  cart.setSingleItem(
    {
      ...catalog.currentProduct,
      basePrice: selectedSizePrice.value,
    },
    selectedQuantity.value,
    selectedSize.value
  )
  router.push('/checkout')
}

watch(
  () => catalog.currentProduct,
  (product) => {
    if (!product) return
    activeImage.value = product.gallery?.[0] || product.image
    selectedSize.value = product.sizes?.[0] || ''
    selectedQuantity.value = 1
    sizeChartExpanded.value = false
    descriptionExpanded.value = true
  },
  { immediate: true }
)

watch(() => route.params.slug, loadDetail)
watch(() => locale.current, loadDetail)

onMounted(() => {
  loadDetail()
})
</script>
