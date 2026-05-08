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
            <div class="checkout-section">
              <div class="checkout-section-head">
                <h2>{{ checkoutCopy.contactTitle }}</h2>
              </div>

              <div class="checkout-grid">
                <div>
                  <input
                    v-model.trim="form.email"
                    class="field"
                    :class="{ 'field-error': errors.email }"
                    :placeholder="checkoutCopy.emailPlaceholder"
                    @blur="validateField('email')"
                    @input="clearContactErrors"
                  />
                  <p v-if="errors.email" class="field-error-text">{{ errors.email }}</p>
                </div>

                <div>
                  <input
                    v-model.trim="form.phone"
                    class="field"
                    :class="{ 'field-error': errors.phone }"
                    :placeholder="checkoutCopy.phonePlaceholder"
                    @blur="validateField('phone')"
                    @input="clearContactErrors"
                  />
                  <p v-if="errors.phone" class="field-error-text">{{ errors.phone }}</p>
                </div>
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

                <div class="checkout-grid-span">
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
              </div>
            </div>

            <div class="checkout-section checkout-smart-parser">
              <div class="checkout-section-head">
                <h2>{{ checkoutCopy.smartAddressTitle }}</h2>
              </div>

              <div class="checkout-stack">
                <textarea
                  v-model.trim="addressPaste"
                  class="field textarea"
                  :placeholder="checkoutCopy.smartAddressPlaceholder"
                  @input="clearAddressParseMessages"
                />

                <div class="checkout-smart-actions">
                  <button class="secondary-button inline-button" type="button" @click="parseSmartAddress">
                    {{ checkoutCopy.parseAddress }}
                  </button>
                  <span v-if="addressParseMessage" class="helper">{{ addressParseMessage }}</span>
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
    contactTitle: '联系方式',
    emailPlaceholder: '邮箱（可选，手机号与邮箱填写任意一个即可）',
    phonePlaceholder: '手机号（可选，手机号与邮箱填写任意一个即可）',
    deliveryTitle: '收货地址',
    smartAddressTitle: '智能拆分地址',
    smartAddressPlaceholder:
      "粘贴完整地址，例如：Yacine Belkedrouci, 7 Avenue de l'Appel du 18 Juin 1940, Appt A22, 77100 Meaux, France",
    parseAddress: '智能拆分',
    parseAddressSuccess: '地址已自动拆分到上方字段。',
    parseAddressFailed: '未能完整识别地址，请检查后手动调整。',
    countryPlaceholder: '国家 / 地区',
    firstNamePlaceholder: '名字（选填）',
    lastNamePlaceholder: '姓氏',
    addressPlaceholder: '详细地址',
    apartmentPlaceholder: '公寓、楼层、门牌号（选填）',
    cityPlaceholder: '城市',
    statePlaceholder: '省 / 州 / 区域',
    zipPlaceholder: '邮编',
    submit: '提交订单',
    success: '订单提交成功，已同步到用户中心。',
    empty: '请先添加商品后再结算。',
    summaryTitle: '订单摘要',
    sizeLabel: '尺码',
    errors: {
      contactRequired: '邮箱和手机号至少填写一个',
      emailFormat: '请输入有效的邮箱地址',
      phoneFormat: '请输入有效的手机号',
      country: '请选择国家 / 地区',
      lastName: '请填写姓氏',
      address: '请填写详细地址',
      city: '请填写城市',
      state: '请填写省 / 州 / 区域',
      zip: '请填写邮编',
      zipFormat: '请输入有效的邮编',
    },
  },
  en: {
    title: 'Checkout',
    contactTitle: 'Contact',
    emailPlaceholder: 'Email (optional if phone is filled)',
    phonePlaceholder: 'Phone number (optional if email is filled)',
    deliveryTitle: 'Delivery Address',
    smartAddressTitle: 'Smart Address Fill',
    smartAddressPlaceholder:
      "Paste a full address, for example: Yacine Belkedrouci, 7 Avenue de l'Appel du 18 Juin 1940, Appt A22, 77100 Meaux, France",
    parseAddress: 'Auto Fill Address',
    parseAddressSuccess: 'The address has been split into the fields above.',
    parseAddressFailed: 'We could not fully parse this address. Please adjust the fields manually.',
    countryPlaceholder: 'Country / Region',
    firstNamePlaceholder: 'First name (optional)',
    lastNamePlaceholder: 'Last name',
    addressPlaceholder: 'Address',
    apartmentPlaceholder: 'Apartment, suite, etc. (optional)',
    cityPlaceholder: 'City',
    statePlaceholder: 'State / Province / Region',
    zipPlaceholder: 'ZIP / Postal code',
    submit: 'Submit Order',
    success: 'Order submitted successfully. You can review it in your account.',
    empty: 'Please add products to your cart before checkout.',
    summaryTitle: 'Order Summary',
    sizeLabel: 'Size',
    errors: {
      contactRequired: 'Please enter either an email or a phone number',
      emailFormat: 'Please enter a valid email address',
      phoneFormat: 'Please enter a valid phone number',
      country: 'Please select a country or region',
      lastName: 'Please enter your last name',
      address: 'Please enter the address',
      city: 'Please enter the city',
      state: 'Please enter the state, province, or region',
      zip: 'Please enter the ZIP or postal code',
      zipFormat: 'Please enter a valid ZIP or postal code',
    },
  },
  fr: {
    title: 'Paiement',
    contactTitle: 'Contact',
    emailPlaceholder: 'E-mail (optionnel si telephone rempli)',
    phonePlaceholder: 'Telephone (optionnel si e-mail rempli)',
    deliveryTitle: 'Adresse de livraison',
    smartAddressTitle: 'Remplissage intelligent',
    smartAddressPlaceholder:
      "Collez une adresse complete, par exemple : Yacine Belkedrouci, 7 Avenue de l'Appel du 18 Juin 1940, Appt A22, 77100 Meaux, France",
    parseAddress: 'Remplir automatiquement',
    parseAddressSuccess: "L'adresse a ete repartie dans les champs ci-dessus.",
    parseAddressFailed: "L'adresse n'a pas pu etre reconnue completement. Veuillez corriger manuellement.",
    countryPlaceholder: 'Pays / Region',
    firstNamePlaceholder: 'Prenom (optionnel)',
    lastNamePlaceholder: 'Nom',
    addressPlaceholder: 'Adresse',
    apartmentPlaceholder: 'Appartement, suite, etc. (optionnel)',
    cityPlaceholder: 'Ville',
    statePlaceholder: 'Etat / Province / Region',
    zipPlaceholder: 'Code postal',
    submit: 'Envoyer la commande',
    success: 'Commande envoyee avec succes. Vous pouvez la voir dans votre compte.',
    empty: 'Ajoutez des produits au panier avant le paiement.',
    summaryTitle: 'Resume de commande',
    sizeLabel: 'Taille',
    errors: {
      contactRequired: 'Veuillez saisir un e-mail ou un numero de telephone',
      emailFormat: 'Veuillez saisir une adresse e-mail valide',
      phoneFormat: 'Veuillez saisir un numero de telephone valide',
      country: 'Veuillez selectionner un pays ou une region',
      lastName: 'Veuillez saisir votre nom',
      address: "Veuillez saisir l'adresse",
      city: 'Veuillez saisir la ville',
      state: 'Veuillez saisir la region',
      zip: 'Veuillez saisir le code postal',
      zipFormat: 'Veuillez saisir un code postal valide',
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

const REGION_HINTS = {
  France: 'Ile-de-France',
}

const submitting = ref(false)
const successMessage = ref('')
const addressPaste = ref('')
const addressParseMessage = ref('')
const errors = reactive({
  email: '',
  phone: '',
  country: '',
  lastName: '',
  address: '',
  city: '',
  state: '',
  zip: '',
})

const form = reactive({
  email: auth.user?.email || '',
  marketingOptIn: false,
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

const checkoutCopy = computed(() => checkoutCopyByLocale[locale.current] || checkoutCopyByLocale.en)
const countryOptions = computed(() => countryOptionMap[locale.current] || countryOptionMap.en)

const formattedSubtotal = computed(() =>
  new Intl.NumberFormat(locale.current === 'fr' ? 'fr-FR' : locale.current === 'zh' ? 'zh-CN' : 'en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(cart.subtotal)
)

function clearFieldError(field) {
  errors[field] = ''
}

function clearContactErrors() {
  errors.email = ''
  errors.phone = ''
}

function clearAddressParseMessages() {
  addressParseMessage.value = ''
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function isPhone(value) {
  return /^[0-9+\-\s()]{6,}$/.test(value)
}

function normalizeCountryValue(value) {
  const normalized = String(value || '').trim().toLowerCase()
  const match = countryOptionMap.en.find((item) => item.value.toLowerCase() === normalized)
  return match?.value || value.trim()
}

function guessRegion(country, zip) {
  if (country === 'France') {
    return REGION_HINTS.France
  }
  return ''
}

function validateContactFields() {
  const email = form.email.trim()
  const phone = form.phone.trim()

  clearContactErrors()

  if (!email && !phone) {
    errors.email = checkoutCopy.value.errors.contactRequired
    errors.phone = checkoutCopy.value.errors.contactRequired
    return false
  }

  if (email && !isEmail(email)) {
    errors.email = checkoutCopy.value.errors.emailFormat
  }

  if (phone && !isPhone(phone)) {
    errors.phone = checkoutCopy.value.errors.phoneFormat
  }

  return !errors.email && !errors.phone
}

function validateField(field) {
  const value = String(form[field] || '').trim()

  if (field === 'email' || field === 'phone') {
    return validateContactFields()
  }
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
  return true
}

function validateForm() {
  const fields = ['email', 'phone', 'country', 'lastName', 'address', 'city', 'state', 'zip']
  return fields.every((field) => validateField(field))
}

function parseZipAndCity(value) {
  const zipFirst = value.match(/^([A-Za-z0-9-]{3,12})\s+(.+)$/)
  if (zipFirst) {
    return {
      zip: zipFirst[1].trim(),
      city: zipFirst[2].trim(),
    }
  }

  const cityFirst = value.match(/^(.+?)\s+([A-Za-z0-9-]{3,12})$/)
  if (cityFirst) {
    return {
      city: cityFirst[1].trim(),
      zip: cityFirst[2].trim(),
    }
  }

  return {
    city: value.trim(),
    zip: '',
  }
}

function parseSmartAddress() {
  const source = addressPaste.value.trim()
  if (!source) {
    addressParseMessage.value = checkoutCopy.value.parseAddressFailed
    return
  }

  const parts = source
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  if (parts.length < 4) {
    addressParseMessage.value = checkoutCopy.value.parseAddressFailed
    return
  }

  const fullName = parts[0]
  const country = normalizeCountryValue(parts[parts.length - 1] || '')
  const zipCityRaw = parts[parts.length - 2] || ''
  const middleParts = parts.slice(1, -2)
  const apartmentIndex = middleParts.findIndex((item) =>
    /^(apt|appt|apartment|suite|unit|room|floor|#)/i.test(item)
  )
  const apartment = apartmentIndex >= 0 ? middleParts[apartmentIndex] : ''
  const addressParts = middleParts.filter((_, index) => index !== apartmentIndex)
  const address = addressParts.join(', ')
  const { city, zip } = parseZipAndCity(zipCityRaw)

  const nameParts = fullName.split(/\s+/).filter(Boolean)
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : fullName
  const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : ''

  form.firstName = firstName
  form.lastName = lastName
  form.address = address || form.address
  form.apartment = apartment || form.apartment
  form.city = city || form.city
  form.zip = zip || form.zip
  form.country = country || form.country
  form.state = guessRegion(country, zip) || form.state

  clearFieldError('country')
  clearFieldError('lastName')
  clearFieldError('address')
  clearFieldError('city')
  clearFieldError('state')
  clearFieldError('zip')
  addressParseMessage.value = checkoutCopy.value.parseAddressSuccess
}

async function handleSubmit() {
  if (!cart.items.length || !validateForm()) return

  submitting.value = true
  successMessage.value = ''
  catalog.clearMessages()

  try {
    const order = await catalog.createOrder({
      contact: {
        value: form.email,
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
    router.push('/account/orders')
  } finally {
    submitting.value = false
  }
}
</script>
