import React, { useState, useEffect } from "react"
import { useReader } from "../context/ReaderContext"
import { useI18n } from "../hooks/useI18n"
import { FontOption, fontOptions, widthOptions, spacingOptions, alignmentOptions } from "../config/ui"
import { LanguageCode } from "../utils/language"
import { getLanguageDisplayName } from "../utils/i18n"

interface SettingsProps {
  onClose: () => void;
}

/**
 * Settings component
 * Allows customization of reader appearance with Kindle-style UI
 * Supports responsive design for different screen sizes
 */
const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const { settings, updateSettings, article } = useReader()
  const { t, uiLanguage } = useI18n()
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  const [detectedLanguage, setDetectedLanguage] = useState<LanguageCode | null>(null)
  const LOG_PREFIX = "[SettingsPanel]";
  
  // Update window width on resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }
    
    window.addEventListener('resize', handleResize)
    console.log(`${LOG_PREFIX} Initial window width: ${window.innerWidth}`);
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // Detect article language using the language property from parser
  useEffect(() => {
    if (article?.language) {
      const lang = article.language as LanguageCode;
      console.log(`${LOG_PREFIX} Detected content language: ${lang}`);
      setDetectedLanguage(lang);
    }
  }, [article]);
  
  // Removed storing contentLanguage in settings
  // Just log for debugging purposes
  useEffect(() => {
    if (article?.language) {
      // Only log, no longer saving to settings
    }
  }, [article?.language]);
  
  // Determine if we're on a small screen
  const isSmallScreen = windowWidth <= 600
  const isMediumScreen = windowWidth > 600 && windowWidth <= 960
  
  // Get colors based on theme
  const getColors = () => {
    switch (settings.theme) {
      case "dark":
        return {
          bg: "#202020",          // Safari style dark gray
          text: "#E0E0E0",        // Non-pure white text
          border: "#383838",      // Slightly lighter border
          highlight: "#4C8BF5",   // More gentle blue highlight
          buttonBg: "#2D2D2D",    // Slightly lighter than background button color
          buttonText: "#E0E0E0"   // Same as text button text
        }
      case "sepia":
        return {
          bg: "#F2E8D7",          // Safari style light brown background
          text: "#594A38",        // Brown text
          border: "#E1D5BF",      // Matching border with background
          highlight: "#9D744D",   // Brown highlight
          buttonBg: "#E8DDCB",    // Slightly darker button background
          buttonText: "#594A38"   // Same as text button text
        }
      case "paper":
        return {
          bg: "#F7F7F7",          // Slight gray background
          text: "#333333",        // Dark gray text
          border: "#E0E0E0",      // Light gray border
          highlight: "#656565",   // Medium gray highlight
          buttonBg: "#EEEEEE",    // Slightly darker button background
          buttonText: "#333333"   // Same as text button text
        }
      default:  // light
        return {
          bg: "#FFFFFF",          // Pure white background
          text: "#2C2C2E",        // Dark gray text similar to native Safari
          border: "#E5E5EA",      // Light gray border similar to Safari
          highlight: "#0077FF",   // iOS/Safari style blue
          buttonBg: "#F2F2F7",    // iOS system level light gray background
          buttonText: "#2C2C2E"   // Same as text button text
        }
    }
  }
  
  const colors = getColors()
  
  // Update font family with language-specific handling
  const changeFont = (fontFamily: string) => {
    console.log(`${LOG_PREFIX} Changing font family to: ${fontFamily}`);
    updateSettings({ fontFamily });
  }
  
  // Update theme
  const changeTheme = (theme: "light" | "dark" | "sepia" | "paper") => {
    console.log(`${LOG_PREFIX} Changing theme to: ${theme}`);
    updateSettings({ theme });
  }
  
  // Update width
  const changeWidth = (width: number) => {
    console.log(`${LOG_PREFIX} Changing width to: ${width}`);
    updateSettings({ width });
  }
  
  // Update spacing
  const changeSpacing = (spacing: "tight" | "normal" | "relaxed") => {
    const option = spacingOptions.find(opt => opt.value === spacing)
    if (option) {
      console.log(`${LOG_PREFIX} Changing spacing to: ${spacing} (lineHeight: ${option.lineHeight})`);
      updateSettings({ 
        spacing,
        lineHeight: option.lineHeight
      });
    } else {
      console.warn(`${LOG_PREFIX} Could not find spacing option for value: ${spacing}`);
    }
  }
  
  // Handle text alignment change
  const changeTextAlign = (align: "left" | "justify" | "center" | "right") => {
    console.log(`${LOG_PREFIX} Changing text alignment to: ${align}`);
    updateSettings({ textAlign: align });
  };
  
  // Common styles with responsive adjustments
  const panelStyle: React.CSSProperties = {
    position: "fixed",
    top: isSmallScreen ? "0" : "80px",
    right: isSmallScreen ? "0" : "20px",
    left: isSmallScreen ? "0" : "auto",
    width: isSmallScreen ? "100%" : (isMediumScreen ? "300px" : "320px"),
    height: isSmallScreen ? "100%" : "auto",
    backgroundColor: colors.bg,
    color: colors.text,
    boxShadow: isSmallScreen ? "none" : "0 2px 20px rgba(0,0,0,0.2)",
    zIndex: 2147483646,
    borderRadius: isSmallScreen ? "0" : "8px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column"
  }
  
  const headerStyle: React.CSSProperties = {
    padding: isSmallScreen ? "20px 16px" : "16px",
    borderBottom: `1px solid ${colors.border}`,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  }
  
  const contentStyle: React.CSSProperties = {
    maxHeight: isSmallScreen ? "calc(100% - 60px)" : "calc(100vh - 160px)",
    overflowY: "auto",
    flex: 1
  }
  
  const sectionStyle: React.CSSProperties = {
    padding: "16px",
    borderBottom: `1px solid ${colors.border}`
  }
  
  const sectionTitleStyle: React.CSSProperties = {
    margin: "0 0 16px 0",
    fontSize: isSmallScreen ? "17px" : "16px",
    fontWeight: "600",
    color: colors.text
  }
  
  const optionGroupStyle: React.CSSProperties = {
    display: "flex",
    flexWrap: isSmallScreen ? "wrap" : "nowrap",
    gap: "8px"
  }
  
  /** Base style for option buttons, determining border, background, and text color based on active state. */
  const getBaseOptionButtonStyle = (isActive: boolean): React.CSSProperties => ({
    border: `1px solid ${isActive ? colors.highlight : colors.border}`,
    backgroundColor: isActive ? 
      (settings.theme === "dark" ? "rgba(76, 139, 245, 0.2)" :
       settings.theme === "sepia" ? "rgba(157, 116, 77, 0.2)" :
       "rgba(0, 119, 255, 0.1)") :
      "transparent",
    color: isActive ? colors.highlight : colors.text,
    borderRadius: "4px",
    cursor: "pointer",
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "12px 0", // Default padding
    transition: "all 0.15s ease"
  });

  /** Style for simple text-based option buttons (like Theme) */
  const getSimpleOptionButtonStyle = (isActive: boolean): React.CSSProperties => ({
    ...getBaseOptionButtonStyle(isActive),
    padding: "8px 12px", // Override padding for simpler buttons
    minWidth: isSmallScreen ? "calc(33% - 8px)" : "auto",
    textAlign: "center",
    fontWeight: isActive ? "600" : "normal",
  });
  
  /** Style for Width option buttons */
  const getWidthOptionButtonStyle = (optionValue: number, isActive: boolean): React.CSSProperties => ({
    ...getBaseOptionButtonStyle(isActive),
    // Visualization styles are nested within the button element in JSX
  });

  /** Style for Alignment option buttons */
  const getAlignmentOptionButtonStyle = (optionValue: string, isActive: boolean): React.CSSProperties => ({
    ...getBaseOptionButtonStyle(isActive),
     // Visualization styles are nested within the button element in JSX
  });

  /** Style for Spacing option buttons */
  const getSpacingOptionButtonStyle = (optionValue: string, isActive: boolean): React.CSSProperties => ({
    ...getBaseOptionButtonStyle(isActive),
     // Visualization styles are nested within the button element in JSX
  });
  
  // Filter fonts to display based on language
  const getDisplayedFonts = () => {
    // Use detected language for filtering appropriate fonts
    const contentLanguage = detectedLanguage || 'en';

    console.log("contentLanguage", contentLanguage)
    
    // Filter fonts based on content language
    return fontOptions
      .filter(font => 
        // Show fonts that support the detected content language
        font.compatibleLanguages.includes(contentLanguage)
      )
      // Sort fonts alphabetically based on UI language
      .sort((a, b) => {
        // Use UI language for sorting, not content language
        const aName = uiLanguage === 'zh' ? a.label.zh : a.label.en;
        const bName = uiLanguage === 'zh' ? b.label.zh : b.label.en;
        return aName.localeCompare(bName);
      });
  };
  
  // render font option
  const renderFontOption = (font: FontOption) => {
    // Get current font family
    const currentFontFamily = settings.fontFamily;
    
    // Simplified matching logic
    let isActive = false;
    
    // Match the primary font name
    const primaryCurrentFont = currentFontFamily.split(',')[0].replace(/['"]/g, '').trim();
    const primaryOptionFont = font.value.split(',')[0].replace(/['"]/g, '').trim();
    
    // Check if this font is active
    isActive = primaryCurrentFont === primaryOptionFont ||
               (primaryCurrentFont.includes(primaryOptionFont) && primaryOptionFont.length > 3) ||
               (primaryOptionFont.includes(primaryCurrentFont) && primaryCurrentFont.length > 3);
    
    // Get font display name based on UI language
    const fontDisplayName = uiLanguage === 'zh' ? font.label.zh : font.label.en;
    
    return (
      <button
        key={fontDisplayName}
        onClick={() => changeFont(font.value)}
        style={{
          border: `1px solid ${isActive ? colors.highlight : colors.border}`,
          backgroundColor: isActive ? 
            (settings.theme === "dark" ? "rgba(66, 133, 244, 0.2)" :
            settings.theme === "sepia" ? "rgba(151, 115, 78, 0.1)" :
            "rgba(66, 133, 244, 0.1)") : 
            "transparent",
          borderRadius: "6px",
          minHeight: "52px",
          padding: "10px 12px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          marginBottom: "10px",
          cursor: "pointer",
          transition: "all 0.15s ease-in-out",
          boxShadow: isActive ? `0 2px 6px rgba(0,0,0,0.1)` : 'none',
        }}
      >
        <div style={{
          fontFamily: font.value,
          fontSize: font.compatibleLanguages[0] === 'zh' ? "17px" : "16px",
          fontWeight: "500",
          color: isActive ? colors.highlight : colors.text,
          marginBottom: "0px"
        }}>
          {fontDisplayName}
        </div>
      </button>
    );
  };
  
  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <h2 style={{ margin: 0, fontSize: isSmallScreen ? "20px" : "18px", fontWeight: "normal" }}>
          {t('displaySettings')}
        </h2>
        <div style={{ display: "flex", gap: isSmallScreen ? "16px" : "12px", alignItems: "center" }}>
          <button 
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: isSmallScreen ? "24px" : "20px",
              cursor: "pointer",
              color: colors.text,
              padding: isSmallScreen ? "8px" : "4px",
              marginLeft: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            aria-label={t('close')}
          >
            ✕
          </button>
        </div>
      </div>
      
      <div style={contentStyle}>
        {/* Theme Section */}
        <section style={sectionStyle}>
          <h3 style={sectionTitleStyle}>{t('readingTheme')}</h3>
          <div style={optionGroupStyle}>
            {["light", "sepia", "dark", "paper"].map(themeOption => (
              <button
                key={themeOption}
                onClick={() => changeTheme(themeOption as any)}
                style={getSimpleOptionButtonStyle(settings.theme === themeOption)}
              >
                {t(themeOption)}
              </button>
            ))}
          </div>
        </section>

        {/* Font Size Section */}
        <section style={sectionStyle}>
          <h3 style={sectionTitleStyle}>{t('fontSize')}</h3>
          
          {/* Font size slider with A indicators */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "12px"
          }}>
            <span style={{ 
              fontSize: "14px", 
              width: "24px", 
              textAlign: "center",
              fontWeight: "bold",
              opacity: 0.7
            }}>A</span>
            <input 
              type="range" 
              min="12" 
              max="24" 
              step="1"
              value={settings.fontSize}
              onChange={(e) => {
                const size = parseInt(e.target.value);
                
                // Update global font size
                const updates: Partial<typeof settings> = { fontSize: size };
                
                // Use detected language rather than settings.contentLanguage
                const contentLanguage = detectedLanguage || 'en';
                const languageSettings = settings.languageSettings;
                
                if (contentLanguage && languageSettings[contentLanguage]) {
                  const updatedLangSettings = {
                    ...languageSettings[contentLanguage],
                    fontSize: size
                  };
                  
                  updates.languageSettings = {
                    ...languageSettings,
                    [contentLanguage]: updatedLangSettings
                  };
                }
                
                updateSettings(updates);
              }}
              style={{ 
                flex: "1", 
                margin: "0 10px",
                accentColor: colors.highlight,
                height: isSmallScreen ? "24px" : "auto",
                cursor: "pointer"
              }}
            />
            <span style={{ 
              fontSize: "22px", 
              width: "24px", 
              textAlign: "center",
              fontWeight: "bold",
              opacity: 0.7
            }}>A</span>
          </div>
        
          {/* Current size indicator */}
          <div style={{
            textAlign: "center",
            marginBottom: "4px",
            fontSize: "15px",
            color: colors.highlight,
            fontWeight: "bold"
          }}>
            {t('currentSize')}: {settings.fontSize}px
          </div>
          
          {/* Size indicators */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "0 12px",
            fontSize: "12px",
            opacity: 0.6
          }}>
            <span>12</span>
            <span>16</span>
            <span>20</span>
            <span>24</span>
          </div>
        </section>

        {/* Font Family Section */}
        <section style={sectionStyle}>
          <h3 style={sectionTitleStyle}>{t('font')}</h3>
          
          {/* Display font options based on detected language, using two-column layout */}
          <div style={{ 
            display: "flex", 
            flexDirection: "column",
            gap: "16px"
          }}>
            {/* Select fonts to display based on detected language */}
            {(() => {
              // Get fonts to display
              const fontsToShow = getDisplayedFonts();
              
              // Get content language for title and badge 
              const contentLanguage = detectedLanguage || 'en';
              
              // Generate title text based on detected language
              let titleText = '';
              if (contentLanguage === 'zh') {
                titleText = t('chineseFonts');
              } else if (contentLanguage === 'en') {
                titleText = t('englishFonts');
              } else {
                titleText = t('allFonts');
              }
              
              // Get language display name for the detected badge
              const languageDisplayName = getLanguageDisplayName(contentLanguage, uiLanguage);
              
              // Display in a single column on small screens, and two columns on large screens
              if (isSmallScreen) {
                return (
                  <>
                    <div style={{
                      fontSize: "15px",
                      color: colors.highlight,
                      fontWeight: "bold",
                      marginBottom: "4px",
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span>{titleText}</span>
                      <span style={{
                        fontSize: '12px',
                        opacity: 0.7,
                        fontWeight: 'normal',
                        backgroundColor: settings.theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
                        padding: '4px 8px',
                        borderRadius: '12px'
                      }}>
                        {`${t('detected')}: ${languageDisplayName}`}
                      </span>
                    </div>
                    <div style={{ 
                      display: "flex", 
                      flexDirection: "column", 
                      gap: "10px", 
                    }}>
                      {fontsToShow.map(font => renderFontOption(font))}
                    </div>
                  </>
                );
              }
              
              // Split fonts into two columns (large screens)
              const halfLength = Math.ceil(fontsToShow.length / 2);
              const leftColumn = fontsToShow.slice(0, halfLength);
              const rightColumn = fontsToShow.slice(halfLength);
              
              return (
                <>
                  <div style={{
                    fontSize: "15px",
                    color: colors.highlight,
                    fontWeight: "bold",
                    marginBottom: "8px",
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>{titleText}</span>
                    <span style={{
                      fontSize: '12px',
                      opacity: 0.7,
                      fontWeight: 'normal',
                      backgroundColor: settings.theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
                      padding: '4px 8px',
                      borderRadius: '12px'
                    }}>
                      {`${t('detected')}: ${languageDisplayName}`}
                    </span>
                  </div>
                  <div style={{ 
                    display: "flex", 
                    flexDirection: "row", 
                    gap: "14px", 
                    flexWrap: "wrap",
                  }}>
                    {/* Left column */}
                    <div style={{ flex: "1", minWidth: "45%" }}>
                      {leftColumn.map(font => renderFontOption(font))}
                    </div>
                    
                    {/* Right column */}
                    <div style={{ flex: "1", minWidth: "45%" }}>
                      {rightColumn.map(font => renderFontOption(font))}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </section>

        {/* Width Section with simplified Kindle-style UI */}
        <section style={sectionStyle}>
          <h3 style={sectionTitleStyle}>{t('pageWidth')}</h3>
          
          {/* Simple width option buttons */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "10px"
          }}>
            {widthOptions.map(option => {
              const isActive = settings.width === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => changeWidth(option.value)}
                  style={getWidthOptionButtonStyle(option.value, isActive)}
                >
                  {/* Width visualization */}
                  <div style={{
                    width: option.value === 580 ? "30%" : option.value === 700 ? "50%" : "70%",
                    height: "4px",
                    backgroundColor: isActive ? colors.highlight : colors.text,
                    marginBottom: "8px",
                    borderRadius: "2px",
                    opacity: isActive ? 1 : 0.6
                  }} />
                  {/* Label */}
                  <div style={{
                    fontSize: "14px",
                    color: isActive ? colors.highlight : colors.text,
                    fontWeight: isActive ? "600" : "normal"
                  }}>
                    {t(option.widthClass || (option.label.en.toLowerCase()))}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Text Alignment Section with simplified Kindle-style UI */}
        <section style={sectionStyle}>
          <h3 style={sectionTitleStyle}>{t('textAlignment')}</h3>
          
          {/* Simple alignment option buttons */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "10px"
          }}>
            {alignmentOptions.map(option => {
              const isActive = settings.textAlign === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => changeTextAlign(option.value as any)}
                  style={getAlignmentOptionButtonStyle(option.value, isActive)}
                >
                  {/* Alignment visualization */}
                  <div style={{
                    width: "70%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: option.value === "left" ? "flex-start" : 
                               option.value === "right" ? "flex-end" : 
                               option.value === "center" ? "center" : "stretch",
                    marginBottom: "8px"
                  }}>
                    {[60, 80, 40].map((widthPercent, index) => (
                       <div key={index} style={{
                         height: "3px",
                         width: option.value === "justify" ? "100%" : `${widthPercent}%`, // Justify uses full width
                         backgroundColor: isActive ? colors.highlight : colors.text,
                         marginBottom: "3px",
                         borderRadius: "2px",
                         opacity: isActive ? 1 : 0.6
                       }} />
                    ))}
                  </div>
                  {/* Label */}
                  <div style={{
                    fontSize: "14px",
                    color: isActive ? colors.highlight : colors.text,
                    fontWeight: isActive ? "600" : "normal"
                  }}>
                    {t(option.value) || option.label[uiLanguage as keyof typeof option.label] || option.label.en}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Line Spacing Section with simplified Kindle-style UI */}
        <section style={{...sectionStyle, borderBottom: isSmallScreen ? `1px solid ${colors.border}` : "none"}}>
          <h3 style={sectionTitleStyle}>{t('lineSpacing')}</h3>
          
          {/* Simple spacing option buttons */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "10px"
          }}>
            {spacingOptions.map(option => {
              const isActive = settings.spacing === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => changeSpacing(option.value)}
                  style={getSpacingOptionButtonStyle(option.value, isActive)}
                >
                  {/* Spacing visualization */}
                  <div style={{ 
                    display: "flex", 
                    flexDirection: "column",
                    alignItems: "center",
                    marginBottom: "8px",
                    gap: option.value === "tight" ? "3px" : option.value === "normal" ? "6px" : "9px",
                    width: "60%"
                  }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{
                        height: "3px",
                        width: "100%",
                        backgroundColor: isActive ? colors.highlight : colors.text,
                        borderRadius: "1px",
                        opacity: isActive ? 1 : 0.6
                      }} />
                    ))}
                  </div>
                  {/* Label */}
                  <div style={{
                    fontSize: "14px",
                    color: isActive ? colors.highlight : colors.text,
                    fontWeight: isActive ? "600" : "normal"
                  }}>
                    {t(option.spacingClass || (option.label.en.toLowerCase()))}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
        
        {/* Safe area for iOS devices to avoid notch/home indicator */}
        {isSmallScreen && (
          <div style={{ padding: "env(safe-area-inset-bottom, 20px)" }} />
        )}
      </div>
    </div>
  )
}

export default Settings