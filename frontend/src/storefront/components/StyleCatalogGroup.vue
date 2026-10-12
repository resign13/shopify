<template>
  <article class="style-group">
    <header class="style-heading"><div class="style-title-row"><h2>{{ group.name }} <span>| {{ group.styleCode }}</span> <span>| {{ price }}</span></h2>
      <span class="style-stock" :class="{ 'is-empty': stock === 0 }">Total stock: {{ stock.toLocaleString('en-US') }} pcs</span></div>
      <p>Size: {{ group.sizeCodes.join(' / ') }}<template v-if="summary"> · {{ summary }}</template></p>
    </header>
    <div class="style-colors">
      <RouterLink v-for="variant in group.variants" :key="variant.id" :to="`/product/${variant.slug}`" class="color-card">
        <div class="color-image"><img v-if="variant.image" :src="variant.image" :alt="`${group.name} ${variant.colorName}`" loading="lazy" @error="imageFailed" /><span v-else class="image-placeholder">GINGTTO</span></div>
        <strong>{{ variant.colorName || variant.productCode }}</strong><small>{{ variant.sku }}</small>
        <span class="color-stock" :class="{ 'is-empty': catalogStock(variant) === 0 }">Stock: {{ catalogStock(variant).toLocaleString('en-US') }} pcs</span>
      </RouterLink>
    </div>
  </article>
</template>
<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { catalogStock, catalogSummary } from '../utils/catalogDisplay.js'
const props=defineProps({group:{type:Object,required:true}})
const money=value=>`$${Number(value).toFixed(2)}`
const price=computed(()=>props.group.priceRange.min === props.group.priceRange.max ? money(props.group.priceRange.min) : `${money(props.group.priceRange.min)}–${money(props.group.priceRange.max)}`)
const stock=computed(()=>props.group.variants.reduce((sum, variant)=>sum+catalogStock(variant),0))
const summary=computed(()=>catalogSummary(props.group))
function imageFailed(event){event.target.style.visibility='hidden'; event.target.parentElement.classList.add('image-unavailable')}
</script>
<style scoped>
.style-title-row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.style-title-row h2{flex:1;min-width:220px}.style-stock{font-size:12px;color:#27634b;background:#eef7f2;padding:5px 10px;border-radius:5px;white-space:nowrap}.color-stock{font-size:12px;color:#27634b;font-weight:500;line-height:1.6}.is-empty{color:#7b8491}.style-stock.is-empty{background:#f3f4f6}@media(max-width:640px){.style-title-row{gap:8px}.style-stock{font-size:11px}.style-title-row h2{min-width:200px}}
.style-group{margin:0 0 48px}.style-heading{margin-bottom:18px;border-bottom:1px solid #dce2e7;padding-bottom:14px}.style-heading h2{margin:0;font-size:20px;line-height:1.5;font-weight:650;color:#202b38}.style-heading h2 span{white-space:nowrap}.style-heading p{margin:8px 0 0;color:#64748b;font-size:13px;line-height:1.6}.style-colors{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:24px 16px}.color-card{text-decoration:none;color:#263343;text-align:center;display:flex;flex-direction:column;align-items:center;gap:6px;min-width:0}.color-image{width:100%;aspect-ratio:1/1;background:#f1f2f3;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}.color-image img{width:100%;height:100%;object-fit:contain}.color-card strong{font-size:14px;font-weight:500;margin-top:4px}.color-card small{font-size:12px;color:#8090a5;overflow-wrap:anywhere}.color-card:hover .color-image{box-shadow:0 0 0 2px #dce3e9}.out-of-stock{font-size:11px;color:#8d6b3d}.image-placeholder{color:#98a5b3;letter-spacing:3px;font-size:13px}.image-unavailable:after{content:'Image unavailable';position:absolute;color:#98a5b3;font-size:12px}@media(max-width:1024px){.style-colors{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:640px){.style-colors{grid-template-columns:repeat(2,minmax(0,1fr));gap:20px 10px}.style-heading h2{font-size:16px}.style-group{margin-bottom:32px}}
</style>
