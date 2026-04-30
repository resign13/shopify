<template>
  <section class="checkout-page">
    <div class="container">
      <div v-if="!cart.items.length" class="panel-card empty-state-card">
        <p class="eyebrow">{{ checkoutCopy.title }}</p>
        <h1>{{ locale.t('common.emptyCart') }}</h1>
        <p class="helper">{{ checkoutCopy.empty }}</p>
        <RouterLink class="primary-button inline-button" to="/shop">
          {{ locale.t('common.continueShopping') }}
        </RouterLink>
      </div>

      <form v-else class="checkout-layout" @submit.prevent="handleSubmit">
        <section class="panel-card checkout-form-card">
          <div class="section-stack">
            <div>
              <p class="eyebrow">{{ checkoutCopy.title }}</p>
              <h1>{{ checkoutCopy.title }}</h1>
              <p class="helper">{{ checkoutCopy.subtitle }}</p>
            </div>

            <div class="checkout-section">
              <div class="checkout-section-head">
                <h2>{{ checkoutCopy.contactTitle }}</h2>
              </div>

              <div class="checkout-stack">
                <div>
                  <input
                    v-model.trim="form.contactValue"
                    class="field"
                    :class="{ 'field-error': errors.contactValue }"
                    :placeholder="checkoutCopy.contactPlaceholder"
                    @blur="validateField('contactValue')"
                    @input="clearFieldError('contactValue')"
                  />
                  <p v-if="errors.contactValue" class="field-error-text">{{ errors.contactValue }}</p>
                </div>

                <label class="checkout-checkbox-row">
                  <input v-model="form.marketingOptIn" type="checkbox" />
                  <span>{{ checkoutCopy.marketingOptIn }}</span>
                </label>
              </div>
            </div>

            <div class="checkout-section">
              <div class="checkout-section-head">
                <h2>{{ checkoutCopy.deliveryTitle }}</h2>
              </div>

              <div class="checkout-grid">
                <div class="checkout-grid-span">
                  <select
                    v-model="form.country"
                    class="field checkout-select"
                    :class="{ 'field-error': errors.country }"
                    @change="validateField('country')"
                  >
                    <option value="">{{ checkoutCopy.countryPlaceholder }}</option>
                    <option v-for="item in countryOptions" :key="item.value" :value="item.value">
                      {{ item.label }}
                    </option>
                  </select>
                  <p v-if="errors.country" class="field-error-text">{{ errors.country }}</p>
                </div>

                <div>
                  <input
                    v-model.trim="form.firstName"
                    class="field"
                    :placeholder="checkoutCopy.firstNamePlaceholder"
                    @input="clearFieldError('firstName')"
                  />
                </div>

                <div>
                  <input
                    v-model.trim="form.lastName"
                    class="field"
                    :class="{ 'field-error': errors.lastName }"
                    :placeholder="checkoutCopy.lastNamePlaceholder"
                    @blur="validateField('lastName')"
                    @input="clearFieldError('lastName')"
                  />
                  <p v-if="errors.lastName" class="field-error-text">{{ errors.lastName }}</p>
                </div>

                <div class="checkout-grid-span">
                  <input
                    v-model.trim="form.address"
                    class="field"
                    :class="{ 'field-error': errors.address }"
                    :placeholder="checkoutCopy.addressPlaceholder"
                    @blur="validateField('address')"
                    @input="clearFieldError('address')"
                  />
                  <p v-if="errors.address" class="field-error-text">{{ errors.address }}</p>
                </div>

                <div class="checkout-grid-span">
                  <input
                    v-model.trim="form.apartment"
                    class="field"
                    :placeholder="checkoutCopy.apartmentPlaceholder"
                    @input="clearFieldError('apartment')"
                  />
                </div>

                <div>
                  <input
                    v-model.trim="form.city"
                    class="field"
                    :class="{ 'field-error': errors.city }"
                    :placeholder="checkoutCopy.cityPlaceholder"
                    @blur="validateField('city')"
                    @input="clearFieldError('city')"
                  />
                  <p v-if="errors.city" class="field-error-text">{{ errors.city }}</p>
                </div>

                <div>
                  <input
                    v-model.trim="form.state"
                    class="field"
                    :class="{ 'field-error': errors.state }"
                    :placeholder="checkoutCopy.statePlaceholder"
                    @blur="validateField('state')"
                    @input="clearFieldError('state')"
                  />
                  <p v-if="errors.state" class="field-error-text">{{ errors.state }}</p>
                </div>

                <div>
                  <input
                    v-model.trim="form.zip"
                    class="field"
                    :class="{ 'field-error': errors.zip }"
                    :placeholder="checkoutCopy.zipPlaceholder"
                    @blur="validateField('zip')"
                    @input="clearFieldError('zip')"
                  />
                  <p v-if="errors.zip" class="field-error-text">{{ errors.zip }}</p>
                </div>

                <div class="checkout-grid-span">
                  <input
                    v-model.trim="form.phone"
                    class="field"
                    :class="{ 'field-error': errors.phone }"
                    :placeholder="checkoutCopy.phonePlaceholder"
                    @blur="validateField('phone')"
                    @input="clearFieldError('phone')"
                  />
                  <p v-if="errors.phone" class="field-error-text">{{ errors.phone }}</p>
                </div>
              </div>
            </div>

            <p v-if="catalog.error" class="error-text">{{ catalog.error }}</p>
            <p v-if="successMessage" class="success-text">{{ successMessage }}</p>

            <button class="primary-button" type="submit" :disabled="submitting">
              {{ submitting ? locale.t('common.loading') : checkoutCopy.submit }}
            </button>
          </div>
        </section>

        <aside class="panel-card checkout-summary-card">
          <div class="checkout-summary-head">
            <h2>{{ checkoutCopy.summaryTitle }}</h2>
          </div>

          <div class="checkout-item-list">
            <article v-for="item in cart.items" :key="item.lineKey" class="checkout-item">
              <img :src="item.image" :alt="item.name" />
              <div class="checkout-item-copy">
                <strong>{{ item.name }}</strong>
                <p>SKU {{ item.sku }}</p>
                <p v-if="item.sizeCode">{{ checkoutCopy.sizeLabel }} {{ item.sizeCode }}</p>
                <span>{{ item.formattedUnitPrice }} x {{ item.quantity }}</span>
                <small>{{ locale.t('common.total') }}: {{ item.formattedLineTotal }}</small>
              </div>
              <div class="checkout-item-actions">
                <input
                  class="field quantity-field"
                  type="number"
                  min="1"
                  :max="item.stock"
                  :value="item.quantity"
                  @input="cart.updateQuantity(item.lineKey, Number($event.target.value || 1))"
                />
                <button class="text-button" type="button" @click="cart.removeItem(item.lineKey)">
                  {{ locale.t('common.remove') }}
                </button>
              </div>
            </article>
          </div>

          <div class="checkout-total-row">
            <span>{{ locale.t('common.subtotal') }}</span>
            <strong>{{ formattedSubtotal }}</strong>
          </div>
          <div class="checkout-total-row checkout-total-strong">
            <span>{{ locale.t('common.total') }}</span>
            <strong>{{ formattedSubtotal }}</strong>
          </div>
        </aside>
      </form>
    </div>
  </section>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import { useAuthStore } from '../stores/auth'
