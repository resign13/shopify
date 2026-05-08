<template>
  <section class="home-page">
    <div class="container home-body-stack">
      <section class="home-search-section">
        <form class="home-search-bar" @submit.prevent="submitHomeSearch">
          <input
            v-model.trim="homeSearchDraft"
            class="field home-search-input"
            type="search"
            :placeholder="locale.t('common.search')"
          />
          <button class="home-search-button" type="submit">
            {{ locale.t('nav.search') }}
          </button>
        </form>
      </section>
    </div>

    <section class="home-hero-section">
      <div v-if="showHomeSkeleton" class="container home-hero-tabs home-hero-tabs-skeleton">
        <span v-for="item in heroTabSkeletons" :key="item" class="skeleton-button home-hero-tab-skeleton"></span>
      </div>

      <div v-else class="container home-hero-tabs">
        <button
          v-for="(slide, index) in heroSlides"
          :key="slide.slotKey"
          :class="['home-hero-tab', { active: index === currentSlide }]"
          type="button"
          @click="setSlide(index)"
        >
          {{ slide.tabLabel }}
        </button>
      </div>

      <section class="container home-hero-shell home-hero-shell-full">
        <div v-if="showHomeSkeleton" class="home-hero-skeleton">
          <div class="skeleton-media home-hero-skeleton-media"></div>
        </div>

        <template v-else>
          <article
          v-for="(slide, index) in heroSlides"
          :key="slide.slotKey"
          :class="['home-hero-slide', { active: index === currentSlide }]"
          role="link"
          tabindex="0"
          @click="handleHeroClick(slide.slotKey)"
          @keydown.enter.prevent="handleHeroClick(slide.slotKey)"
          @keydown.space.prevent="handleHeroClick(slide.slotKey)"
        >
          <LazyImage
            :src="slide.image"
            :alt="slide.title"
            wrapper-class="home-hero-media"
            img-class="home-hero-image"
            :eager="index === 0"
          />
          </article>

          <button
            v-if="heroSlides.length > 1"
            class="home-hero-nav home-hero-nav-prev"
            type="button"
            aria-label="Previous slide"
            @click.stop="goPrev"
          >
            <span aria-hidden="true">&#8249;</span>
          </button>

          <button
            v-if="heroSlides.length > 1"
            class="home-hero-nav home-hero-nav-next"
            type="button"
            aria-label="Next slide"
            @click.stop="goNext"
          >
            <span aria-hidden="true">&#8250;</span>
          </button>

          <div v-if="heroSlides.length > 1" class="home-hero-progress">
            <button
              v-for="(slide, index) in heroSlides"
              :key="`${slide.slotKey}-progress`"
              :class="['home-hero-progress-item', { active: index === currentSlide }]"
              type="button"
              @click="setSlide(index)"
            >
              <span></span>
            </button>
          </div>
        </template>
      </section>
    </section>

    <div class="container home-body-stack">
      <section v-if="showHomeSkeleton" class="home-category-strip home-category-strip-top">
        <article
          v-for="item in categorySkeletons"
          :key="item"
          class="home-category-card home-category-card-top home-category-card-skeleton"
        >
          <div class="skeleton-media home-category-skeleton-media"></div>
        </article>
      </section>

      <section v-else class="home-category-strip home-category-strip-top">
        <RouterLink
          v-for="card in categoryCards"
          :key="card.key"
          class="home-category-card home-category-card-top"
          :to="card.to"
        >
          <LazyImage :src="card.image" :alt="card.label" aspect-ratio="1 / 0.72" />
          <div class="home-category-overlay">
            <strong>{{ card.label }}</strong>
            <span>{{ card.caption }}</span>
          </div>
        </RouterLink>
      </section>

      <section
        v-for="section in productSections"
        :id="section.id"
        :key="section.key"
        class="home-best-seller"
      >
        <div class="section-title-row">
          <h2>{{ section.title }}</h2>
          <RouterLink class="text-link" :to="section.viewAllPath">{{ homeCopy.viewAll }}</RouterLink>
        </div>

        <div v-if="showHomeSkeleton" class="home-product-grid skeleton-grid">
          <article v-for="item in productSkeletons" :key="`${section.key}-${item}`" class="product-card skeleton-product-card">
            <div class="product-card-media skeleton-media"></div>
            <div class="product-card-copy skeleton-product-copy">
              <span class="skeleton-line skeleton-line-lg"></span>
              <span class="skeleton-line skeleton-line-sm"></span>
              <span class="skeleton-line skeleton-line-xs"></span>
            </div>
          </article>
        </div>
        <div v-else class="home-product-grid">
          <ProductCard
            v-for="product in section.products"
            :key="`${section.key}-${product.id}`"
            :product="product"
            :show-badge="false"
          />
        </div>
      </section>

      <section v-if="showHomeSkeleton" id="about" class="home-brand-section home-brand-skeleton">
        <article class="home-brand-copy">
          <span class="skeleton-line skeleton-line-xs"></span>
          <span class="skeleton-line skeleton-line-title"></span>
          <span class="skeleton-line skeleton-line-lg"></span>
          <span class="skeleton-line skeleton-line-md"></span>
          <span class="skeleton-line skeleton-line-lg"></span>
          <span class="skeleton-line skeleton-line-md"></span>
        </article>

        <article class="home-brand-stats">
          <div class="home-stat-list">
            <div v-for="item in statSkeletons" :key="item" class="home-stat-item skeleton-stat-item">
              <span class="skeleton-line skeleton-line-number"></span>
              <span class="skeleton-line skeleton-line-sm"></span>
            </div>
          </div>
        </article>
      </section>

      <section v-else id="about" class="home-brand-section">
        <article class="home-brand-copy">
          <p class="eyebrow">{{ homeCopy.storyTitle }}</p>
          <span class="home-brand-rule"></span>
          <div class="home-brand-body">
            <p class="home-brand-lead">{{ conciseBrandStoryParagraphs[0] }}</p>
            <p v-for="paragraph in conciseBrandStoryParagraphs.slice(1)" :key="paragraph">{{ paragraph }}</p>
          </div>
        </article>

        <article class="home-brand-stats">
          <div class="home-stat-list">
            <div v-for="stat in visibleStats" :key="stat.label" class="home-stat-item">
              <strong>{{ stat.value }}</strong>
              <span>{{ stat.label }}</span>
            </div>
          </div>
        </article>
      </section>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import LazyImage from '../components/LazyImage.vue'
