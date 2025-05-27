import { defaultLanguage } from '@shared/config/constant'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// Original translation
import enUS from './locales/en-us.json'
import jaJP from './locales/ja-jp.json'
import ruRU from './locales/ru-ru.json'
import zhCN from './locales/zh-cn.json'
import zhTW from './locales/zh-tw.json'
// Machine translation
import elGR from './translate/el-gr.json'
import esES from './translate/es-es.json'
import frFR from './translate/fr-fr.json'
import ptPT from './translate/pt-pt.json'

// Define supported languages
export const supportedLanguages = [
  'el-GR',
  'en-US',
  'es-ES',
  'fr-FR',
  'ja-JP',
  'pt-PT',
  'ru-RU',
  'zh-CN',
  'zh-TW'
]

const resources = {
  'el-GR': elGR,
  'en-US': enUS,
  'es-ES': esES,
  'fr-FR': frFR,
  'ja-JP': jaJP,
  'pt-PT': ptPT,
  'ru-RU': ruRU,
  'zh-CN': zhCN,
  'zh-TW': zhTW
}

/**
 * Determines the best language to use based on user preferences and system settings
 * Prioritizes:
 * 1. User's explicitly saved language preference
 * 2. System language if supported
 * 3. Default language (en-US)
 *
 * @returns The language code to use
 */
export const getLanguage = () => {
  // First check if user has explicitly set a language preference
  const savedLanguage = localStorage.getItem('language')
  if (savedLanguage && supportedLanguages.includes(savedLanguage)) {
    return savedLanguage
  }
  
  // Then check browser/system language
  const browserLanguage = navigator.language
  
  // Check if the exact browser language is supported
  if (supportedLanguages.includes(browserLanguage)) {
    return browserLanguage
  }
  
  // Check if we support the language code without region (e.g., 'en' from 'en-GB')
  const languageCode = browserLanguage.split('-')[0]
  const matchingLanguage = supportedLanguages.find(lang => lang.startsWith(languageCode + '-'))
  if (matchingLanguage) {
    return matchingLanguage
  }
  
  // Default to English if no matches
  return defaultLanguage
}

export const getLanguageCode = () => {
  return getLanguage().split('-')[0]
}

i18n.use(initReactI18next).init({
  resources,
  lng: getLanguage(),
  fallbackLng: {
    // Define fallback chain - first try language without region code
    // then fall back to English
    default: [defaultLanguage],
    // For specific languages, define custom fallback chains
    'zh-TW': ['zh-CN', defaultLanguage],
    'zh-HK': ['zh-TW', 'zh-CN', defaultLanguage],
    'pt-BR': ['pt-PT', defaultLanguage],
    'es-419': ['es-ES', defaultLanguage]
  },
  interpolation: {
    escapeValue: false
  },
  // Don't show missing key warnings in console
  nsSeparator: false,
  keySeparator: false,
  // Return key if missing translation
  returnNull: false,
  returnEmptyString: false,
  returnObjects: false,
  saveMissing: false,
  missingKeyHandler: (lng, ns, key) => {
    // In development, log missing keys
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Missing translation key: ${key} for language: ${lng}`)
    }
    return key
  }
})

export default i18n
