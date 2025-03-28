/**
 * i18n Configuration for ReadLite
 * 
 * This module provides internationalization support following best practices:
 * - Uses ISO 639-1 language codes (e.g., 'en', 'zh')
 * - Follows browser extension i18n conventions
 * - Centralizes all translations in one place
 */

import { translations } from './translations';
import { normalizeLanguageCode } from '../../utils/language';

// Define supported languages
export type SupportedLanguage = 'en' | 'zh'

// Export supported languages array for use in UI
export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = ['en', 'zh'] as const

/**
 * Check if a language is supported by the application
 */
export function isLanguageSupported(lang: string): lang is SupportedLanguage {
    const normalizedLang = normalizeLanguageCode(lang)
    const isSupported = SUPPORTED_LANGUAGES.includes(normalizedLang as SupportedLanguage)
    return isSupported
}

/**
 * Get browser's UI language or fall back to default
 * This is the standard way to detect browser language in extensions
 */
export function getBrowserLanguage(): SupportedLanguage {
  try {
    // Use navigator.language to get browser language
    const browserLang = navigator.language || (navigator as any).userLanguage
    
    // Normalize language code
    const normalizedLang = normalizeLanguageCode(browserLang)
    
    // Check if supported
    if (isLanguageSupported(normalizedLang)) {
      return normalizedLang
    }
    
    // If the full language code is not supported, try the base language code
    const baseLang = normalizedLang.split('-')[0]
    if (isLanguageSupported(baseLang)) {
      return baseLang
    }
  } catch (e) {
    console.warn('i18n: Error getting browser language:', e)
  }
  
  // Default to English if no supported language is found
  return 'en'
}

/**
 * Get a translated string by key
 * This function mimics the chrome.i18n.getMessage API but works with our internal translation system
 */
export function getMessage(key: string, language: SupportedLanguage): string {
  try {
    // First try to get from translations object
    if (translations[language] && translations[language][key]) {
      return translations[language][key];
    }

    // Then try Chrome i18n
    if (typeof chrome !== 'undefined' && chrome?.i18n?.getMessage) {
      const message = chrome.i18n.getMessage(key);
      if (message) {
        return message;
      }
    }
  } catch (e) {
    console.warn('i18n: Error getting message:', e);
  }
  
  // Finally fallback to internal translations
  const internalTranslations = getTranslations(language);
  return internalTranslations[key] || key;
}

// Internal translations
const getTranslations = (language: SupportedLanguage): Record<string, string> => {
    switch (language) {
    case 'zh':
      return {
        displaySettings: '显示设置',
        readingTheme: '阅读主题',
        light: '明亮',
        dark: '暗黑',
        sepia: '护眼',
        paper: '纸张',
        fontSize: '字号',
        currentSize: '当前大小',
        fontFamily: '字体',
        pageWidth: '页面宽度',
        narrow: '窄',
        medium: '中等',
        wide: '宽',
        textAlignment: '文本对齐',
        left: '左对齐',
        justify: '两端对齐',
        center: '居中',
        right: '右对齐',
        lineSpacing: '行间距',
        compact: '紧凑',
        comfortable: '舒适',
        relaxed: '宽松',
        close: '关闭',
        download: '下载',
        detected: '检测到',
        extractingArticle: '正在提取文章...',
        couldNotExtract: '无法提取文章内容'
      }
    default:
      return {
        displaySettings: 'Display Settings',
        readingTheme: 'Reading Theme',
        light: 'Light',
        dark: 'Dark',
        sepia: 'Sepia',
        paper: 'Paper',
        fontSize: 'Font Size',
        currentSize: 'Current Size',
        fontFamily: 'Font Family',
        pageWidth: 'Page Width',
        narrow: 'Narrow',
        medium: 'Medium',
        wide: 'Wide',
        textAlignment: 'Text Alignment',
        left: 'Left',
        justify: 'Justify',
        center: 'Center',
        right: 'Right',
        lineSpacing: 'Line Spacing',
        compact: 'Compact',
        comfortable: 'Comfortable',
        relaxed: 'Relaxed',
        close: 'Close',
        download: 'Download',
        detected: 'Detected',
        extractingArticle: 'Extracting article...',
        couldNotExtract: 'Could not extract article content'
      }
  }
}

/**
 * Helper to convert from simple language code to chrome.i18n language code
 * This is useful when working with both the browser's built-in i18n and our custom system
 */
export function toExtensionLanguageCode(lang: SupportedLanguage): string {
    // Chrome extensions use language codes like en_US or zh_CN
  // We could map our simple codes to their corresponding extension codes
  const extensionCodeMap: Record<SupportedLanguage, string> = {
    'en': 'en',
    'zh': 'zh_CN'
  };
  
  const code = extensionCodeMap[lang];
    return code;
}

/**
 * Initializes the i18n system
 * Call this function at application startup
 */
export function initI18n(): SupportedLanguage {
    
  // Get the browser language or use default
  const detectedLanguage = getBrowserLanguage();
  
    
  return detectedLanguage;
}

// Export translations and utilities
export const i18n = {
  translations,
  getBrowserLanguage,
  getMessage,
  isLanguageSupported,
  initI18n,
  toExtensionLanguageCode
};

export default i18n; 