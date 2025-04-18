import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { 
  ThemeType, 
  AgentColors, 
  SettingsColors, 
  ReaderColors, 
  getAgentColors, 
  getSettingsColors, 
  getReaderColors, 
  applyTheme,
  AVAILABLE_THEMES
} from '../config/theme';

import { createLogger } from "~/utils/logger";

const logger = createLogger('context');

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  getAgentColors: () => AgentColors;
  getUIColors: () => SettingsColors;
  getReaderColors: () => ReaderColors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  initialTheme?: ThemeType;
  currentTheme?: ThemeType;
}

/**
 * ThemeProvider is a component that provides the theme context to the application.
 * It manages the application's theme state and provides theme colors to child components.
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  initialTheme = 'light',
  currentTheme
}) => {
  // The theme state - if currentTheme is provided, use it, otherwise use the internal state
  const [internalTheme, setInternalTheme] = useState<ThemeType>(initialTheme);
  
  // Use the external theme or the internal state
  const theme = currentTheme || internalTheme;
  const setTheme = (newTheme: ThemeType) => {
    // If the currentTheme prop is provided, the internal state change should not be applied
    // because the theme is controlled externally
    if (!currentTheme) {
      setInternalTheme(newTheme);
    } else {
      logger.info('[ThemeProvider] External theme control active - internal state change ignored');
    }
  };
  
  // When the external theme changes, update the internal state (only for logging purposes)
  useEffect(() => {
    if (currentTheme) {
      logger.info(`[ThemeProvider] External theme update: ${currentTheme}`);
    }
  }, [currentTheme]);
  
  // Apply the theme - when the theme changes, update the CSS variables and class names
  useEffect(() => {
    // Apply the theme colors to the CSS variables
    applyTheme(theme);
    
    // Save the theme preference to local storage
    try {
      localStorage.setItem('readlite-theme', theme);
    } catch (e) {
      logger.error('[ThemeProvider] Error saving theme preference:', e);
    }
  }, [theme]);
  
  // Load the saved theme on initial render (only if currentTheme is not provided)
  useEffect(() => {
    if (!currentTheme) {
      try {
        const savedTheme = localStorage.getItem('readlite-theme') as ThemeType | null;
        if (savedTheme && AVAILABLE_THEMES.includes(savedTheme as ThemeType)) {
          setInternalTheme(savedTheme as ThemeType);
        }
      } catch (e) {
        logger.error('[ThemeProvider] Error loading theme preference:', e);
      }
    }
  }, [currentTheme]);
  
  // Get the Agent UI colors - use useMemo to optimize performance
  const getAgentThemeColors = useMemo(() => {
    return () => getAgentColors(theme);
  }, [theme]);
  
  // Get the UI colors for the settings panel
  const getUIColors = useMemo(() => {
    return () => getSettingsColors(theme);
  }, [theme]);
  
  // Get the colors for the reader
  const getReaderThemeColors = useMemo(() => {
    return () => getReaderColors(theme);
  }, [theme]);
  
  // Build the context value object, only re-create when any dependencies change
  const contextValue = useMemo(() => ({
    theme,
    setTheme,
    getAgentColors: getAgentThemeColors,
    getUIColors,
    getReaderColors: getReaderThemeColors,
  }), [theme, getAgentThemeColors, getUIColors, getReaderThemeColors]);
  
  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Use the theme custom hook
 * Provides access to the theme state and colors
 */
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}; 