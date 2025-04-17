import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { 
  ThemeType, 
  AgentColors, 
  SettingsColors, 
  ReaderColors, 
  getAgentColors, 
  getSettingsColors, 
  getReaderColors, 
  applyTheme 
} from '../config/theme';

// 主题上下文类型
interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  getAgentColors: () => AgentColors;
  getUIColors: () => SettingsColors;
  getReaderColors: () => ReaderColors;
}

// 创建上下文
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// 主题提供者属性
interface ThemeProviderProps {
  children: ReactNode;
  initialTheme?: ThemeType;
  currentTheme?: ThemeType;
}

/**
 * 主题提供者组件
 * 管理应用的主题状态并提供主题颜色给子组件
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ 
  children, 
  initialTheme = 'light',
  currentTheme
}) => {
  // 主题状态 - 如果提供了currentTheme就使用它，否则使用内部状态
  const [internalTheme, setInternalTheme] = useState<ThemeType>(initialTheme);
  
  // 使用外部主题或内部状态
  const theme = currentTheme || internalTheme;
  const setTheme = (newTheme: ThemeType) => {
    // 如果提供了currentTheme prop，则内部状态变更不应生效
    // 因为主题由外部控制
    if (!currentTheme) {
      setInternalTheme(newTheme);
    } else {
      console.log('[ThemeProvider] External theme control active - internal state change ignored');
    }
  };
  
  // 当外部主题变化时更新内部状态(仅日志记录用)
  useEffect(() => {
    if (currentTheme) {
      console.log(`[ThemeProvider] External theme update: ${currentTheme}`);
    }
  }, [currentTheme]);
  
  // 应用主题 - 当主题变化时更新CSS变量和类名
  useEffect(() => {
    // 应用主题颜色到CSS变量
    applyTheme(theme);
    
    // 保存主题偏好到本地存储
    try {
      localStorage.setItem('readlite-theme', theme);
    } catch (e) {
      console.error('[ThemeProvider] Error saving theme preference:', e);
    }
  }, [theme]);
  
  // 在初始渲染时加载保存的主题(仅当未提供currentTheme时)
  useEffect(() => {
    if (!currentTheme) {
      try {
        const savedTheme = localStorage.getItem('readlite-theme') as ThemeType | null;
        if (savedTheme && ['light', 'dark', 'sepia', 'paper'].includes(savedTheme)) {
          setInternalTheme(savedTheme);
        }
      } catch (e) {
        console.error('[ThemeProvider] Error loading theme preference:', e);
      }
    }
  }, [currentTheme]);
  
  // 为Agent UI获取颜色 - 使用useMemo优化性能
  const getAgentThemeColors = useMemo(() => {
    return () => getAgentColors(theme);
  }, [theme]);
  
  // 为设置面板获取颜色
  const getUIColors = useMemo(() => {
    return () => getSettingsColors(theme);
  }, [theme]);
  
  // 为阅读器获取颜色
  const getReaderThemeColors = useMemo(() => {
    return () => getReaderColors(theme);
  }, [theme]);
  
  // 构建上下文值对象，当任何依赖项变化时才会重新创建
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
 * 使用主题的自定义钩子
 * 提供对主题状态和颜色的访问
 */
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}; 