import React, { createContext, useContext, useMemo, ReactNode } from 'react'
import { getBrowserLanguage, getMessage, SupportedLanguage } from '../config/i18n'

interface I18nContextType {
  uiLanguage: SupportedLanguage
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextType | null>(null)

interface I18nProviderProps {
  children: ReactNode
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  // Always use browser language
  const uiLanguage = getBrowserLanguage()

  // Memoize the translation function to prevent unnecessary re-renders
  const t = useMemo(() => {
    return (key: string) => {
      try {
        const message = getMessage(key, uiLanguage)
        // If message is empty or undefined, try to get English version as fallback
        if (!message && uiLanguage !== 'en') {
          const fallbackMessage = getMessage(key, 'en')
          return fallbackMessage || key // Return the key itself if all translations fail
        }
        return message || key // Return the key itself if translation fails
      } catch (error) {
        console.error(`Translation error for key "${key}":`, error)
        return key // Return the key itself if there's an error
      }
    }
  }, [uiLanguage])

  // Create memoized context value
  const value = useMemo(() => ({
    uiLanguage,
    t
  }), [uiLanguage, t])

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  )
}

export const useI18n = () => {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
} 