import ProductCard from '../components/ProductCard.vue'
import { useCatalogStore } from '../stores/catalog'
import { useLocaleStore } from '../stores/locale'

const catalog = useCatalogStore()
const locale = useLocaleStore()
const router = useRouter()
const currentSlide = ref(0)
const homeSearchDraft = ref('')
const homeResolved = ref(false)
const heroTabSkeletons = [1, 2, 3]
const categorySkeletons = [1, 2, 3, 4, 5]
const productSkeletons = [1, 2, 3, 4, 5]
const statSkeletons = [1, 2]
const sectionSlugByKey = {
  bestSeller: 'best-seller',
  newArrival: 'new-arrival',
  specialPrice: 'special-price',
}

const brandStoryByLocale = {
  zh: {
    paragraphs: [
      'GINGTTO 诞生于对现代服饰长期而细致的观察。我们相信，一件真正有生命力的产品，不只是短暂追随潮流的视觉样本，而是能够在版型、面料、颜色、穿着体验与供货稳定性之间找到平衡。正因为如此，品牌从创立之初就没有把自己限定在单一品类之中，而是逐步建立起同时覆盖男装与女装的产品结构，希望让客户在同一个站点里就能完成更完整的风格筛选与采购判断。',
      '在产品思路上，GINGTTO 更重视能够被长期复用的核心款体系。无论是适合日常通勤的裤装、具备清晰轮廓的上衣、具有基础销量能力的丹宁单品，还是适合季节切换的外套系列，我们都希望它们不仅好看，而且真正具备进入市场、反复成交和持续复购的能力。对于采购客户来说，这意味着更清晰的分类结构、更稳定的上新节奏，以及更容易搭建系列组合的商品矩阵。',
      '除了产品本身，GINGTTO 也同样重视品牌表达。我们希望客户打开站点时，不只是看到一组散落的商品图，而是能够迅速感知到品牌审美、商业成熟度以及交付能力。因此首页围绕品牌海报、分类导航、热销与上新模块、库存展示和下单链路进行组织，让浏览、判断与下单三个动作更顺畅地连接在一起。对我们来说，这不仅是一个商城页面，更是品牌与客户建立信任的第一层窗口。',
    ],
    quote: 'Designed for modern wardrobes, built for lasting business.',
  },
  en: {
    paragraphs: [
      'GINGTTO was built from a long-term view of modern apparel. We believe strong products should do more than follow short-lived trends. They should balance silhouette, fabric, color, comfort and supply stability in a way that makes them commercially meaningful over time. That is why the brand was never limited to a single narrow category, and why the storefront now brings together both menswear and womenswear in one more complete merchandise structure.',
      'From a product perspective, GINGTTO focuses on building a repeatable core assortment. Whether it is pants for everyday business-casual use, tops with cleaner silhouettes, denim with dependable turnover, or outerwear suited to seasonal transitions, the goal is not only to create pieces that look good, but pieces that can support real sell-through and ongoing replenishment. For buyers, this means a clearer category system, a steadier launch rhythm, and a more usable product matrix for assortment planning.',
      'At the same time, GINGTTO treats presentation as part of the product itself. We want buyers to understand the brand quickly the moment they enter the site, not just scroll through disconnected item cards. That is why the homepage is organized around hero imagery, category navigation, best-seller and new-arrival modules, visible inventory and a smoother order flow. The storefront is meant to function not only as a sales page, but as the first layer of trust between the brand and its customers.',
    ],
    quote: 'Designed for modern wardrobes, built for lasting business.',
  },
  fr: {
    paragraphs: [
      'GINGTTO est ne d une vision a long terme du vestiaire moderne. Nous pensons qu un bon produit ne doit pas seulement suivre une tendance passagere, mais trouver un vrai point d equilibre entre coupe, matiere, couleur, confort et stabilite d approvisionnement. C est pour cette raison que la marque ne s est jamais limitee a une seule famille de produits et qu elle rassemble aujourd hui menswear et womenswear dans une structure plus complete.',
      'Sur le plan produit, GINGTTO privilegie une base de styles durables et repetables. Qu il s agisse de pantalons adaptes au quotidien, de tops aux lignes plus nettes, de denim capable de soutenir une rotation reguliere, ou d outerwear pense pour les transitions de saison, l objectif est de proposer des pieces qui ne sont pas seulement visuellement fortes, mais aussi commercialement solides. Pour les acheteurs, cela signifie une lecture plus claire du catalogue et une construction de collection plus efficace.',
      'La marque accorde egalement une grande importance a la presentation. Nous voulons que le client comprenne rapidement l univers GINGTTO des son entree sur le site, au lieu de voir seulement une suite d images produit sans lien. C est pourquoi la homepage relie direction visuelle, navigation par categorie, modules best-seller et new-arrival, informations de stock et parcours de commande dans un meme flux. Le storefront devient ainsi un outil de vente, mais aussi un premier niveau de confiance entre la marque et ses clients.',
    ],
    quote: 'Designed for modern wardrobes, built for lasting business.',
  },
}