import { useCartStore } from '../stores/cart'
import { useCatalogStore } from '../stores/catalog'
import { useLocaleStore } from '../stores/locale'

const auth = useAuthStore()
const cart = useCartStore()
const catalog = useCatalogStore()
const locale = useLocaleStore()
const router = useRouter()

const checkoutCopyByLocale = {
  zh: {
    title: '结算',
    subtitle: '填写联系信息和收货信息后，订单会一次性同步到后台管理系统。',
    contactTitle: 'Contact',
    contactPlaceholder: '邮箱或手机号',
    marketingOptIn: '接收新品与优惠通知',
    deliveryTitle: 'Delivery',
    countryPlaceholder: '国家 / 地区',
    firstNamePlaceholder: '名字（选填）',
    lastNamePlaceholder: '姓氏',
    addressPlaceholder: '详细地址',
    apartmentPlaceholder: '公寓、楼层、房间号（选填）',
    cityPlaceholder: '城市',
    statePlaceholder: '省 / 州',
    zipPlaceholder: '邮编',
    phonePlaceholder: '电话',
    submit: '提交订单',
    success: '订单提交成功，已同步到用户中心。',
    empty: '请先添加商品后再结算。',
    summaryTitle: '订单摘要',
    sizeLabel: '尺码',
    errors: {
      contactValue: '请填写邮箱或手机号',
      contactFormat: '请输入有效的邮箱或手机号',
      country: '请选择国家 / 地区',
      lastName: '请填写姓氏',
      address: '请填写详细地址',
      city: '请填写城市',
      state: '请填写省 / 州',
      zip: '请填写邮编',
      zipFormat: '邮编格式不正确',
      phone: '请填写联系电话',
      phoneFormat: '请输入有效的联系电话',
    },
  },
  en: {
    title: 'Checkout',
    subtitle: 'Fill in contact and delivery details. The whole cart will be submitted as one order.',
    contactTitle: 'Contact',
    contactPlaceholder: 'Email or mobile phone number',
    marketingOptIn: 'Email me with news and offers',
    deliveryTitle: 'Delivery',
    countryPlaceholder: 'Country / Region',
    firstNamePlaceholder: 'First name (optional)',
    lastNamePlaceholder: 'Last name',
    addressPlaceholder: 'Address',
    apartmentPlaceholder: 'Apartment, suite, etc. (optional)',
    cityPlaceholder: 'City',
    statePlaceholder: 'State',
    zipPlaceholder: 'ZIP code',
    phonePlaceholder: 'Phone',
    submit: 'Submit Order',
    success: 'Order submitted successfully. You can review it in your account.',
    empty: 'Please add products to your cart before checkout.',
    summaryTitle: 'Order Summary',
    sizeLabel: 'Size',
    errors: {
      contactValue: 'Please enter your email or mobile phone number',
      contactFormat: 'Please enter a valid email or mobile phone number',
      country: 'Please select a country or region',
      lastName: 'Please enter your last name',
      address: 'Please enter the address',
      city: 'Please enter the city',
      state: 'Please enter the state',
      zip: 'Please enter the ZIP code',
      zipFormat: 'Please enter a valid ZIP code',
      phone: 'Please enter the phone number',
      phoneFormat: 'Please enter a valid phone number',
    },
  },
  fr: {
    title: 'Paiement',
    subtitle: 'Renseignez le contact et la livraison. Tout le panier sera envoye comme une seule commande.',
    contactTitle: 'Contact',
    contactPlaceholder: 'E-mail ou numero de telephone',
    marketingOptIn: 'Recevoir les actualites et offres',
    deliveryTitle: 'Livraison',
    countryPlaceholder: 'Pays / Region',
    firstNamePlaceholder: 'Prenom (optionnel)',
    lastNamePlaceholder: 'Nom',
    addressPlaceholder: 'Adresse',
    apartmentPlaceholder: 'Appartement, suite, etc. (optionnel)',
    cityPlaceholder: 'Ville',
    statePlaceholder: 'Etat / Region',
    zipPlaceholder: 'Code postal',
    phonePlaceholder: 'Telephone',
    submit: 'Envoyer la commande',
    success: 'Commande envoyee avec succes. Vous pouvez la voir dans votre compte.',
    empty: 'Ajoutez des produits au panier avant le paiement.',
    summaryTitle: 'Resume de commande',
    sizeLabel: 'Taille',
    errors: {
      contactValue: 'Veuillez saisir votre e-mail ou numero de telephone',
      contactFormat: 'Veuillez saisir un e-mail ou numero de telephone valide',
      country: 'Veuillez selectionner un pays ou une region',
      lastName: 'Veuillez saisir votre nom',
      address: 'Veuillez saisir l adresse',
      city: 'Veuillez saisir la ville',
      state: 'Veuillez saisir l etat ou la region',
      zip: 'Veuillez saisir le code postal',
      zipFormat: 'Veuillez saisir un code postal valide',
      phone: 'Veuillez saisir le telephone',
      phoneFormat: 'Veuillez saisir un numero de telephone valide',
    },
  },
}

