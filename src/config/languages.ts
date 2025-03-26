/**
 * Language configuration and utilities
 * 
 * This file contains language mapping configurations for multilingual support
 */

import { LanguageCode } from '../utils/language';

// Language display configuration
export interface LanguageDisplayConfig {
  code: LanguageCode;        // Language code (e.g. 'en', 'zh')
  displayNames: {            // Localized display names
    [key in LanguageCode]?: string;
  };
  fontSectionTitle?: {       // Font section title when this language is detected
    [key in LanguageCode]?: string;
  };
  fallback?: string;         // Fallback display name
}

// Language display configuration mapping
export const languageDisplayConfigs: LanguageDisplayConfig[] = [
  // English
  {
    code: 'en',
    displayNames: {
      'en': 'English',
      'zh': '英文',
      'ja': '英語',
      'fr': 'Anglais',
      'de': 'Englisch',
      'es': 'Inglés',
      'ru': 'Английский'
    },
    fontSectionTitle: {
      'en': 'English Fonts',
      'zh': '英文字体',
      'ja': '英語フォント'
    }
  },
  // Chinese
  {
    code: 'zh',
    displayNames: {
      'en': 'Chinese',
      'zh': '中文',
      'ja': '中国語',
      'fr': 'Chinois',
      'de': 'Chinesisch',
      'es': 'Chino',
      'ru': 'Китайский'
    },
    fontSectionTitle: {
      'en': 'Chinese Fonts',
      'zh': '中文字体',
      'ja': '中国語フォント'
    }
  },
  // Japanese
  {
    code: 'ja',
    displayNames: {
      'en': 'Japanese',
      'zh': '日文',
      'ja': '日本語',
      'fr': 'Japonais',
      'de': 'Japanisch',
      'es': 'Japonés',
      'ru': 'Японский'
    },
    fontSectionTitle: {
      'en': 'Japanese Fonts',
      'zh': '日文字体',
      'ja': '日本語フォント'
    }
  },
  // Korean
  {
    code: 'ko',
    displayNames: {
      'en': 'Korean',
      'zh': '韩文',
      'ja': '韓国語',
      'fr': 'Coréen',
      'de': 'Koreanisch',
      'es': 'Coreano',
      'ru': 'Корейский'
    },
    fontSectionTitle: {
      'en': 'Korean Fonts',
      'zh': '韩文字体',
      'ja': '韓国語フォント'
    }
  },
  // French
  {
    code: 'fr',
    displayNames: {
      'en': 'French',
      'zh': '法文',
      'ja': 'フランス語',
      'fr': 'Français',
      'de': 'Französisch',
      'es': 'Francés',
      'ru': 'Французский'
    }
  },
  // German
  {
    code: 'de',
    displayNames: {
      'en': 'German',
      'zh': '德文',
      'ja': 'ドイツ語',
      'fr': 'Allemand',
      'de': 'Deutsch',
      'es': 'Alemán',
      'ru': 'Немецкий'
    }
  },
  // Spanish
  {
    code: 'es',
    displayNames: {
      'en': 'Spanish',
      'zh': '西班牙文',
      'ja': 'スペイン語',
      'fr': 'Espagnol',
      'de': 'Spanisch',
      'es': 'Español',
      'ru': 'Испанский'
    }
  },
  // Italian
  {
    code: 'it',
    displayNames: {
      'en': 'Italian',
      'zh': '意大利文',
      'ja': 'イタリア語',
      'fr': 'Italien',
      'de': 'Italienisch',
      'es': 'Italiano',
      'ru': 'Итальянский'
    }
  },
  // Russian
  {
    code: 'ru',
    displayNames: {
      'en': 'Russian',
      'zh': '俄文',
      'ja': 'ロシア語',
      'fr': 'Russe',
      'de': 'Russisch',
      'es': 'Ruso',
      'ru': 'Русский'
    }
  }
];

/**
 * Get localized display name for a language
 * @param langCode Language code to get display name for
 * @param uiLanguage Current UI language
 * @returns Localized display name for the language
 */
export function getLanguageDisplayName(langCode: LanguageCode, uiLanguage: LanguageCode): string {
  // Find the language config
  const config = languageDisplayConfigs.find(config => config.code === langCode);
  
  if (config) {
    // Return the localized display name or fallback
    return config.displayNames[uiLanguage] ||
           config.displayNames['en'] ||
           config.fallback ||
           langCode;
  }
  
  // If no config found, return the language code
  return langCode;
}

/**
 * Get font section title based on content language
 * @param contentLanguage Detected content language
 * @param uiLanguage Current UI language
 * @returns Localized font section title
 */
export function getFontSectionTitle(contentLanguage: LanguageCode, uiLanguage: LanguageCode): string {
  // Find the language config
  const config = languageDisplayConfigs.find(config => config.code === contentLanguage);
  
  if (config && config.fontSectionTitle) {
    // Return the localized font section title or fallback
    return config.fontSectionTitle[uiLanguage] ||
           config.fontSectionTitle['en'] ||
           `${getLanguageDisplayName(contentLanguage, uiLanguage)} Fonts`;
  }
  
  // If no specific title found, construct one from the language name
  return `${getLanguageDisplayName(contentLanguage, uiLanguage)} Fonts`;
} 