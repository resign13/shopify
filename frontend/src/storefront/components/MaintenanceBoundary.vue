<template>
  <div class="maintenance-content" :inert="state.active" :aria-hidden="state.active ? 'true' : undefined"><slot /></div>
  <Teleport to="body">
    <div v-if="state.active" class="maintenance-cover" data-testid="maintenance-cover">
      <section ref="dialog" role="alertdialog" aria-modal="true" aria-labelledby="maintenance-title" aria-describedby="maintenance-description" tabindex="-1">
        <div class="maintenance-brand">GINGTTO</div>
        <h1 id="maintenance-title">{{ state.recovered ? 'Service restored' : 'Maintenance in progress' }}</h1>
        <p id="maintenance-description">{{ state.recovered ? 'Your current page and unsaved input are still here. Review them before continuing.' : 'We are updating the service. Your input is preserved, and your last action will not be retried automatically.' }}</p>
        <button v-if="state.recovered" type="button" @click="maintenance.continue()">Continue</button>
        <button v-else type="button" :disabled="state.checking" @click="maintenance.check()">{{ state.checking ? 'Checking…' : 'Check availability' }}</button>
        <small v-if="!state.recovered">Availability is checked every 30 seconds. No refresh is needed.</small>
      </section>
    </div>
  </Teleport>
</template>
<script setup>
import { nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue';
import { maintenance } from '../utils/maintenance.js';
const state = shallowRef(maintenance.state), dialog = ref();
let previousFocus;
const unsubscribe = maintenance.subscribe(value => { state.value = value; });
watch(() => state.value.active, async active => {
  if (active) { previousFocus = document.activeElement; await nextTick(); dialog.value?.focus(); }
  else { await nextTick(); if (previousFocus?.isConnected) previousFocus.focus(); }
}, { immediate: true });
onBeforeUnmount(unsubscribe);
</script>
<style scoped>
.maintenance-content{display:contents}
.maintenance-cover{position:fixed;inset:0;z-index:2147483640;display:grid;place-items:center;overflow:auto;padding:24px;background:#f7f5f1f5;color:#171717;font:16px/1.6 system-ui,-apple-system,sans-serif}
.maintenance-cover section{box-sizing:border-box;width:min(100%,460px);padding:32px;border:1px solid #e3ded6;border-radius:20px;background:#fff;box-shadow:0 16px 48px #17171712;outline:none}
.maintenance-brand{font-size:12px;font-weight:750;letter-spacing:.1em}.maintenance-cover h1{margin:16px 0 12px;font-size:28px;line-height:1.3}.maintenance-cover p{margin:0 0 24px;color:#615a50}
.maintenance-cover button{min-height:44px;padding:0 18px;border:0;border-radius:8px;background:#171717;color:#fff;font:inherit;font-weight:650;cursor:pointer}.maintenance-cover button:disabled{opacity:.6;cursor:wait}.maintenance-cover button:focus-visible{outline:3px solid #675c49;outline-offset:3px}.maintenance-cover small{display:block;margin-top:16px;font-size:12px;color:#6e665b}
</style>
