import React, { useState, useEffect } from "react"
import { useReader } from "../../context/ReaderContext"
import { useI18n } from "../../hooks/useI18n"
import { FontOption, fontOptions, widthOptions, spacingOptions, alignmentOptions } from "../../config/ui"
import { LanguageCode } from "../../utils/language"
import { getLanguageDisplayName } from "../../utils/i18n"
import { getSettingsColors } from "../../config/theme"
import ThemeSection from "./sections/ThemeSection"
import FontSizeSection from "./sections/FontSizeSection"
import FontFamilySection from "./sections/FontFamilySection"
import WidthSection from "./sections/WidthSection"
import AlignmentSection from "./sections/AlignmentSection"
import SpacingSection from "./sections/SpacingSection"

interface SettingsProps {
  onClose: () => void;
  buttonRef?: React.RefObject<HTMLButtonElement | null>;
}

/**
 * Settings component
 * Allows customization of reader appearance with Kindle-style UI
 * Uses Tailwind CSS responsive classes for fully responsive design
 */
const Settings: React.FC<SettingsProps> = ({ onClose, buttonRef }) => {
  const { settings, updateSettings, article } = useReader()
  const { t, uiLanguage } = useI18n()
  const [detectedLanguage, setDetectedLanguage] = useState<LanguageCode | null>(null)
  const LOG_PREFIX = "[SettingsPanel]";
  
  // Get button position for panel positioning
  const [buttonPosition, setButtonPosition] = useState<{ top: number; right: number } | null>(null);
  
  // Track button position for panel placement
  useEffect(() => {
    if (buttonRef?.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setButtonPosition({
        top: rect.top,
        right: window.innerWidth - rect.right
      });
    }
  }, [buttonRef]);

  // Update position when window resizes
  useEffect(() => {
    const handleResize = () => {
      if (buttonRef?.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setButtonPosition({
          top: rect.top,
          right: window.innerWidth - rect.right
        });
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [buttonRef]);
  
  // Detect article language using the language property from parser
  useEffect(() => {
    if (article?.language) {
      const lang = article.language as LanguageCode;
      console.log(`${LOG_PREFIX} Detected content language: ${lang}`);
      setDetectedLanguage(lang);
    }
  }, [article]);
  
  // Get colors from theme system
  const colors = getSettingsColors(settings.theme)
  
  // Calculate panel position based on button location
  const getPanelPositionStyle = () => {
    // On small screens, use full screen mode
    if (window.innerWidth < 640) return {};
    
    if (buttonPosition) {
      const topPosition = Math.min(buttonPosition.top + 45, window.innerHeight - 500);
      const rightPosition = buttonPosition.right + 10;
      
      return {
        top: `${topPosition}px`,
        right: `${rightPosition}px`,
        position: 'fixed' as const
      };
    }
    
    // Default position if button position is not available
    return {
      top: '80px',
      right: '20px',
      position: 'fixed' as const
    };
  };
  
  // Create a refined border color with lower opacity for more subtle dividers
  const subtleBorderColor = `${colors.border}40`; // Adding 40 for 25% opacity
  
  return (
    <div 
      className="fixed sm:static sm:w-[320px] md:w-[350px] sm:rounded-lg sm:border sm:shadow-lg 
                inset-0 sm:inset-auto z-[2147483646]
                flex flex-col overflow-auto text-sm"
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        borderColor: colors.border,
        ...getPanelPositionStyle()
      }}
    >
      <div className="flex justify-between items-center p-3 py-3 sm:py-3 border-b" 
           style={{ borderColor: subtleBorderColor }}>
        <h2 className="m-0 text-base sm:text-sm font-medium">
          {t('displaySettings')}
        </h2>
        <div className="flex gap-3 sm:gap-2 items-center">
          <button 
            onClick={onClose}
            className="bg-transparent border-none text-xl sm:text-lg p-1.5 sm:p-1 
                      cursor-pointer text-current ml-2 flex items-center justify-center opacity-70 hover:opacity-100"
            aria-label={t('close')}
          >
            ✕
          </button>
        </div>
      </div>
      
      <div className="max-h-[calc(100%-60px)] sm:max-h-[calc(100vh-160px)] overflow-y-auto flex-1">
        <div style={{ borderColor: subtleBorderColor }}>
          {/* Theme Section */}
          <ThemeSection 
            sectionClassName="p-3 border-b"
            titleClassName="m-0 mb-2.5 text-sm sm:text-xs font-medium text-opacity-90"
            colors={colors}
            settings={settings}
            t={t}
            updateSettings={updateSettings}
          />

          {/* Font Size Section */}
          <FontSizeSection
            sectionClassName="p-3 border-b"
            titleClassName="m-0 mb-2.5 text-sm sm:text-xs font-medium text-opacity-90"
            colors={colors}
            settings={settings}
            t={t}
            updateSettings={updateSettings}
          />

          {/* Font Family Section */}
          <FontFamilySection
            sectionClassName="p-3 border-b"
            titleClassName="m-0 mb-2.5 text-sm sm:text-xs font-medium text-opacity-90"
            colors={colors}
            settings={settings}
            t={t}
            uiLanguage={uiLanguage}
            detectedLanguage={detectedLanguage}
            updateSettings={updateSettings}
          />

          {/* Width Section */}
          <WidthSection
            sectionClassName="p-3 border-b"
            titleClassName="m-0 mb-2.5 text-sm sm:text-xs font-medium text-opacity-90"
            colors={colors}
            settings={settings}
            t={t}
            updateSettings={updateSettings}
          />

          {/* Text Alignment Section */}
          <AlignmentSection
            sectionClassName="p-3 border-b"
            titleClassName="m-0 mb-2.5 text-sm sm:text-xs font-medium text-opacity-90"
            colors={colors}
            settings={settings}
            t={t}
            uiLanguage={uiLanguage}
            updateSettings={updateSettings}
          />

          {/* Line Spacing Section */}
          <SpacingSection
            sectionClassName="p-3 border-b sm:border-b-0"
            titleClassName="m-0 mb-2.5 text-sm sm:text-xs font-medium text-opacity-90"
            colors={colors}
            settings={settings}
            t={t}
            updateSettings={updateSettings}
          />
        </div>
        
        {/* Safe area for iOS devices to avoid notch/home indicator */}
        <div className="pb-[env(safe-area-inset-bottom,20px)] sm:pb-0" />
      </div>
    </div>
  )
}

export default Settings 