const countryOptionMap = {
  zh: [
    { value: 'China', label: '中国' },
    { value: 'United States', label: '美国' },
    { value: 'France', label: '法国' },
    { value: 'United Kingdom', label: '英国' },
    { value: 'Canada', label: '加拿大' },
    { value: 'Germany', label: '德国' },
    { value: 'Australia', label: '澳大利亚' },
  ],
  en: [
    { value: 'China', label: 'China' },
    { value: 'United States', label: 'United States' },
    { value: 'France', label: 'France' },
    { value: 'United Kingdom', label: 'United Kingdom' },
    { value: 'Canada', label: 'Canada' },
    { value: 'Germany', label: 'Germany' },
    { value: 'Australia', label: 'Australia' },
  ],
  fr: [
    { value: 'China', label: 'Chine' },
    { value: 'United States', label: 'Etats-Unis' },
    { value: 'France', label: 'France' },
    { value: 'United Kingdom', label: 'Royaume-Uni' },
    { value: 'Canada', label: 'Canada' },
    { value: 'Germany', label: 'Allemagne' },
    { value: 'Australia', label: 'Australie' },
  ],
}

const submitting = ref(false)
const successMessage = ref('')
const errors = reactive({
  contactValue: '',
  country: '',
  lastName: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  phone: '',
})

