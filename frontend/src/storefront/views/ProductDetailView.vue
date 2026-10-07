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
              <LazyImage :width="160" :src="image" :alt="catalog.currentProduct.name" aspect-ratio="1 / 1.18" />
            </button>
          </div>
        </div>

        <div class="product-buy-column">
          <p class="detail-category">{{ categoryLabel }}</p>
          <h1>{{ catalog.currentProduct.name }}</h1>

          <div class="detail-price-stack">
            <p class="detail-price">{{ formatCurrency(displayPrice) }}</p>
            <p class="detail-code-line">
              <span>{{ detailCopy.codeLabel }}</span>
              <strong>{{ catalog.currentProduct.productCode || catalog.currentProduct.sku }}</strong>
            </p>
            <p class="detail-subprice">{{ selectedUnits }} pcs · {{ formatCurrency(selectedTotal) }}</p>
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
                :aria-label="`Color ${option.colorName || option.productCode}`"
                type="button"
                @click="handleColorChange(option)"
              >
                <span v-if="index === 0" class="detail-color-badge">Hot</span>
                <span class="detail-color-tile-image">
                  <LazyImage :width="160" :src="option.image" :alt="option.colorName || option.productCode" aspect-ratio="3 / 4" />
                </span>
              </button>
            </div>
          </div>

          <div class="detail-option-group detail-size-order-section">
            <div class="detail-size-head">
              <strong>{{ locale.t('detail.size') }}</strong>
              <span>{{ detailCopy.sizeSelectionHint }}</span>
            </div>

            <div class="detail-size-order-card">
              <div class="detail-size-order-head">
                <span>{{ locale.t('detail.size') }}</span>
                <span>{{ detailCopy.priceLabel }}</span>
                <span>{{ detailCopy.stockLabel }}</span>
                <span>{{ detailCopy.quantityLabel }}</span>
              </div>
              <div
                v-for="row in sizeRows"
                :key="row.sizeCode || '__default'"
                :class="['detail-size-order-row', { 'is-disabled': row.stock <= 0 }]"
              >
                <strong>{{ row.sizeCode || detailCopy.defaultSizeLabel }}</strong>
                <span class="detail-size-order-price">{{ formatCurrency(row.price) }}</span>
                <span :class="['detail-size-order-stock', { 'is-available': row.stock > 0 }]">
                  {{ row.stock > 0 ? `${row.stock} ${detailCopy.inStockLabel}` : detailCopy.outOfStockLabel }}
                </span>
                <div class="detail-size-stepper">
                  <button
                    type="button"
                    :disabled="row.stock <= 0 || quantityFor(row) <= 0"
                    :aria-label="`Decrease ${row.sizeCode || detailCopy.defaultSizeLabel}`"
                    @click="decreaseSize(row)"
                  >
                    -
                  </button>
                  <input
                    :value="quantityFor(row)"
                    type="number"
                    min="0"
                    :max="row.stock"
                    :disabled="row.stock <= 0"
                    :aria-label="`${detailCopy.quantityLabel} ${row.sizeCode || detailCopy.defaultSizeLabel}`"
                    @input="updateSizeInput(row, $event)"
                  />
                  <button
                    type="button"
                    :disabled="row.stock <= 0 || quantityFor(row) >= row.stock"
                    :aria-label="`Increase ${row.sizeCode || detailCopy.defaultSizeLabel}`"
                    @click="increaseSize(row)"
                  >
                    +
                  </button>
                </div>
              </div>
              <div v-if="!sizeRows.length" class="detail-size-empty">{{ detailCopy.noSizesLabel }}</div>
            </div>

            <div class="detail-size-summary">
              <span>{{ selectedUnits }} {{ detailCopy.unitsLabel }} · {{ selectedOrderLines.length }} {{ detailCopy.sizesSelectedLabel }}</span>
              <strong>{{ formatCurrency(selectedTotal) }}</strong>
            </div>
          </div>

          <div class="detail-action-row detail-action-row-elevated">
            <button class="detail-action-button secondary" type="button" :disabled="!canPurchase" @click="addToCart">
              {{ locale.t('common.addToCart') }}
            </button>
            <button class="detail-action-button primary" type="button" :disabled="!canPurchase" @click="buyNow">
              {{ locale.t('common.buyNow') }}
            </button>
          </div>
          <p v-if="addToCartSuccess" class="detail-cart-feedback">{{ addToCartSuccess }}</p>

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
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import LazyImage from '../components/LazyImage.vue'
import { useCartStore } from '../stores/cart'
import { useCatalogStore } from '../stores/catalog'
import { useLocaleStore } from '../stores/locale'
import { productSizeRows, normalizeSizeQuantity, selectedSizeLines, addSizeLinesToCart } from '../utils/sizeOrder'

const CATEGORY_LABELS = {
  womenswear: 'Womenswear',
  menswear: 'Menswear',
  pants: 'Pants',
  denim: 'Denim',
  outerwear: 'Outerwear',
  shirts: 'Shirts',
  tops: 'Tops',
  accessories: 'Accessories',
}

