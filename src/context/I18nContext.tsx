import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react'
import { getBrowserLanguage, getMessage, SupportedLanguage } from '../config/i18n'

interface I18nContextType {
  language: SupportedLanguage
  uiLanguage: SupportedLanguage
  setLanguage: (lang: SupportedLanguage) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextType | null>(null)

interface I18nProviderProps {
  children: ReactNode
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
    
  // Initialize with browser language
  const [language, setLanguage] = useState<SupportedLanguage>(() => {
        const browserLang = getBrowserLanguage()
        return browserLang
  })

  // Log language changes
  useEffect(() => {
      }, [language])

  // Memoize the translation function to prevent unnecessary re-renders
  const t = useMemo(() => {
        return (key: string) => {
      const message = getMessage(key, language)
            return message
    }
  }, [language])

  // Create memoized context value
  const value = useMemo(() => ({
    language,
    uiLanguage: language,
    setLanguage,
    t
  }), [language, t])

    
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