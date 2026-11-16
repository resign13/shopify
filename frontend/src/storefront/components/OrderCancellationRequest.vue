<template>
  <div class="cancel-request">
    <button v-if="order.canRequestCancellation" type="button" class="text-button" :disabled="busy" @click="openRequest">Request cancellation</button>
    <div v-if="order.cancelRequest" class="cancel-request-state" role="status">
      <strong>{{ states[order.cancelRequest.state] }}</strong>
      <span v-if="order.cancelRequest.state==='pending'">Your order remains active until cancellation is approved.</span>
      <span v-if="order.cancelRequest.reviewNote">{{ order.cancelRequest.reviewNote }}</span>
      <button v-if="order.cancelRequest.canWithdraw" type="button" class="text-button" :disabled="busy" @click="withdraw">Withdraw request</button>
    </div>
    <p v-if="error" role="alert" class="error-text">{{ error }}</p>
    <dialog ref="dialog" :aria-labelledby="titleId" @cancel="onCancel">
      <form @submit.prevent="submit">
        <h2 :id="titleId">Request cancellation</h2>
        <p>{{ order.orderNo }}</p><p>Your order and stock will not change until the request is approved.</p>
        <label>Cancellation reason<textarea v-model="reason" aria-label="Cancellation reason" rows="4" maxlength="500" required :disabled="busy" /></label>
        <p v-if="error" class="error-text" role="alert">{{ error }}</p>
        <footer><button type="button" class="secondary-button inline-button" :disabled="busy" @click="dialog.close()">Back</button><button type="submit" class="primary-button inline-button" :disabled="busy || !reason.trim()">{{ busy?'Submitting…':'Submit request' }}</button></footer>
      </form>
    </dialog>
  </div>
</template>
<script setup>
import {ref,useId} from 'vue';
import {request} from '../api';
const props=defineProps({order:{type:Object,required:true}});const emit=defineEmits(['changed']);
const dialog=ref(null),reason=ref(''),busy=ref(false),error=ref('');
const titleId=useId();
const states={pending:'Cancellation pending review',approved:'Cancellation approved',rejected:'Cancellation request declined',withdrawn:'Cancellation request withdrawn'};
function openRequest(){error.value='';reason.value='';dialog.value.showModal();}
function onCancel(event){if(busy.value)event.preventDefault();}
async function submit(){
  if(busy.value||!reason.value.trim())return;
  busy.value=true;error.value='';
  try{await request(`/api/store/orders/${props.order.id}/cancellation-requests`,{method:'POST',body:JSON.stringify({reason:reason.value})});dialog.value.close();emit('changed');}
  catch(e){error.value=e.message||'The request could not be submitted. Please try again.';}finally{busy.value=false;}
}
async function withdraw(){
  if(busy.value || !window.confirm('Withdraw the cancellation request and keep this order active?'))return;
  busy.value=true;error.value='';
  try{await request(`/api/store/orders/cancellation-requests/${props.order.cancelRequest.id}/withdraw`,{method:'POST',body:JSON.stringify({version:props.order.cancelRequest.version})});emit('changed');}
  catch(e){error.value=e.message||'The request could not be withdrawn. Please refresh the order.';}finally{busy.value=false;}
}
</script>
<style scoped>
.cancel-request{margin:10px 0;font-size:14px}.cancel-request-state{display:flex;gap:8px 14px;align-items:center;flex-wrap:wrap;padding:10px 0}.cancel-request-state>span{overflow-wrap:anywhere;white-space:pre-wrap}dialog{border:1px solid #ded8d0;width:min(500px,calc(100vw - 40px));padding:24px;box-sizing:border-box;color:#222}dialog::backdrop{background:#0006}h2{font-size:22px;margin-top:0}label{display:grid;gap:8px}textarea{font:inherit;border:1px solid #ccc;padding:10px;resize:vertical;width:100%;box-sizing:border-box}footer{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;margin-top:18px}
</style>