const form = reactive({
  contactValue: auth.user?.email || '',
  marketingOptIn: true,
  country: '',
  firstName: auth.user?.name?.split(' ')[0] || '',
  lastName: auth.user?.name?.split(' ').slice(1).join(' ') || '',
  address: '',
  apartment: '',
  city: '',
  state: '',
  zip: '',
  phone: '',
})

const checkoutCopy = computed(() => checkoutCopyByLocale[locale.current] || checkoutCopyByLocale.zh)
const countryOptions = computed(() => countryOptionMap[locale.current] || countryOptionMap.zh)

const formattedSubtotal = computed(() =>
  new Intl.NumberFormat(locale.current === 'fr' ? 'fr-FR' : locale.current === 'en' ? 'en-US' : 'zh-CN', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(cart.subtotal)
)

function clearFieldError(field) {
  errors[field] = ''
}

function validateContactValue() {
  const value = form.contactValue.trim()
  if (!value) {
    errors.contactValue = checkoutCopy.value.errors.contactValue
    return false
  }
  const isEmail = value.includes('@')
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  const phoneOk = /^[0-9+\-\s()]{6,}$/.test(value)
  if ((isEmail && !emailOk) || (!isEmail && !phoneOk)) {
    errors.contactValue = checkoutCopy.value.errors.contactFormat
    return false
  }
  errors.contactValue = ''
  return true
}

function validateField(field) {
  const value = String(form[field] || '').trim()

  if (field === 'contactValue') return validateContactValue()
  if (field === 'country') {
    errors.country = value ? '' : checkoutCopy.value.errors.country
    return !errors.country
  }
  if (field === 'lastName') {
    errors.lastName = value ? '' : checkoutCopy.value.errors.lastName
    return !errors.lastName
  }
  if (field === 'address') {
    errors.address = value ? '' : checkoutCopy.value.errors.address
    return !errors.address
  }
  if (field === 'city') {
    errors.city = value ? '' : checkoutCopy.value.errors.city
    return !errors.city
  }
  if (field === 'state') {
    errors.state = value ? '' : checkoutCopy.value.errors.state
    return !errors.state
  }
  if (field === 'zip') {
    if (!value) {
      errors.zip = checkoutCopy.value.errors.zip
      return false
    }
    if (!/^[A-Za-z0-9 -]{3,12}$/.test(value)) {
      errors.zip = checkoutCopy.value.errors.zipFormat
      return false
    }
    errors.zip = ''
    return true
  }
  if (field === 'phone') {
    if (!value) {
      errors.phone = checkoutCopy.value.errors.phone
      return false
    }
    if (!/^[0-9+\-\s()]{6,}$/.test(value)) {
      errors.phone = checkoutCopy.value.errors.phoneFormat
      return false
    }
    errors.phone = ''
    return true
  }
  return true
}

function validateForm() {
  const fields = ['contactValue', 'country', 'lastName', 'address', 'city', 'state', 'zip', 'phone']
  return fields.every((field) => validateField(field))
}

async function handleSubmit() {
  if (!cart.items.length || !validateForm()) return

  submitting.value = true
  successMessage.value = ''
  catalog.clearMessages()

  try {
    const order = await catalog.createOrder({
      contact: {
        value: form.contactValue,
        marketingOptIn: form.marketingOptIn,
      },
      delivery: {
        country: form.country,
        firstName: form.firstName,
        lastName: form.lastName,
        address: form.address,
        apartment: form.apartment,
        city: form.city,
        state: form.state,
        zip: form.zip,
        phone: form.phone,
      },
      items: cart.items.map((item) => ({
        productId: item.id,
        sizeCode: item.sizeCode,
        quantity: item.quantity,
      })),
      note: '',
    })

    if (!order) return

    cart.clear()
    successMessage.value = checkoutCopy.value.success
    router.push('/account')
  } finally {
    submitting.value = false
  }
}
</script>
