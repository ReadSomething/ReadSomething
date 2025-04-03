/**
 * i18n Utility Functions
 * 
 * Provides functions for browser language detection, translation retrieval (via chrome.i18n),
 * and getting language display names.
 */

import {
  LanguageCode,
  normalizeLanguageCode,
  SUPPORTED_LANGUAGES as ALL_SUPPORTED_LANGUAGES, // Import the comprehensive list
  isLanguageSupported // Import the checker function
} from './language';
// Keep config import for display names/titles, assuming this data isn't in _locales
import { languageDisplayConfigs } from '../config/ui'; 

const LOG_PREFIX = "[i18nUtil]";

// --- Functions --- 

/**
 * Get localized display name for a language code.
 * Uses configuration from `languageDisplayConfigs`.
 * @param langCode Language code to get display name for (e.g., 'en', 'zh').
 * @param uiLanguage Current UI language code (used to select the display name language).
 * @returns Localized display name for the language, or the code itself as fallback.
 */
export function getLanguageDisplayName(langCode: LanguageCode, uiLanguage: LanguageCode): string {
  const config = languageDisplayConfigs.find(config => config.code === langCode);
  
  if (config) {
    // Return the localized display name, fallback to English, then code
    return config.displayNames[uiLanguage] || 
           config.displayNames['en'] || 
           config.fallback || 
           langCode;
  }
  
  // If no config found, return the language code
  console.warn(`${LOG_PREFIX} No display name config found for language code: ${langCode}`);
  return langCode;
}

/**
 * Get localized font section title based on content language.
 * Uses configuration from `languageDisplayConfigs`.
 * @param contentLanguage Detected content language code.
 * @param uiLanguage Current UI language code.
 * @returns Localized font section title (e.g., "Chinese Fonts") or a generated fallback.
 */
export function getFontSectionTitle(contentLanguage: LanguageCode, uiLanguage: LanguageCode): string {
  const config = languageDisplayConfigs.find(config => config.code === contentLanguage);
  
  if (config?.fontSectionTitle) {
    // Return the localized font section title, fallback to English, then generate default
    return config.fontSectionTitle[uiLanguage] || 
           config.fontSectionTitle['en'] || 
           `${getLanguageDisplayName(contentLanguage, uiLanguage)} Fonts`;
  }
  
  // If no specific title found, construct one from the language name
  const defaultTitle = `${getLanguageDisplayName(contentLanguage, uiLanguage)} Fonts`;
  console.warn(`${LOG_PREFIX} No specific font section title found for language: ${contentLanguage}. Using default: "${defaultTitle}"`);
  return defaultTitle;
}

/**
 * Get the browser's preferred UI language, normalized and validated against supported languages.
 * Uses the comprehensive list from language.ts.
 * @returns A supported LanguageCode (defaults to 'en').
 */
export function getBrowserLanguage(): LanguageCode {
  let detectedLang: LanguageCode = 'en'; // Default
  try {
    const browserLang = navigator.language || (navigator as any).userLanguage;
    if (browserLang) {
      const normalizedLang = normalizeLanguageCode(browserLang);
      
      // Use the imported isLanguageSupported checker
      if (isLanguageSupported(normalizedLang)) {
        detectedLang = normalizedLang;
      } else {
        // Try base language code if regional variant wasn't supported
        const baseLang = normalizedLang.split('-')[0];
        if (isLanguageSupported(baseLang)) {
          detectedLang = baseLang;
        }
      }
    }
  } catch (e) {
    console.warn(`${LOG_PREFIX} Error detecting browser language:`, e);
  }
  console.log(`${LOG_PREFIX} Using UI language: ${detectedLang}`);
  return detectedLang;
}

/**
 * Get a translated string using the standard chrome.i18n API.
 * Requires the key to be defined in `public/_locales/[lang]/messages.json`.
 * 
 * @param key The translation key (must match messages.json).
 * @returns The translated string, or the key itself if not found.
 */
export function getMessage(key: string): string {
  try {
    if (typeof chrome !== 'undefined' && chrome?.i18n?.getMessage) {
      const message = chrome.i18n.getMessage(key);
      // chrome.i18n.getMessage returns empty string if key not found
      if (message) {
        return message;
      } else {
        console.warn(`${LOG_PREFIX} Translation key "${key}" not found in messages.json.`);
        return key; // Return key if Chrome API returns empty string
      }
    } else {
      // Fallback if chrome.i18n is not available (e.g., testing environment)
      console.warn(`${LOG_PREFIX} chrome.i18n.getMessage not available. Returning key "${key}".`);
      return key;
    }
  } catch (e) {
    console.error(`${LOG_PREFIX} Error calling chrome.i18n.getMessage for key "${key}":`, e);
    return key; // Return key on error
  }
} 