const conciseBrandStoryByLocale = {
  zh: {
    paragraphs: [
      'GINGTTO 专注现代服饰，以清晰版型、稳定供应和统一视觉服务男装与女装采购需求。',
      '我们希望客户进入站点后，能快速理解品牌风格，清晰浏览核心品类，并通过直观库存与顺畅流程完成更高效的选品与下单。',
    ],
    quote: 'Modern apparel, steady supply.',
  },
  en: {
    paragraphs: [
      'GINGTTO focuses on modern apparel with cleaner silhouettes, steadier supply and a more unified presentation across menswear and womenswear.',
      'The storefront is designed to help buyers understand the brand quickly, browse key categories with clarity, and move through inventory and ordering with less friction.',
    ],
    quote: 'Modern apparel, steady supply.',
  },
  fr: {
    paragraphs: [
      'GINGTTO se concentre sur un vestiaire moderne avec des lignes plus nettes, une offre plus stable et une presentation plus coherente pour menswear et womenswear.',
      'Le storefront aide les acheteurs a comprendre rapidement la marque, parcourir les categories essentielles et avancer plus facilement entre stock visible et commande.',
    ],
    quote: 'Modern apparel, steady supply.',
  },
}

const copyByLocale = {
  zh: {
    title: '兼顾男装与女装的现代服饰品牌站',
    storyTitle: 'Brand Story',
    storyText: 'GINGTTO 通过更接近独立站的首页结构，展示品牌海报、分类能力、热销与特价商品，帮助客户快速完成浏览与下单。',
    storyQuote: 'Modern apparel, stable supply, stronger presentation.',
    strengthCards: [
      { title: '首页模块可后台配置', text: '轮播海报、分类条与三组商品模块都可以在后台统一控制。' },
      { title: '男女装并行展示', text: '首页同时覆盖 womenswear、menswear、pants、denim 与 outerwear。' },
      { title: '下单直达后台', text: '购物车结算后的订单会直接同步到后台管理端继续跟进。' },
    ],
    tabs: {
      bestSeller: 'BEST SELLER',
      newArrival: 'NEW ARRIVAL',
      specialPrice: 'PRE-ORDER',
    },
    sectionTitles: {
      bestSeller: 'BEST SELLER',
      newArrival: 'NEW ARRIVAL',
      specialPrice: 'PRE-ORDER',
    },
    fallbackOverlines: {
      bestSeller: 'BEST SELLER',
      newArrival: 'NEW ARRIVAL',
      specialPrice: 'PRE-ORDER',
    },
    fallbackTitles: {
      bestSeller: '展示当前最值得主推的热销款式',
      newArrival: '展示本季重点上新的最新商品',
      specialPrice: '突出展示适合成交转化的特价商品',
    },
    fallbackTexts: {
      bestSeller: '通过整屏海报把热销模块直接引导到首页核心区域。',
      newArrival: '通过清晰的上新区块，帮助客户更快锁定新品。',
      specialPrice: '把优惠商品集中展示，方便买家快速进入询盘与下单。',
    },
    shopNow: 'SHOP NOW',
    viewAll: '查看全部',
    categoryCaptions: {
      womenswear: 'Blouses and elevated tops',
      menswear: 'Core tees and polos',
      pants: 'Tailored and relaxed silhouettes',
      denim: 'Washed fits and daily staples',
      outerwear: 'Sets, jackets and layers',
    },
  },
  en: {
    title: 'A modern apparel storefront for womenswear and menswear',
    storyTitle: 'Brand Story',
    storyText: 'GINGTTO uses a more premium homepage structure to present banners, category navigation, best sellers and special-price products in one clean storefront flow.',
    storyQuote: 'Modern apparel, stable supply, stronger presentation.',
    strengthCards: [
      { title: 'Admin-Controlled Homepage', text: 'Hero banners, category strip and all 3 product modules can be managed from the admin system.' },
      { title: 'Women + Men Categories', text: 'The homepage now covers womenswear, menswear, pants, denim and outerwear together.' },
      { title: 'Direct Order Sync', text: 'Cart checkout still pushes orders straight into the backend workflow.' },
    ],
    tabs: {
      bestSeller: 'BEST SELLER',
      newArrival: 'NEW ARRIVAL',
      specialPrice: 'PRE-ORDER',
    },
    sectionTitles: {
      bestSeller: 'BEST SELLER',
      newArrival: 'NEW ARRIVAL',
      specialPrice: 'PRE-ORDER',
    },
    fallbackOverlines: {
      bestSeller: 'BEST SELLER',
      newArrival: 'NEW ARRIVAL',
      specialPrice: 'PRE-ORDER',
    },
    fallbackTitles: {
      bestSeller: 'Lead with your strongest best-selling styles',
      newArrival: 'Spotlight the latest arrivals from the current season',
      specialPrice: 'Use special-price products to push faster conversion',
    },
    fallbackTexts: {
      bestSeller: 'Guide buyers from the hero directly into the best-selling product block.',
      newArrival: 'Keep the homepage fresh with a dedicated new-arrival section.',
      specialPrice: 'Use a focused sale block to support promotional conversion.',
    },
    shopNow: 'SHOP NOW',
    viewAll: 'View All',
    categoryCaptions: {
      womenswear: 'Blouses and elevated tops',
      menswear: 'Core tees and polos',
      pants: 'Tailored and relaxed silhouettes',
      denim: 'Washed fits and daily staples',
      outerwear: 'Sets, jackets and layers',
    },
  },
  fr: {
    title: 'Une boutique apparel moderne pour femme et homme',
    storyTitle: 'Brand Story',
    storyText: 'GINGTTO adopte une structure de homepage plus premium pour montrer les bannières, les categories et trois blocs produits dans un flux plus net.',
    storyQuote: 'Modern apparel, stable supply, stronger presentation.',
    strengthCards: [
      { title: 'Homepage geree en back-office', text: 'Les bannières hero, la bande categorie et les 3 modules produits sont configures depuis l admin.' },
      { title: 'Femme + Homme', text: 'La homepage couvre ensemble womenswear, menswear, pants, denim et outerwear.' },
      { title: 'Commande sync admin', text: 'Le panier et le checkout restent relies au back-office pour le suivi.' },
    ],
    tabs: {
      bestSeller: 'BEST SELLER',
      newArrival: 'NEW ARRIVAL',
      specialPrice: 'PRE-ORDER',
    },
    sectionTitles: {
      bestSeller: 'BEST SELLER',
      newArrival: 'NEW ARRIVAL',
      specialPrice: 'PRE-ORDER',
    },
    fallbackOverlines: {
      bestSeller: 'BEST SELLER',
      newArrival: 'NEW ARRIVAL',
      specialPrice: 'PRE-ORDER',
    },
    fallbackTitles: {
      bestSeller: 'Mettez en avant vos meilleurs best-sellers',
      newArrival: 'Montrez clairement les nouveautés de la saison',
      specialPrice: 'Utilisez les prix speciaux pour accelerer la conversion',
    },
    fallbackTexts: {
      bestSeller: 'Guide les acheteurs du hero vers le bloc produit le plus fort.',
      newArrival: 'Gardez la homepage dynamique avec un bloc nouveautes.',
      specialPrice: 'Un bloc promotionnel dedie aide a pousser les ventes.',
    },
    shopNow: 'SHOP NOW',
    viewAll: 'Voir tout',
    categoryCaptions: {
      womenswear: 'Blouses et tops premium',
      menswear: 'Tees et polos essentiels',
      pants: 'Coupes tailorees et detendues',
      denim: 'Denim du quotidien',
      outerwear: 'Vestes, sets et couches',
    },
  },
}

