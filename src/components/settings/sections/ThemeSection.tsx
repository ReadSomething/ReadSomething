import React from 'react';

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
  const changeTheme = (theme: "light" | "dark" | "sepia" | "paper") => {
    console.log(`[Settings] Changing theme to: ${theme}`);
    updateSettings({ theme });
  };

  // Get button active classes based on theme
  const getActiveButtonClasses = (isActive: boolean) => {
    if (!isActive) return "";
    
    switch (settings.theme) {
      case "dark": return "bg-[rgba(76,139,245,0.15)]";
      case "sepia": return "bg-[rgba(157,116,77,0.15)]";
      default: return "bg-[rgba(0,119,255,0.07)]";
    }
  };

  return (
    <section className={sectionClassName}>
      <h3 className={titleClassName}>{t('readingTheme')}</h3>
      <div className="flex flex-wrap sm:flex-nowrap gap-1.5">
        {["light", "sepia", "dark", "paper"].map(themeOption => {
          const isActive = settings.theme === themeOption;
          return (
            <button
              key={themeOption}
              onClick={() => changeTheme(themeOption as any)}
              className={`border rounded flex-1 flex flex-col items-center p-1.5 px-2 text-center transition-all text-xs
                        min-w-[calc(33%-6px)] sm:min-w-0 cursor-pointer
                        ${isActive ? `border-[${colors.highlight}] text-[${colors.highlight}] font-medium ${getActiveButtonClasses(isActive)}` 
                                   : `border-[${colors.border}] text-[${colors.text}] font-normal bg-transparent`}`}
            >
              {t(themeOption)}
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default ThemeSection; 