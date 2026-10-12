<template>
  <section class="catalog-page"><div class="container">
    <header class="catalog-title"><div><p class="eyebrow">GINGTTO / {{ presale ? 'PRE-SALE' : 'CATALOG' }}</p><h1>{{ presale ? 'Pre-sale Selection' : 'Product Catalog' }}</h1>
      <p>{{ presale ? 'A curated selection of styles. Orders remain subject to available stock.' : 'Explore every color. Choose a style to order by size.' }}</p></div><span>{{ total }} styles</span></header>
    <form class="catalog-filters" @submit.prevent="apply">
      <input v-model="draft.keyword" class="field" type="search" placeholder="Search style, product, color or SKU" aria-label="Search catalog" />
      <select v-model="draft.category" class="field" aria-label="Category"><option value="">All categories</option><option v-for="c in catalog.categories" :key="c.key" :value="c.key">{{ c.label }}</option></select>
      <label><input v-model="draft.stockOnly" type="checkbox" /> In stock only</label>
      <button class="primary-button" type="submit" :disabled="loading">Search</button><button class="secondary-button" type="button" @click="reset">Reset</button>
    </form>
    <div v-if="error" class="catalog-message" role="alert"><p>{{ error }}</p><button class="secondary-button" @click="load">Retry</button></div>
    <div v-else-if="loading" class="catalog-loading" aria-live="polite">Loading catalog…</div>
    <template v-else>
      <StyleCatalogGroup v-for="group in groups" :key="group.styleCode" :group="group" />
      <div v-if="!groups.length" class="catalog-message">{{ presale ? 'No pre-sale styles match this selection.' : 'No styles match this selection.' }}</div>
      <StorefrontPagination :page="page" :page-size="pageSize" :total-items="total" :labels="labels" @update:page="changePage" @update:page-size="changeSize" />
    </template>
  </div></section>
</template>
<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { request } from '../api'
import { useCatalogStore } from '../stores/catalog'
import { useLocaleStore } from '../stores/locale'
import StyleCatalogGroup from '../components/StyleCatalogGroup.vue'
import StorefrontPagination from '../components/StorefrontPagination.vue'
const route=useRoute(), router=useRouter(), catalog=useCatalogStore(), locale=useLocaleStore()
const presale=computed(()=>route.path==='/presale')
const groups=ref([]), total=ref(0), loading=ref(true), error=ref(''), page=ref(1), pageSize=ref(12)
const draft=reactive({keyword:'',category:'',stockOnly:false})
const labels={prev:'Prev',next:'Next',of:'of',perPage:'Styles per page',itemLabel:'styles'}
let controller, revision=0
async function load(){
  const current=++revision; controller?.abort(); controller=new AbortController(); loading.value=true; error.value=''
  const params=new URLSearchParams({lang:locale.current,section:presale.value?'presale':'shop',page:String(page.value),pageSize:String(pageSize.value)})
  for(const key of ['keyword','category','stockOnly']) if(route.query[key]) params.set(key,String(route.query[key]))
  try{
    const [data]=await Promise.all([request(`/api/catalog/styles?${params}`,{headers:catalog.authHeaders(),signal:controller.signal}),catalog.loadCategories(locale.current)])
    if(current!==revision)return
    total.value=data.total; groups.value=data.items
    const last=Math.max(1,Math.ceil(total.value/pageSize.value))
    if(page.value>last){changePage(last);return}
  }catch(e){if(current===revision && e.name!=='AbortError')error.value=e.message || 'Catalog load failed'}
  finally{if(current===revision)loading.value=false}
}
function apply(){
 const query={pageSize:pageSize.value}
 if(draft.keyword.trim())query.keyword=draft.keyword.trim()
 if(draft.category)query.category=draft.category
 if(draft.stockOnly)query.stockOnly='1'
 router.replace({path:route.path,query})
}
function reset(){Object.assign(draft,{keyword:'',category:'',stockOnly:false});apply()}
function changePage(value){router.replace({path:route.path,query:{...route.query,page:value}})}
function changeSize(value){router.replace({path:route.path,query:{...route.query,page:1,pageSize:value}})}
watch(()=>[route.path,route.query,locale.current],()=>{
  Object.assign(draft,{keyword:String(route.query.keyword||''),category:String(route.query.category||''),stockOnly:['1','true'].includes(String(route.query.stockOnly||''))})
  page.value=Math.max(1,Number.parseInt(route.query.page,10)||1)
  const size=Number(route.query.pageSize);pageSize.value=[12,24,36].includes(size)?size:12
  load()
},{immediate:true})
onBeforeUnmount(()=>{revision++;controller?.abort()})
</script>
<style scoped>
.catalog-page{padding:36px 0 56px;background:#fff;min-height:65vh}.catalog-title{display:flex;justify-content:space-between;align-items:end;gap:20px;margin-bottom:24px}.catalog-title h1{font-size:28px;margin:6px 0 10px;color:#202b38}.catalog-title p,.catalog-title>span{font-size:13px;color:#748295}.catalog-title .eyebrow{letter-spacing:2px;font-size:10px}.catalog-filters{display:flex;gap:12px;align-items:center;flex-wrap:wrap;border-top:1px solid #e4e8ec;border-bottom:1px solid #e4e8ec;padding:18px 0;margin-bottom:32px}.catalog-filters input[type=search]{flex:1;min-width:220px}.catalog-filters select{width:180px}.catalog-filters label{display:flex;align-items:center;gap:8px;font-size:13px;color:#64748b;white-space:nowrap}.catalog-filters input[type=checkbox]{width:18px;height:18px;accent-color:#202b38}.catalog-message,.catalog-loading{padding:60px 24px;text-align:center;background:#f7f8fa;color:#64748b;margin-bottom:24px}.catalog-message button{margin-top:12px}@media(max-width:640px){.catalog-page{padding:20px 0 32px}.catalog-title h1{font-size:23px}.catalog-title{align-items:start}.catalog-filters{gap:10px}.catalog-filters input[type=search]{flex-basis:100%}.catalog-filters select{flex:1;min-width:120px}.catalog-filters button{padding:10px 16px}}
</style>