const categoryMedia = {
  womenswear: '/media/storefront/womenswear-blouse-1.jpg',
  menswear: '/media/storefront/menswear-white-tee.jpg',
  pants: '/media/storefront/womenswear-pants-1.jpg',
  denim: '/media/storefront/womenswear-denim-1.jpg',
  outerwear: '/media/storefront/outerwear-leather-2.jpg',
}

const homeCopy = computed(() => copyByLocale[locale.current] || copyByLocale.en)
const brandStoryCopy = computed(() => brandStoryByLocale[locale.current] || brandStoryByLocale.en)
const brandStoryParagraphs = computed(() => brandStoryCopy.value.paragraphs)
const brandStoryQuote = computed(() => brandStoryCopy.value.quote)
const conciseBrandStoryCopy = computed(
  () => conciseBrandStoryByLocale[locale.current] || conciseBrandStoryByLocale.en
)
const conciseBrandStoryParagraphs = computed(() => conciseBrandStoryCopy.value.paragraphs)
const conciseBrandStoryQuote = computed(() => conciseBrandStoryCopy.value.quote)
const visibleStats = computed(() => (catalog.stats || []).slice(0, 2))
const sectionOrder = ['bestSeller', 'newArrival', 'specialPrice']
const hasHomeContent = computed(
  () =>
    heroSlides.value.length > 0 ||
    categoryCards.value.length > 0 ||
    productSections.value.some((section) => section.products.length > 0) ||
    visibleStats.value.length > 0
)
const showHomeSkeleton = computed(() => !homeResolved.value && (!hasHomeContent.value || catalog.loading))

