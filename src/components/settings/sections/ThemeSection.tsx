import React from 'react';
import { ThemeType, AVAILABLE_THEMES } from '../../../config/theme';
import { createLogger } from "~/utils/logger";

// Create a logger for this module
const logger = createLogger('settings');


interface ThemeSectionProps {
  sectionClassName: string;
  titleClassName: string;
  colors: {
    bg: string;
    text: string;
    border: string;
    highlight: string;
    buttonBg: string;
    buttonText: string;
  };
  settings: any;
  t: (key: string) => string;
  updateSettings: (settings: any) => void;
}

/**
 * Theme selection section in the settings panel
 */
const ThemeSection: React.FC<ThemeSectionProps> = ({
  sectionClassName,
  titleClassName,
  colors,
  settings,
  t,
  updateSettings
}) => {
  // Change the theme
  const changeTheme = (theme: ThemeType) => {
    logger.info(`[Settings] Changing theme to: ${theme}`);
    updateSettings({ theme });
  };

  // Theme options using the centralized list
  const themeOptions: ThemeType[] = AVAILABLE_THEMES;

  // Get button active classes based on theme
  const getActiveButtonClasses = (isActive: boolean) => {
    if (!isActive) return "";
    
    switch (settings.theme) {
      case "dark": return "bg-[rgba(76,139,245,0.15)]";
      case "eyecare": return "bg-[rgba(126,110,86,0.15)]";
      default: return "bg-[rgba(0,119,255,0.07)]";
    }
  };

  return (
    <section className={sectionClassName}>
      <h3 className={titleClassName}>{t('readingTheme')}</h3>
      <div className="flex flex-wrap gap-1.5">
        {themeOptions.map(themeOption => {
          const isActive = settings.theme === themeOption;
          const displayName = t(themeOption) || (
            themeOption === "eyecare" ? "Eye Care" :
            themeOption
          );
          
          return (
            <button
              key={themeOption}
              onClick={() => changeTheme(themeOption)}
              className={`border rounded flex-1 flex flex-col items-center p-1.5 px-2 text-center transition-all text-xs
                        min-w-[calc(33%-6px)] sm:min-w-0 cursor-pointer
                        ${isActive ? `border-[${colors.highlight}] text-[${colors.highlight}] font-medium ${getActiveButtonClasses(isActive)}` 
                                   : `border-[${colors.border}] text-[${colors.text}] font-normal bg-transparent`}`}
            >
              {displayName}
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default ThemeSection; 