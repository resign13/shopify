<template>
  <section class="inventory-page">
    <div class="container">
      <div class="inventory-export-toolbar">
        <span>Export current search and category results across all pages. No filters = all products.</span>
        <button type="button" class="inventory-export-button" :disabled="exporting || catalog.loading" :aria-busy="exporting" @click="downloadInventoryPdf">
          {{ exporting ? exportProgress : 'Export PDF' }}
        </button>
      </div>
      <p v-if="exportMessage" class="inventory-export-message" :class="{ 'is-error': exportError }" :role="exportError ? 'alert' : 'status'">{{ exportMessage }}</p>
      <section class="inventory-toolbar">
        <label class="inventory-field">
          <span>Category</span>
          <select v-model="categoryFilter">
            <option value="">All Categories</option>
            <option v-for="category in categoryOptions" :key="category.key" :value="category.key">
              {{ category.label }}
            </option>
          </select>
        </label>

        <label class="inventory-field inventory-search">
          <span>Search</span>
          <input
            v-model="keyword"
            type="search"
            placeholder="Search title, SKU or color; multiple style codes: ZM4757,CS5101"
            aria-describedby="inventory-search-help"
          />
          <small id="inventory-search-help">Separate multiple style codes with commas. Matches any code.</small>
        </label>
      </section>

      <section class="inventory-stat-grid">
        <article>
          <span>Color SKUs</span>
          <strong>{{ filteredRows.length }}</strong>
        </article>
        <article>
          <span>Total Available Stock</span>
          <strong>{{ totalStock }}</strong>
        </article>
        <article>
          <span>Size Columns</span>
          <strong>{{ sizeColumns.length }}</strong>
        </article>
      </section>

      <div v-if="catalog.loading" class="inventory-state">
        Loading inventory...
      </div>

      <template v-else>
        <div class="inventory-table-card">
          <div class="inventory-table-scroll">
            <table class="inventory-table">
              <thead>
                <tr>
                  <th>Product Title</th>
                  <th>Color SKU</th>
                  <th>Image</th>
                  <th>Color</th>
                  <th>Category</th>
                  <th v-for="column in sizeColumns" :key="column.key">{{ column.label }}</th>
                  <th>Available Stock</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in paginatedRows" :key="row.id">
                  <td>
                    <RouterLink class="inventory-product-link" :to="`/product/${row.slug}`">
                      {{ row.name }}
                    </RouterLink>
                  </td>
                  <td class="inventory-sku">{{ row.colorSku }}</td>
                  <td>
                    <RouterLink class="inventory-image-link" :to="`/product/${row.slug}`">
                      <LazyImage :width="160"
                        v-if="row.image"
                        :src="row.image"
                        :alt="row.name"
                        wrapper-class="inventory-product-image"
                        aspect-ratio="1 / 1"
                        fit="cover"
                      />
                      <span v-else class="inventory-image-empty">No Image</span>
                    </RouterLink>
                  </td>
                  <td>{{ row.colorName || '—' }}</td>
                  <td>{{ row.categoryLabel }}</td>
                  <td v-for="column in sizeColumns" :key="`${row.id}-${column.key}`">
                    <span v-if="row.sizeStocks[column.key]" class="inventory-stock-pill">
                      {{ row.sizeStocks[column.key] }}
                    </span>
                    <span v-else class="inventory-empty-size">—</span>
                  </td>
                  <td class="inventory-total">{{ row.totalStock }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <StorefrontPagination
          v-if="filteredRows.length"
          :page="currentPage"
          :page-size="pageSize"
          :size-options="[20, 40, 80]"
          :total-items="filteredRows.length"
          :labels="paginationLabels"
          @update:page="currentPage = $event"
          @update:page-size="pageSize = $event"
        />

        <div v-else class="inventory-state">
          No inventory records match your filters.
        </div>
      </template>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

import LazyImage from '../components/LazyImage.vue'
import StorefrontPagination from '../components/StorefrontPagination.vue'
import { useCatalogStore } from '../stores/catalog'
import { useLocaleStore } from '../stores/locale'
import { inventorySnapshot, filterInventorySnapshot } from '../utils/inventoryData.js'
import { request } from '../api'
import { useAuthStore } from '../stores/auth'
import { applyProductsImageOverrides } from '../imageOverrides'

const catalog = useCatalogStore()
const locale = useLocaleStore()

const categoryFilter = ref('')
const keyword = ref('')
const currentPage = ref(1)
const pageSize = ref(20)

const auth = useAuthStore()
const exporting = ref(false)
const exportProgress = ref('Preparing PDF...')
const exportMessage = ref('')
const exportError = ref(false)
let exportController = null

const snapshot = computed(() => inventorySnapshot(catalog.products || [], categoryOptions.value))
const filteredSnapshot = computed(() => filterInventorySnapshot(snapshot.value, { keyword: keyword.value, categoryKey: categoryFilter.value }))
const sizeColumns = computed(() => filteredSnapshot.value.columns)

const paginationLabels = {
  prev: 'Prev',
  next: 'Next',
  of: 'of',
  perPage: 'Per page',
  itemLabel: 'records',
}

const categoryOptions = computed(() => catalog.categories || [])

const filteredRows = computed(() => filteredSnapshot.value.rows)

const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredRows.value.slice(start, start + pageSize.value)
})