const heroSlides = computed(() =>
  sectionOrder.map((key) => {
    const banner = catalog.banners.find((item) => item.slotKey === key) || {}
    return {
      slotKey: key,
      image: banner.image || '',
      overline: homeCopy.value.fallbackOverlines[key],
      title: banner.title || homeCopy.value.fallbackTitles[key],
      text: banner.subtitle || homeCopy.value.fallbackTexts[key],
      ctaLabel: banner.ctaLabel || homeCopy.value.shopNow,
      tabLabel: homeCopy.value.tabs[key],
    }
  }).filter((item) => item.image)
)

const categoryCards = computed(() =>
  (catalog.categories || []).map((card) => ({
    ...card,
    image: categoryMedia[card.key] || categoryMedia.womenswear,
    caption: homeCopy.value.categoryCaptions[card.key] || card.label,
    to: `/shop${card.key ? `?category=${card.key}` : ''}`,
  }))
)

const productSections = computed(() =>
  sectionOrder.map((key) => ({
    key,
    id: sectionId(key),
    title: homeCopy.value.sectionTitles[key],
    viewAllPath: `/collections/${sectionSlugByKey[key]}`,
    products: (catalog.homeSections?.[key] || []).slice(0, 5),
  }))
)

let timer = null

function sectionId(key) {
  return (
    {
      bestSeller: 'best-seller',
      newArrival: 'new-arrival',
      specialPrice: 'special-price',
    }[key] || key
  )
}

