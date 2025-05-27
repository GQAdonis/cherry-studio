import { defaultLanguage } from '@shared/config/constant'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

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

/**
 * Determines the best language to use based on user preferences and system settings
 */
export const getLanguage = () => {
  const savedLanguage = localStorage.getItem('language')
  if (savedLanguage && supportedLanguages.includes(savedLanguage)) {
    return savedLanguage
  }
  
  const browserLanguage = navigator.language
  if (supportedLanguages.includes(browserLanguage)) {
    return browserLanguage
  }
  
  const languageCode = browserLanguage.split('-')[0]
  const matchingLanguage = supportedLanguages.find(lang => lang.startsWith(languageCode + '-'))
  if (matchingLanguage) {
    return matchingLanguage
  }
  
  return defaultLanguage
}

export const getLanguageCode = () => {
  return getLanguage().split('-')[0]
}

// Load translations dynamically and initialize i18n
const loadTranslations = async () => {
  try {
    // Load all translation files dynamically
    const [enUS, jaJP, ruRU, zhCN, zhTW, elGR, esES, frFR, ptPT] = await Promise.all([
      import('./locales/en-us.json'),
      import('./locales/ja-jp.json'),
      import('./locales/ru-ru.json'),
      import('./locales/zh-cn.json'),
      import('./locales/zh-tw.json'),
      import('./translate/el-gr.json'),
      import('./translate/es-es.json'),
      import('./translate/fr-fr.json'),
      import('./translate/pt-pt.json')
    ])

    // Extract translation data - the JSON structure is { "translation": { ... } }
    const extractTranslation = (module: any, langCode: string) => {
      try {
        // Try different possible structures
        let translation = null
        
        if (module.default && module.default.translation) {
          translation = module.default.translation
        } else if (module.default) {
          translation = module.default
        } else if (module.translation) {
          translation = module.translation
        } else {
          translation = module
        }

        if (process.env.NODE_ENV === 'development') {
          console.log(`${langCode} extraction:`, {
            hasTranslation: !!translation,
            hasChat: !!(translation as any)?.chat,
            chatInputPlaceholder: (translation as any)?.chat?.input?.placeholder,
            chatDefaultDescription: (translation as any)?.chat?.default?.description,
            sampleKeys: translation ? Object.keys(translation).slice(0, 3) : []
          })
        }

        return translation || {}
      } catch (error) {
        console.error(`Error extracting translation for ${langCode}:`, error)
        return {}
      }
    }

    // Build resources object
    const resources = {
      'el-GR': { translation: extractTranslation(elGR, 'el-GR') },
      'en-US': { translation: extractTranslation(enUS, 'en-US') },
      'es-ES': { translation: extractTranslation(esES, 'es-ES') },
      'fr-FR': { translation: extractTranslation(frFR, 'fr-FR') },
      'ja-JP': { translation: extractTranslation(jaJP, 'ja-JP') },
      'pt-PT': { translation: extractTranslation(ptPT, 'pt-PT') },
      'ru-RU': { translation: extractTranslation(ruRU, 'ru-RU') },
      'zh-CN': { translation: extractTranslation(zhCN, 'zh-CN') },
      'zh-TW': { translation: extractTranslation(zhTW, 'zh-TW') }
    }

    // Initialize i18n
    await i18n.use(initReactI18next).init({
      resources,
      lng: getLanguage(),
      fallbackLng: defaultLanguage,
      interpolation: {
        escapeValue: false
      },
      // Disable key separator to handle nested keys properly
      keySeparator: '.',
      nsSeparator: false,
      returnNull: false,
      returnEmptyString: false,
      returnObjects: false,
      debug: process.env.NODE_ENV === 'development'
    })

    if (process.env.NODE_ENV === 'development') {
      console.log('i18n initialized successfully')
      console.log('Current language:', i18n.language)
      console.log('Available languages:', Object.keys(resources))
      
      // Test the specific keys that were failing
      const testKeys = [
        'chat.input.placeholder',
        'chat.default.description',
        'chat.add.assistant.title'
      ]
      testKeys.forEach(key => {
        const translation = i18n.t(key)
        console.log(`Test - ${key}: "${translation}" (${translation === key ? 'MISSING' : 'FOUND'})`)
      })
    }

  } catch (error) {
    console.error('Failed to load translations:', error)
    
    // Fallback initialization with empty resources
    await i18n.use(initReactI18next).init({
      resources: {},
      lng: getLanguage(),
      fallbackLng: defaultLanguage,
      interpolation: { escapeValue: false }
    })
  }
}

// Initialize translations immediately
loadTranslations()

export default i18n
