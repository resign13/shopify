import { defineStore } from 'pinia'

import { translations } from '../translations'

const STORAGE_KEY = 'lumiere-locale'

function getByPath(source, path) {
  return path.split('.').reduce((result, key) => result?.[key], source)
}

export const useLocaleStore = defineStore('locale', {
  state: () => ({
    current: 'en',
    supported: [{ code: 'en', label: 'EN' }],
  }),
  actions: {
    setLanguage(code) {
      this.current = 'en'
      localStorage.setItem(STORAGE_KEY, 'en')
    },
    t(path) {
      const pack = translations[this.current] || translations.en
      return getByPath(pack, path) ?? getByPath(translations.en, path) ?? path
    },
  },
})