const totalStock = computed(() => filteredSnapshot.value.totalStock)

async function downloadInventoryPdf() {
  if (exporting.value || !auth.isAuthenticated) return
  const controller = new AbortController()
  // Lock the chosen scope at click time even if the input changes during export.
  const filters = { keyword: keyword.value, categoryKey: categoryFilter.value }
  const categories = categoryOptions.value.map(category => ({ ...category }))
  exportController = controller
  exporting.value = true
  exportProgress.value = 'Preparing PDF...'
  exportMessage.value = ''
  exportError.value = false
  try {
    // A fresh, single products response supplies the complete stock snapshot;
    // never export stale cached state after a failed request or slice by page.
    const raw = await request('/api/products?lang=en', {
      headers: catalog.authHeaders(), signal: controller.signal,
    })
    if (!Array.isArray(raw.items)) throw new Error('Inventory response is incomplete. Please try again.')
    const data = applyProductsImageOverrides(raw)
    const selected = filterInventorySnapshot(inventorySnapshot(data.items, categories), filters)
    const { exportInventoryPdf } = await import('../utils/inventoryPdf.js')
    const result = await exportInventoryPdf(selected, {
      signal: controller.signal,
      onProgress: (page, total) => { exportProgress.value = `Exporting ${page}/${total}...` },
    })
    exportMessage.value = `PDF downloaded: ${result.rowCount} color SKUs, ${result.pageCount} pages.`
    if (result.missingImages) exportMessage.value += ` ${result.missingImages} product images could not be loaded; stock data is included.`
  } catch (error) {
    if (!controller.signal.aborted) {
      exportError.value = true
      exportMessage.value = error.message || 'PDF export failed. Please try again.'
    }
  } finally {
    if (exportController === controller) {
      exportController = null
      exporting.value = false
    }
  }
}

watch(() => auth.sessionId, () => exportController?.abort())
onBeforeUnmount(() => exportController?.abort())

async function loadInventory() {
  try {
    await catalog.loadCategories('en')
  } catch (error) {
    exportError.value = true
    exportMessage.value = error.message || 'Categories could not be loaded. Please refresh.'
  }
  await catalog.loadProducts({}, 'en')
}

watch([categoryFilter, keyword, pageSize], () => {
  currentPage.value = 1
})

watch(
  () => filteredRows.value.length,
  (count) => {
    const totalPages = Math.max(1, Math.ceil(count / pageSize.value))
    if (currentPage.value > totalPages) {
      currentPage.value = totalPages
    }
  }
)

