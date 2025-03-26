import React, { createContext, useState, useEffect, ReactNode, useContext, useCallback } from "react"
import { useArticle } from "../hooks/useArticle"
import { normalizeLanguageCode, LanguageCode } from "../utils/language"
import { useStoredSettings } from "../hooks/useStoredSettings"

// Language-specific settings type
export interface LanguageSettings {
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  width: number;
  spacing: "tight" | "normal" | "relaxed";
  theme: "light" | "dark" | "sepia" | "paper";
  textAlign: "left" | "justify" | "right" | "center";
}

// Language settings map type
export interface LanguageSettingsMap {
  [key: string]: LanguageSettings;
}

// Default settings for reader
export const defaultSettings = {
  // Theme
  theme: "light" as "light" | "dark" | "sepia" | "paper",
  
  // Global font settings
  fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif',
  fontSize: 18,
  lineHeight: 1.6,
  
  // Content width
  width: 700,
  
  // Spacing
  spacing: "normal" as "tight" | "normal" | "relaxed",
  
  // Text alignment
  textAlign: "left" as "left" | "justify" | "right" | "center",
  
  // Keep trackingEnabled flag for future analytics
  trackingEnabled: false,
  
  // Version for settings migrations
  version: 1,
  
  // Language-specific settings to avoid reset when switching languages
  languageSettings: {
    en: {
      theme: "light" as "light" | "dark" | "sepia" | "paper",
      fontFamily: '"Bookerly", "Palatino Linotype", "Book Antiqua", Palatino, serif',
      fontSize: 18,
      lineHeight: 1.6,
      width: 700,
      spacing: "normal" as "tight" | "normal" | "relaxed",
      textAlign: "left" as "left" | "justify" | "right" | "center",
    },
    zh: {
      theme: "light" as "light" | "dark" | "sepia" | "paper",
      fontFamily: '"Noto Serif SC", "Source Han Serif SC", "Source Han Serif CN", STSong, SimSun, serif',
      fontSize: 18,
      lineHeight: 1.8, // Slightly higher for Chinese
      width: 700,
      spacing: "normal" as "tight" | "normal" | "relaxed",
      textAlign: "justify" as "left" | "justify" | "right" | "center", // Generally justified for Chinese
    }
  } as Record<LanguageCode, {
    theme: "light" | "dark" | "sepia" | "paper",
    fontFamily: string,
    fontSize: number,
    lineHeight: number,
    width: number,
    spacing: "tight" | "normal" | "relaxed",
    textAlign: "left" | "justify" | "right" | "center",
  }>
};

// Reader context type definition
export interface ReaderContextType {
  article: {
    title: string;
    content: string;
    author?: string;
    date?: string;
    siteName?: string;
    textContent?: string;
    excerpt?: string;
    length?: number;
    byline?: string;
    dir?: string;
    language?: string;
  } | null;
  settings: typeof defaultSettings;
  isLoading: boolean;
  error: string | null;
  isSettingsLoaded: boolean; // Added setting loading status
  updateSettings: (settings: Partial<typeof defaultSettings>) => void;
  resetSettings: () => void; // Added reset settings method
  closeReader: () => void;
}

// Create context with default values
export const ReaderContext = createContext<ReaderContextType>({
  article: null,
  settings: defaultSettings,
  isLoading: false,
  error: null,
  isSettingsLoaded: false, // Added default value
  updateSettings: () => {},
  resetSettings: () => {}, // Added default value
  closeReader: () => {},
})

// Provider props
interface ReaderProviderProps {
  children: ReactNode;
}

// Hook to use the reader context
export const useReader = () => useContext(ReaderContext)

// Simple loading indicator component
const LoadingIndicator: React.FC = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh',
    color: '#555',
    fontSize: '18px'
  }}>
    <div>Loading settings...</div>
  </div>
)

// Provider component that wraps app
export const ReaderProvider: React.FC<ReaderProviderProps> = ({ children }) => {
  // use storage hook instead of useState to manage settings
  const { settings, updateSettings, isLoaded: isSettingsLoaded, resetSettings } = useStoredSettings()
  
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { extractArticle } = useArticle()
  const [article, setArticle] = useState<ReaderContextType["article"]>(null)
  
  // Extract article content when component mounts
  useEffect(() => {
    const loadArticle = async () => {
      setIsLoading(true)
      try {
        const extractedArticle = await extractArticle()
        if (extractedArticle) {
          // Normalize language if present
          if (extractedArticle.language) {
            const normalizedLang = normalizeLanguageCode(extractedArticle.language);
            extractedArticle.language = normalizedLang;
                                  }
          
          setArticle(extractedArticle)
          setError(null)
        } else {
          setError("Could not extract article content")
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error occurred")
        console.error("Error extracting article:", err)
      } finally {
        setIsLoading(false)
      }
    }
    
    // only load article after settings are loaded
    if (isSettingsLoaded) {
      loadArticle()
    }
  }, [isSettingsLoaded])
  
  // Close reader mode
  const closeReader = useCallback(() => {
    // Use the same custom event mechanism as background.ts
    document.dispatchEvent(new CustomEvent('READLITE_TOGGLE_INTERNAL'));
  }, [])
  
  // Context value
  const value = {
    article,
    settings,
    isLoading,
    error,
    isSettingsLoaded,
    updateSettings,
    resetSettings,
    closeReader,
  }
  
  return (
    <ReaderContext.Provider value={value}>
      {isSettingsLoaded ? children : <LoadingIndicator />}
    </ReaderContext.Provider>
  )
} 