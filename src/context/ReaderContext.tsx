import React, { createContext, useState, useEffect, ReactNode, useContext, useCallback } from "react"
import { LanguageCode } from "../utils/language"
import { useArticle } from "../hooks/useArticle"
import { useStoredSettings } from "../hooks/useStoredSettings"
import { createLogger } from "../utils/logger"

// Create a logger for this module
const logger = createLogger('reader-context');


// --- Types & Defaults ---

// Main settings type
// Removed LanguageSettings and LanguageSettingsMap as per-language overrides are currently not implemented in setters.
export interface ReaderSettings {
  theme: "light" | "dark" | "sepia" | "paper";
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  width: number;
  spacing: "tight" | "normal" | "relaxed";
  textAlign: "left" | "justify" | "right" | "center";
  trackingEnabled: boolean; // For potential future analytics
  version: number; // For settings migrations
}

// Default settings for reader
export const defaultSettings: ReaderSettings = {
  theme: "light",
  fontFamily: '', // Empty string to allow language-specific default
  fontSize: 18,
  lineHeight: 1.6,
  width: 700, // Standard width
  spacing: "normal",
  textAlign: "left",
  trackingEnabled: false,
  version: 1,
};

// Define the structure for the extracted article data
// Based on Mercury parser output structure
export interface ArticleData {
  title: string;
  content: string; // HTML content
  author?: string;
  date?: string;
  siteName?: string;
  textContent?: string; // Plain text version
  excerpt?: string;
  length?: number;
  byline?: string;
  dir?: string; // Text direction (e.g., 'ltr', 'rtl')
  language?: string; // Detected language code (e.g., 'en', 'zh')
}

// Type for the context value
export interface ReaderContextType {
  article: ArticleData | null;
  settings: ReaderSettings;
  isLoading: boolean; // Loading state for article extraction
  error: string | null; // Error message from article extraction
  isSettingsLoaded: boolean; // Status from useStoredSettings
  updateSettings: (newSettings: Partial<ReaderSettings>) => void; // From useStoredSettings
  resetSettings: () => void; // From useStoredSettings
  closeReader: () => void; // Function to trigger reader close
}

// --- Context Definition ---

// Create context with default/placeholder values
export const ReaderContext = createContext<ReaderContextType>({
  article: null,
  settings: defaultSettings,
  isLoading: false,
  error: null,
  isSettingsLoaded: false, 
  updateSettings: () => logger.warn("updateSettings called before Provider mounted"),
  resetSettings: () => logger.warn("resetSettings called before Provider mounted"),
  closeReader: () => logger.warn("closeReader called before Provider mounted"),
});

// Hook to easily consume the context
export const useReader = () => useContext(ReaderContext);

// --- Provider Component ---

interface ReaderProviderProps {
  children: ReactNode;
}

// Simple loading indicator shown while settings are loading
const LoadingIndicator: React.FC = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    backgroundColor: '#f0f0f0',
    color: '#555',
    fontSize: '16px'
  }}>
    <div style={{ textAlign: 'center' }}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: '10px', opacity: 0.6 }}>
         <path d="M4 19.5C4 18.837 4.26339 18.2011 4.73223 17.7322C5.20107 17.2634 5.83696 17 6.5 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
         <path d="M6.5 2H20V22H6.5C5.83696 22 5.20107 21.7366 4.73223 21.2678C4.26339 20.7989 4 20.163 4 19.5V4.5C4 3.83696 4.26339 3.20107 4.73223 2.73223C5.20107 2.26339 5.83696 2 6.5 2V2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
       </svg>
      <div>Loading Reader Settings...</div>
    </div>
  </div>
);

/**
 * Provider component for the Reader Context.
 * Manages fetching stored settings, extracting article content, and providing 
 * state and update functions to child components.
 */
export const ReaderProvider: React.FC<ReaderProviderProps> = ({ children }) => {
  // --- State & Hooks ---
  
  // Settings state managed by useStoredSettings (handles loading from chrome.storage)
  const { 
    settings, 
    updateSettings, 
    isLoaded: isSettingsLoaded, 
    resetSettings 
  } = useStoredSettings();
  
  // State for article extraction
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start loading until settings loaded
  const [error, setError] = useState<string | null>(null);
  
  // Hook providing the article extraction function
  const { extractArticle } = useArticle();
  
  // --- Effects ---

  /**
   * Effect to load the article content once the settings have been loaded.
   */
  useEffect(() => {
    const loadArticle = async () => {
      logger.info("Settings loaded. Starting article extraction...");
      setIsLoading(true);
      setError(null); // Clear previous errors
      try {
        const extractedArticle = await extractArticle();
        if (extractedArticle) {
          logger.info(`Article extracted successfully: "${extractedArticle.title?.substring(0, 50)}..."`);
          setArticle(extractedArticle);
        } else {
          logger.warn("Article extraction returned null or undefined.");
          setError("Could not extract article content from this page.");
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error during article extraction";
        logger.error("Error extracting article:", err);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Trigger article loading only after settings are confirmed loaded
    if (isSettingsLoaded) {
      loadArticle();
    } else {
      // If settings aren't loaded yet, ensure isLoading remains true
      setIsLoading(true); 
    }
  // Dependency: Re-run if the settings loading status changes. 
  // extractArticle is assumed to be stable from its hook.
  }, [isSettingsLoaded, extractArticle]); 
  
  // --- Callbacks ---

  /**
   * Callback function to close the reader mode.
   * Dispatches a custom event handled by the content script.
   */
  const closeReader = useCallback(() => {
    logger.info("Dispatching close event (READLITE_TOGGLE_INTERNAL).");
    document.dispatchEvent(new CustomEvent('READLITE_TOGGLE_INTERNAL'));
  }, []);
  
  // --- Context Value --- 

  // Assemble the context value object
  const value: ReaderContextType = {
    article,
    settings,
    isLoading,
    error,
    isSettingsLoaded,
    updateSettings,
    resetSettings,
    closeReader,
  };
  
  // --- Render ---

  return (
    <ReaderContext.Provider value={value}>
      {/* Show loading indicator until settings are loaded */} 
      {isSettingsLoaded ? children : <LoadingIndicator />}
    </ReaderContext.Provider>
  );
}; 