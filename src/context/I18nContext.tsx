import React, { createContext, useContext, useMemo, ReactNode } from 'react'
import { getBrowserLanguage, getMessage, SupportedLanguage } from '../utils/i18n'

// --- Types ---

interface I18nContextType {
  uiLanguage: SupportedLanguage; // The language used for the extension's UI
  t: (key: string) => string; // Translation function
}

// --- Context Definition ---

const I18nContext = createContext<I18nContextType | null>(null);

// --- Provider Component ---

interface I18nProviderProps {
  children: ReactNode;
}

/**
 * Provides internationalization context (UI language and translation function).
 */
export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const LOG_PREFIX = "[I18nProvider]";

  // Determine the UI language based on browser/OS settings
  const uiLanguage = getBrowserLanguage();
  console.log(`${LOG_PREFIX} Determined UI language: ${uiLanguage}`);

  // Memoize the translation function `t` to optimize performance.
  // It depends only on the `uiLanguage`.
  const t = useMemo(() => {
    return (key: string): string => {
      try {
        // 1. Attempt to get translation in the detected UI language
        const message = getMessage(key, uiLanguage);
        
        // 2. If not found and language is not English, try English as a fallback
        if (!message && uiLanguage !== 'en') {
          console.warn(`${LOG_PREFIX} Translation not found for key "${key}" in language "${uiLanguage}". Falling back to English.`);
          const fallbackMessage = getMessage(key, 'en');
          // 3. If English fallback also fails, return the key itself
          return fallbackMessage || key; 
        }

        // 4. If found in original language, or if English was the original language and failed, return message or key
        return message || key; 
      } catch (error) {
        console.error(`${LOG_PREFIX} Translation error for key "${key}" (lang: ${uiLanguage}):`, error);
        // 5. Return the key in case of any unexpected errors during translation
        return key; 
      }
    };
  }, [uiLanguage, LOG_PREFIX]); // Added LOG_PREFIX to dependency array although it's constant

  // Memoize the context value object
  const value = useMemo(() => ({
    uiLanguage,
    t,
  }), [uiLanguage, t]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
};

// --- Hook ---

/**
 * Hook to consume the I18n context.
 * Provides the UI language and the translation function `t`.
 */
export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    // This error prevents using the hook outside of the provider tree
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}; 