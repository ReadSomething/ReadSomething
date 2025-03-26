/**
 * Font configuration and utilities
 * 
 * This file contains font mapping configurations for the reader
 */

import { LanguageCode } from '../utils/language';

// Font display name configuration 
// Maps font identifier to localized display names 
export interface FontDisplayConfig {
  identifiers: string[];  // Strings to check in fontFamily
  displayNames: {
    [key in LanguageCode]?: string;  // Localized display names
  };
  fallback?: string;     // Fallback display name if no localized version
}

// Font display configuration mapping
export const fontDisplayConfigs: FontDisplayConfig[] = [
  // System fonts
  {
    identifiers: ['system-ui', '-apple-system', 'BlinkMacSystemFont'],
    displayNames: {
      'en': 'System Default',
      'zh': '系统默认',
      'ja': 'システムフォント'
    }
  },
  
  // Chinese fonts
  {
    identifiers: ['Source Han Serif', 'Noto Serif SC', '思源宋体'],
    displayNames: {
      'en': 'Source Han Serif',
      'zh': '思源宋体',
      'ja': '源ノ明朝'
    }
  },
  {
    identifiers: ['Source Han Sans', 'Noto Sans SC', '思源黑体'],
    displayNames: {
      'en': 'Source Han Sans',
      'zh': '思源黑体',
      'ja': '源ノ角ゴシック'
    }
  },
  {
    identifiers: ['PingFang', '苹方'],
    displayNames: {
      'en': 'PingFang',
      'zh': '苹方'
    }
  },
  {
    identifiers: ['Microsoft YaHei', '微软雅黑'],
    displayNames: {
      'en': 'Microsoft YaHei',
      'zh': '微软雅黑'
    }
  },
  
  // English fonts
  {
    identifiers: ['Bookerly'],
    displayNames: {
      'en': 'Bookerly',
      'zh': 'Bookerly'
    },
    fallback: 'Bookerly'
  },
  {
    identifiers: ['Georgia'],
    displayNames: {
      'en': 'Georgia',
      'zh': 'Georgia'
    },
    fallback: 'Georgia'
  },
  {
    identifiers: ['Times'],
    displayNames: {
      'en': 'Times New Roman',
      'zh': 'Times New Roman'
    },
    fallback: 'Times New Roman'
  },
  {
    identifiers: ['Palatino'],
    displayNames: {
      'en': 'Palatino',
      'zh': 'Palatino'
    },
    fallback: 'Palatino'
  },
  {
    identifiers: ['Arial'],
    displayNames: {
      'en': 'Arial',
      'zh': 'Arial'
    },
    fallback: 'Arial'
  }
];

/**
 * Get display name for a font based on its family name and UI language
 * @param fontFamily Font family string (may include multiple fallback fonts)
 * @param uiLanguage Current UI language
 * @returns Localized display name for the font
 */
export function getFontDisplayName(fontFamily: string, uiLanguage: LanguageCode): string {
  // Extract the first font in the font-family stack
  const fontName = fontFamily.split(',')[0].replace(/['"]/g, '');
  
  // Check if the font matches any of our configs
  for (const config of fontDisplayConfigs) {
    // Check if any of the identifiers match this font
    if (config.identifiers.some(id => fontName.includes(id))) {
      // Return the localized display name or fallback
      return config.displayNames[uiLanguage] || 
             config.displayNames['en'] || 
             config.fallback || 
             fontName;
    }
  }
  
  // If no match found, return the font name directly
  return fontName;
} 