function titleCaseFromKey(value) {
  return String(value || '')
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

const route = useRoute()
const router = useRouter()
const cart = useCartStore()
const catalog = useCatalogStore()
const locale = useLocaleStore()
const activeImage = ref('')
const selectedQuantities = reactive({})
const addToCartSuccess = ref('')
let addToCartSuccessTimer = null
const sizeChartExpanded = ref(false)
const descriptionExpanded = ref(false)
const thumbSkeletons = [1, 2, 3, 4]
const sizeSkeletons = [1, 2, 3, 4, 5]
const benefitSkeletons = [1, 2, 3, 4]

const detailCopy = {
  colorLabel: 'Color',
  codeLabel: 'Code',
  priceLabel: 'Price',
  stockLabel: 'Available Stock',
  inStockLabel: 'in stock',
  quantityLabel: 'Quantity',
  sizeSelectionHint: 'Select quantities for each size',
  outOfStockLabel: 'Out of stock',
  defaultSizeLabel: 'Standard',
  noSizesLabel: 'No sizes available',
  unitsLabel: 'pcs',
  sizesSelectedLabel: 'sizes selected',
  sizeChartTitle: 'Size Chart',
  descriptionImageTitle: 'Description Image',
}

const productGallery = computed(() => {
  if (!catalog.currentProduct) return []
  return catalog.currentProduct.gallery?.length ? catalog.currentProduct.gallery : [catalog.currentProduct.image]
})

const colorOptions = computed(() => catalog.currentProduct?.colorOptions || [])
const selectedColorLabel = computed(() => catalog.currentProduct?.colorName || '--')
const categoryLabel = computed(() => {
  const key = String(catalog.currentProduct?.categoryKey || '').trim().toLowerCase()
  if (key && CATEGORY_LABELS[key]) return CATEGORY_LABELS[key]

  const raw = String(catalog.currentProduct?.categoryLabel || '').trim()
  if (raw && /^[\x00-\x7F]+$/.test(raw)) return raw
  if (key) return titleCaseFromKey(key)
  return 'Category'
})

const sizeRows = computed(() => productSizeRows(catalog.currentProduct))
const selectedOrderLines = computed(() => selectedSizeLines(sizeRows.value, selectedQuantities))

const selectedUnits = computed(() =>
  selectedOrderLines.value.reduce((sum, row) => sum + row.quantity, 0)
)

const selectedTotal = computed(() =>
  selectedOrderLines.value.reduce((sum, row) => sum + row.quantity * Math.round(row.price * 100), 0) / 100
)

const displayPrice = computed(() => Number(selectedOrderLines.value[0]?.price ?? catalog.currentProduct?.price ?? 0))
const canPurchase = computed(() => selectedUnits.value > 0)


function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

function quantityFor(row) {
  return Number(selectedQuantities[row.sizeCode] || 0)
}

function setSizeQuantity(row, value) {
  const next = normalizeSizeQuantity(value, row.stock)
  selectedQuantities[row.sizeCode] = next
  return next
}

function updateSizeInput(row, event) {
  event.target.value = setSizeQuantity(row, event.target.value)
}

function decreaseSize(row) {
  setSizeQuantity(row, quantityFor(row) - 1)
}

function increaseSize(row) {
  setSizeQuantity(row, quantityFor(row) + 1)
}

function resetSelectedQuantities(product) {
  Object.keys(selectedQuantities).forEach((key) => delete selectedQuantities[key])
  productSizeRows(product).forEach(row => {
    selectedQuantities[row.sizeCode] = 0
  })
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

function showAddToCartSuccess() {
  addToCartSuccess.value = 'Added to cart successfully'
  if (addToCartSuccessTimer) {
    window.clearTimeout(addToCartSuccessTimer)
  }
  addToCartSuccessTimer = window.setTimeout(() => {
    addToCartSuccess.value = ''
    addToCartSuccessTimer = null
  }, 1000)
}

function addToCart() {
  if (!catalog.currentProduct || !canPurchase.value) return

  addSizeLinesToCart(cart, catalog.currentProduct, selectedOrderLines.value)
  showAddToCartSuccess()
}

function buyNow() {
  if (!catalog.currentProduct || !canPurchase.value) return

  addSizeLinesToCart(cart, catalog.currentProduct, selectedOrderLines.value, true)
  router.push('/checkout')
}

watch(
  () => catalog.currentProduct,
  (product) => {
    if (!product) return
    activeImage.value = product.gallery?.[0] || product.image
    resetSelectedQuantities(product)
    addToCartSuccess.value = ''
    sizeChartExpanded.value = false
    descriptionExpanded.value = false
  },
  { immediate: true }
)

watch(() => route.params.slug, loadDetail)
watch(() => locale.current, loadDetail)

onMounted(() => {
  loadDetail()
})

onBeforeUnmount(() => {
  if (addToCartSuccessTimer) window.clearTimeout(addToCartSuccessTimer)
})
</script>
