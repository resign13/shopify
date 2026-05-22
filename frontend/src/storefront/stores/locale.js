import { defineStore } from 'pinia'

import { translations } from '../translations'

const STORAGE_KEY = 'lumiere-locale'
const SUPPORTED = ['zh', 'en']

function getByPath(source, path) {
  return path.split('.').reduce((result, key) => result?.[key], source)
}

function detectInitialLocale() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (SUPPORTED.includes(saved)) return saved
  } catch {
    // ignore
  }

  if (typeof navigator !== 'undefined') {
    const lang = String(navigator.language || '').toLowerCase()
    if (lang.startsWith('zh')) return 'zh'
  }

  return 'en'
}

export const useLocaleStore = defineStore('locale', {
  state: () => ({
    current: detectInitialLocale(),
    supported: [
      { code: 'zh', label: '中文' },
      { code: 'en', label: 'EN' },
    ],
  }),
  actions: {
    setLanguage(code) {
      const next = SUPPORTED.includes(code) ? code : 'en'
      this.current = next
      localStorage.setItem(STORAGE_KEY, next)
    },
    t(path) {
      const pack = translations[this.current] || translations.en
      return getByPath(pack, path) ?? getByPath(translations.en, path) ?? path
    },
  },
})
