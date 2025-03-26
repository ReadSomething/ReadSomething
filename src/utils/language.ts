/**
 * Language detection utility functions
 */

// Define common language codes with ISO 639-1/639-2 standards
export type LanguageCode = 'zh' | 'en' | 'ja' | 'ko' | 'fr' | 'de' | 'es' | 'it' | 'ru' | string;

// Map for converting any language code to standard format
const LANGUAGE_CODE_MAP: Record<string, LanguageCode> = {
  // Chinese variants
  'cmn': 'zh',   // Mandarin
  'wuu': 'zh',   // Wu Chinese
  'yue': 'zh',   // Cantonese
  'zh-CN': 'zh', // Simplified Chinese
  'zh-TW': 'zh', // Traditional Chinese
  'zh-HK': 'zh', // Hong Kong Chinese
  
  // English variants
  'en-US': 'en', // American English
  'en-GB': 'en', // British English
  'en-CA': 'en', // Canadian English
  'en-AU': 'en', // Australian English
  
  // Other languages
  'jpn': 'ja',   // Japanese
  'kor': 'ko',   // Korean
  'fra': 'fr',   // French
  'deu': 'de',   // German
  'spa': 'es',   // Spanish
  'ita': 'it',   // Italian
  'rus': 'ru',   // Russian
};

// Default language when no detection is available
export const DEFAULT_LANGUAGE: LanguageCode = 'en';

/**
 * Normalizes any language code to a standard format
 * 
 * @param code The raw language code from detection
 * @returns A normalized language code (ISO 639-1 where possible)
 */
export function normalizeLanguageCode(code?: string | null): LanguageCode {
  if (!code) return DEFAULT_LANGUAGE;
  
  // Check if code exists in our map
  if (code in LANGUAGE_CODE_MAP) {
    return LANGUAGE_CODE_MAP[code];
  }
  
  // If code is a variant (contains a hyphen), extract the base code
  if (code.includes('-')) {
    const baseCode = code.split('-')[0];
    return baseCode as LanguageCode;
  }
  
  // If it's already a standard code or unknown, return as is
  return code as LanguageCode;
}

/**
 * Checks if a language code represents Chinese
 * 
 * @param code The language code to check
 * @returns boolean indicating if the language is Chinese
 */
export function isChineseLanguage(code?: string | null): boolean {
  if (!code) return false;
  
  // Normalize first
  const normalizedCode = normalizeLanguageCode(code);
  
  // Check if it's Chinese
  return normalizedCode === 'zh';
}

/**
 * Checks if a language is supported
 * 
 * @param code The language code to check
 * @returns boolean indicating if the language is supported
 */
export function isLanguageSupported(code: LanguageCode): boolean {
  // Add languages that your app fully supports
  const SUPPORTED_LANGUAGES: LanguageCode[] = ['zh', 'en', 'ja', 'ko', 'fr', 'de', 'es', 'it', 'ru'];
  return SUPPORTED_LANGUAGES.includes(code);
} 