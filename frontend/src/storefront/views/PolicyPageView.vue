<template>
  <section class="policy-page">
    <div class="container policy-container">
      <p class="eyebrow">{{ page.eyebrow }}</p>
      <h1>{{ page.title }}</h1>
      <p class="policy-intro">{{ page.intro }}</p>

      <div class="policy-card">
        <section v-for="section in page.sections" :key="section.heading" class="policy-section">
          <h2>{{ section.heading }}</h2>
          <p v-for="paragraph in section.paragraphs || []" :key="paragraph">{{ paragraph }}</p>
          <ul v-if="section.items?.length">
            <li v-for="item in section.items" :key="item">{{ item }}</li>
          </ul>
        </section>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const brandName = 'Swawell'
const contactEmail = 'business@smawell.shop'
const contactPhone = '+86 20 8888 6688'
const contactAddress = 'Guangzhou, China'

const pages = {
  'about-us': {
    eyebrow: 'ABOUT SWAWELL',
    title: 'About Us',
    intro: 'Swawell is an online fashion store focused on reliable apparel products, clear product presentation, and a smooth buying experience.',
    sections: [
      {
        heading: 'Who We Are',
        paragraphs: [
          `${brandName} provides fashion and apparel products for customers who need practical styles, clear sizing, and stable product availability.`,
          'We focus on presenting products in a clean storefront with easy category browsing, visible inventory, and a straightforward order process.',
        ],
      },
      {
        heading: 'What We Offer',
        paragraphs: [
          'Our collections include modern fashion essentials, seasonal styles, and apparel products suitable for everyday wear and commercial assortment planning.',
        ],
        items: ['Fashion apparel', 'Clear product details', 'Stable stock information', 'Responsive customer support'],
      },
      {
        heading: 'Our Commitment',
        paragraphs: [
          'We aim to provide dependable products, transparent communication, and a better shopping experience from product browsing to order support.',
        ],
      },
    ],
  },
  contact: {
    eyebrow: 'CUSTOMER SUPPORT',
    title: 'Contact Us',
    intro: 'If you have questions about products, orders, shipping, or returns, please contact us. We usually reply within 1-2 business days.',
    sections: [
      {
        heading: 'Contact Information',
        items: [`Email: ${contactEmail}`, `Phone: ${contactPhone}`, `Address: ${contactAddress}`],
      },
      {
        heading: 'Support Topics',
        paragraphs: ['Please include your order number when contacting us about an existing order so we can help you faster.'],
        items: ['Product details and sizing', 'Order status', 'Shipping information', 'Return and refund requests'],
      },
    ],
  },
  'privacy-policy': {
    eyebrow: 'LEGAL',
    title: 'Privacy Policy',
    intro: 'Swawell respects your privacy and is committed to protecting your personal information.',
    sections: [
      {
        heading: 'Information We Collect',
        paragraphs: ['We may collect information you provide when you visit our website, create an account, place an order, or contact customer support.'],
        items: ['Name and contact information', 'Shipping and billing address', 'Order history', 'Device and browser information'],
      },
      {
        heading: 'How We Use Information',
        items: ['Process and deliver orders', 'Provide customer support', 'Send order updates', 'Improve website performance and services', 'Prevent fraud and unauthorized activity'],
      },
      {
        heading: 'Information Sharing',
        paragraphs: ['We do not sell your personal information. We may share necessary information with trusted service providers such as payment processors, shipping carriers, and website service partners.'],
      },
      {
        heading: 'Cookies',
        paragraphs: ['We may use cookies to improve browsing, remember preferences, and analyze website traffic.'],
      },
      {
        heading: 'Contact',
        paragraphs: [`For privacy questions, please contact us at ${contactEmail}.`],
      },
    ],
  },
  'terms-of-service': {
    eyebrow: 'LEGAL',
    title: 'Terms of Service',
    intro: 'By using Swawell, you agree to the following terms and conditions.',
    sections: [
      {
        heading: 'General Terms',
        paragraphs: ['All products and services are subject to availability. We may update or modify website content, pricing, and policies when necessary.'],
      },
      {
        heading: 'Orders',
        paragraphs: ['When placing an order, you agree that the information you provide is accurate and complete. We may cancel or refuse orders when necessary, including suspected fraud or incorrect information.'],
      },
      {
        heading: 'Pricing and Product Information',
        paragraphs: ['We make reasonable efforts to keep product information accurate. Prices, product details, and availability may change without notice.'],
      },
      {
        heading: 'Intellectual Property',
        paragraphs: ['Website content, including images, text, logos, and product descriptions, belongs to Swawell or its partners and may not be used without permission.'],
      },
      {
        heading: 'Contact',
        paragraphs: [`For questions about these terms, please contact ${contactEmail}.`],
      },
    ],
  },
  'shipping-policy': {
    eyebrow: 'CUSTOMER SERVICE',
    title: 'Shipping Policy',
    intro: 'We aim to process and ship orders as quickly as possible after order confirmation.',
    sections: [
      {
        heading: 'Processing Time',
        paragraphs: ['Orders are usually processed within 1-3 business days after confirmation. Processing time may vary during holidays or peak seasons.'],
      },
      {
        heading: 'Estimated Shipping Time',
        items: ['Standard Shipping: 7-15 business days', 'Express Shipping: 3-7 business days'],
      },
      {
        heading: 'Shipping Cost',
        paragraphs: ['Shipping fees depend on destination, shipment method, and order details. Any applicable shipping cost will be confirmed during the order process.'],
      },
      {
        heading: 'Tracking',
        paragraphs: ['When tracking information is available, we will provide it to help you follow the shipment status.'],
      },
      {
        heading: 'Important Notes',
        paragraphs: ['Please make sure your shipping address is correct before submitting an order. Delivery times may be affected by customs, holidays, weather, or carrier delays.'],
      },
    ],
  },
  'return-refund-policy': {
    eyebrow: 'CUSTOMER SERVICE',
    title: 'Return & Refund Policy',
    intro: 'We want you to be satisfied with your purchase. If there is an issue with your order, please contact us and we will do our best to help.',
    sections: [
      {
        heading: 'Return Eligibility',
        paragraphs: ['Returns may be accepted within 14 days of receiving your order, depending on the product condition and reason for return.'],
        items: ['Items must be unused', 'Items must be unwashed', 'Items must be in original packaging when possible', 'Tags and original accessories should be included when applicable'],
      },
      {
        heading: 'Non-Returnable Items',
        items: ['Customized items', 'Final sale items', 'Items damaged due to misuse', 'Items without required return approval'],
      },
      {
        heading: 'Refunds',
        paragraphs: ['After the returned item is received and inspected, we will notify you of the refund status. Approved refunds will be issued to the original payment method when possible.'],
      },
      {
        heading: 'How to Request a Return',
        paragraphs: [`Please email ${contactEmail} with your order number, reason for return, and photos if the item is damaged or defective.`],
      },
    ],
  },
  faq: {
    eyebrow: 'HELP CENTER',
    title: 'FAQ',
    intro: 'Find quick answers to common questions about Swawell products, orders, and shipping.',
    sections: [
      { heading: 'How long does shipping take?', paragraphs: ['Standard shipping usually takes 7-15 business days, while express shipping usually takes 3-7 business days.'] },
      { heading: 'How can I track my order?', paragraphs: ['When tracking information is available, we will provide it with your order update.'] },
      { heading: 'Can I change my shipping address?', paragraphs: ['Please contact us as soon as possible. If the order has not been shipped, we may be able to update the address.'] },
      { heading: 'How do I contact customer support?', paragraphs: [`You can contact us at ${contactEmail}.`] },
    ],
  },
}

const route = useRoute()
const page = computed(() => pages[route.params.slug] || pages['about-us'])
</script>
