<template>
  <div ref="root" class="category-picker" @keydown.esc.stop.prevent="closeAndFocus" @focusout="closeOnBlur">
    <button ref="trigger" type="button" class="category-trigger" aria-label="Category"
      :aria-expanded="open" :aria-controls="panelId" :title="selectedLabels.join(', ') || 'All Categories'"
      @click="open = !open">
      <span>{{ selectionLabel }}</span><span class="category-chevron" aria-hidden="true">⌄</span>
    </button>
    <div v-if="open" :id="panelId" class="category-options" role="group" aria-label="Categories">
      <button type="button" class="category-all" :aria-pressed="!modelValue.length"
        @click="$emit('update:modelValue', [])">All Categories</button>
      <label v-for="category in options" :key="category.key" class="category-option">
        <input type="checkbox" :value="category.key" :checked="modelValue.includes(category.key)"
          @change="toggle(category.key)" />
        <span>{{ category.label }}</span>
      </label>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, useId } from 'vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  options: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue'])
const root = ref(null), trigger = ref(null), open = ref(false)
const panelId = useId()
const selectedLabels = computed(() => props.modelValue.map(key => props.options.find(option => option.key === key)?.label || key))
const selectionLabel = computed(() => !selectedLabels.value.length ? 'All Categories'
  : selectedLabels.value.length === 1 ? selectedLabels.value[0] : `${selectedLabels.value.length} categories selected`)

function toggle(key) {
  emit('update:modelValue', props.modelValue.includes(key)
    ? props.modelValue.filter(value => value !== key) : [...props.modelValue, key])
}
function closeAndFocus() {
  open.value = false
  trigger.value?.focus()
}
function closeOutside(event) {
  if (!root.value?.contains(event.target)) open.value = false
}
function closeOnBlur(event) {
  if (event.relatedTarget && !root.value?.contains(event.relatedTarget)) open.value = false
}
onMounted(() => document.addEventListener('pointerdown', closeOutside))
onBeforeUnmount(() => document.removeEventListener('pointerdown', closeOutside))
</script>

<style scoped>
.category-picker { position: relative; min-width: 0; }
.category-trigger {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  width: 100%; min-height: 50px; padding: 10px 16px; border: 1px solid var(--line);
  background: #fff; color: var(--text); font: inherit; text-align: left; cursor: pointer;
}
.category-trigger > span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.category-chevron { flex-shrink: 0; font-size: 20px; line-height: 1; }
.category-options {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 20;
  max-height: 290px; overflow-y: auto; padding: 6px; border: 1px solid var(--line);
  background: #fff; box-shadow: 0 10px 28px #00000014;
}
.category-all {
  width: 100%; min-height: 40px; padding: 8px 10px; border: 0;
  background: #fff; color: var(--text); text-align: left; font: inherit; cursor: pointer;
}
.category-all[aria-pressed="true"], .category-all:hover, .category-option:hover { background: #f6efe8; }
.category-option { display: flex; align-items: center; gap: 10px; min-height: 40px; padding: 8px 10px; cursor: pointer; }
.category-option input { width: 18px; height: 18px; flex-shrink: 0; margin: 0; accent-color: #111; }
.category-option span { overflow-wrap: anywhere; }
.category-trigger:focus-visible, .category-all:focus-visible { outline: 2px solid #b66b3f; outline-offset: 2px; }
</style>