watch(() => locale.current, loadInventory)

onMounted(loadInventory)
</script>

<style scoped>
.inventory-page {
  padding: 36px 0 72px;
}

.inventory-export-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 20px;
}

.inventory-export-toolbar span,
.inventory-export-message {
  color: var(--muted);
  font-size: 0.82rem;
  line-height: 1.5;
}

.inventory-export-button {
  flex-shrink: 0;
  min-height: 44px;
  padding: 10px 22px;
  background: #111;
  color: #fff;
  border: 1px solid #111;
  cursor: pointer;
  font-weight: 700;
}

.inventory-export-button:disabled {
  opacity: 0.5;
  cursor: wait;
}

.inventory-export-button:focus-visible {
  outline: 3px solid #b66b3f;
  outline-offset: 3px;
}

.inventory-export-message.is-error { color: #b42318; }

.inventory-toolbar {
  display: grid;
  grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
  gap: 14px;
  align-items: start;
  margin-bottom: 18px;
}

.inventory-field {
  display: grid;
  gap: 8px;
}

.inventory-field span {
  color: var(--muted);
  font-size: 0.88rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.inventory-search small {
  color: var(--muted);
  font-size: 0.76rem;
  line-height: 1.4;
}

.inventory-field input,
.inventory-field select {
  width: 100%;
  min-height: 50px;
  border: 1px solid var(--line);
  background: #fff;
  padding: 0 16px;
  color: var(--text);
}

.inventory-stat-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 18px;
}

.inventory-stat-grid article {
  border: 1px solid var(--line);
  background: #fbf7f2;
  padding: 20px 22px;
}

.inventory-stat-grid span {
  display: block;
  color: var(--muted);
  font-size: 0.88rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.inventory-stat-grid strong {
  display: block;
  margin-top: 8px;
  font-size: clamp(1.5rem, 2.2vw, 2.2rem);
  line-height: 1;
}

.inventory-table-card {
  border: 1px solid var(--line);
  background: #fff;
}

.inventory-table-scroll {
  width: 100%;
  overflow-x: auto;
}

.inventory-table {
  width: 100%;
  min-width: 1180px;
  border-collapse: collapse;
}

.inventory-table th,
.inventory-table td {
  padding: 16px 14px;
  border-bottom: 1px solid var(--line);
  text-align: center;
  vertical-align: middle;
}

.inventory-table th {
  background: #f6efe8;
  color: #111;
  font-size: 0.82rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.inventory-table th:first-child,
.inventory-table td:first-child {
  width: 240px;
  text-align: left;
}

.inventory-product-link {
  display: -webkit-box;
  overflow: hidden;
  font-weight: 800;
  line-height: 1.35;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.inventory-sku {
  font-weight: 800;
  letter-spacing: 0.02em;
}

.inventory-image-link {
  display: inline-block;
}

.inventory-product-image {
  width: 58px;
  border-radius: 14px;
  background: #f3f0ed;
}

.inventory-image-empty {
  display: inline-grid;
  place-items: center;
  width: 58px;
  height: 58px;
  border-radius: 14px;
  background: #f3f0ed;
  color: var(--muted);
  font-size: 0.72rem;
}

.inventory-stock-pill {
  display: inline-flex;
  min-width: 46px;
  justify-content: center;
  padding: 7px 12px;
  border-radius: 999px;
  background: #f4ece6;
  font-weight: 800;
}

.inventory-empty-size {
  color: #b6aea8;
}

.inventory-total {
  color: #b66b3f;
  font-weight: 900;
}

.inventory-state {
  display: grid;
  place-items: center;
  min-height: 180px;
  border: 1px solid var(--line);
  background: #fff;
  color: var(--muted);
}

@media (max-width: 900px) {
  .inventory-export-toolbar { align-items: flex-start; }
  .inventory-toolbar,
  .inventory-stat-grid {
    grid-template-columns: 1fr;
  }
}
</style>