function handleHeroClick(key) {
  const slug = sectionSlugByKey[key]
  if (!slug) return
  router.push(`/collections/${slug}`)
}

function submitHomeSearch() {
  const keyword = homeSearchDraft.value.trim()
  router.push({
    path: '/shop',
    query: keyword ? { keyword } : {},
  })
}

function restartRotation() {
  stopRotation()
  startRotation()
}

function setSlide(index) {
  currentSlide.value = index
  restartRotation()
}

function goPrev() {
  if (!heroSlides.value.length) return
  currentSlide.value =
    (currentSlide.value - 1 + heroSlides.value.length) % heroSlides.value.length
  restartRotation()
}

function goNext() {
  if (!heroSlides.value.length) return
  currentSlide.value = (currentSlide.value + 1) % heroSlides.value.length
  restartRotation()
}

function startRotation() {
  stopRotation()
  if (heroSlides.value.length < 2) return
  timer = window.setInterval(() => {
    currentSlide.value = (currentSlide.value + 1) % heroSlides.value.length
  }, 5000)
}

function stopRotation() {
  if (timer) {
    window.clearInterval(timer)
    timer = null
  }
}

async function loadHome() {
  try {
    await catalog.loadHome(locale.current)
    currentSlide.value = 0
    startRotation()
  } finally {
    homeResolved.value = true
  }
}

watch(() => locale.current, loadHome)
watch(
  () => heroSlides.value.length,
  () => {
    if (currentSlide.value >= heroSlides.value.length) {
      currentSlide.value = 0
    }
  }
)

onMounted(() => {
  loadHome()
})

onBeforeUnmount(() => {
  stopRotation()
})
</script>

<style scoped>
#about {
  scroll-margin-top: 120px;
}
</style>
