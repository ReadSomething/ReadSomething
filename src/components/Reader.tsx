import React, { useState, useEffect, useRef } from "react"
import { useReader } from "../context/ReaderContext"
import Settings from "../components/Settings"
import Controls from "../components/Controls"
import { useI18n } from "../hooks/useI18n"
import { LanguageCode } from "../utils/language"

/**
 * Main Reader component
 * Displays the article in a clean, readable format with controls and settings.
 */
const Reader = () => {
  const { article, settings, isLoading, error, closeReader } = useReader()
  const [showSettings, setShowSettings] = useState(false)
  const [detectedLanguage, setDetectedLanguage] = useState<LanguageCode>('en')
  const readerContentRef = useRef<HTMLDivElement>(null)
  const LOG_PREFIX = "[Reader]";
  
  // Get translations function
  const { t } = useI18n()
  
  // --- Effects ---

  // Detect article language when article data is available
  useEffect(() => {
    if (article?.language) {
      // Language code is already normalized in detectLanguage function
      const lang = article.language as LanguageCode;
      console.log(`${LOG_PREFIX} Detected article language: ${lang}`);
      setDetectedLanguage(lang);
    }
  }, [article?.language]);
  
  // Apply specific DOM transformations after content rendering
  useEffect(() => {
    if (!readerContentRef.current || !article) return;
    
    console.log(`${LOG_PREFIX} Applying post-render DOM adjustments (e.g., code block labels).`);
    
    // --- Code Block Language Label Handling ---
    // NOTE: This manipulates the DOM directly after React renders.
    // This is necessary because the HTML structure for code blocks 
    // (often <pre> followed by a <div> with language) comes from an external 
    // source (markdown conversion/HTML extraction) and needs adjustment for styling.
    // Ideally, the HTML generation step would create the desired structure directly.
    try {
      const codeBlocks = readerContentRef.current.querySelectorAll('pre + div');
      console.log(`${LOG_PREFIX} Found ${codeBlocks.length} potential code block language divs.`);
      
      codeBlocks.forEach((langDiv, index) => {
        const pre = langDiv.previousElementSibling as HTMLPreElement;
        // Ensure the previous sibling is indeed a <pre> tag
        if (!pre || pre.tagName !== 'PRE') return;
        
        // Check for language info within the div (often inside <p><span>)
        const langSpan = langDiv.querySelector('p > span, span'); // Check common structures
        if (langSpan?.textContent) {
          const langName = langSpan.textContent.trim();
          console.log(`${LOG_PREFIX} Processing code block ${index} with language: ${langName}`);
          
          // Ensure <pre> can contain the absolutely positioned label
          if (window.getComputedStyle(pre).position === 'static') {
            pre.style.position = 'relative';
          }
          
          // Check if label already exists to prevent duplicates
          const existingLabel = pre.querySelector('.code-lang-label');
          if (!existingLabel) {
            const langLabel = document.createElement('div');
            langLabel.className = 'code-lang-label';
            langLabel.textContent = langName;
            pre.appendChild(langLabel);
            console.log(`${LOG_PREFIX} Added language label '${langName}' to code block ${index}.`);
          } else {
            // Optionally update existing label text if needed
            // existingLabel.textContent = langName; 
          }
          
          // Hide the original language div as we've created a better label
          (langDiv as HTMLElement).style.display = 'none';
        } else {
          console.log(`${LOG_PREFIX} No language span found in div following code block ${index}.`);
        }
      });
    } catch (domError) {
      console.error(`${LOG_PREFIX} Error during code block DOM manipulation:`, domError);
    }

  }, [article]); // Rerun when article content changes
  
  // --- Event Handlers ---

  /**
   * Toggles the visibility of the settings panel.
   */
  const toggleSettings = () => {
    console.log(`${LOG_PREFIX} Toggling settings panel.`);
    setShowSettings(prev => !prev);
  }
  
  /**
   * Closes the reader view by notifying the background script and dispatching 
   * the internal toggle event (handled by content.tsx).
   */
  const handleClose = () => {
    console.log(`${LOG_PREFIX} Closing reader.`);
    // Notify background script about state change before exiting
    chrome.runtime.sendMessage({
      type: "READER_MODE_CHANGED",
      isActive: false
    }).catch(error => console.warn("Failed to send READER_MODE_CHANGED message:", error));
    
    // Dispatch the internal event to trigger removal in content.tsx
    document.dispatchEvent(new CustomEvent('READLITE_TOGGLE_INTERNAL'));
  };

  // --- Styling --- 

  /**
   * Returns the base container style object based on the current theme.
   */
  const getContainerStyle = () => {
    switch (settings.theme) {
      case "dark": return { backgroundColor: "#202020", color: "#E0E0E0" };
      case "sepia": return { backgroundColor: "#F2E8D7", color: "#594A38" };
      case "paper": return { backgroundColor: "#F7F7F7", color: "#333333" };
      default: return { backgroundColor: "#FFFFFF", color: "#2C2C2E" }; // light
    }
  };
  
  /**
   * Generates CSS rules for link colors based on the theme.
   * To be injected into a <style> tag.
   */
  const generateThemeCss = () => {
    const theme = settings.theme;
    let css = ``;
    
    // Base link styles
    css += `
      [data-theme="${theme}"] a { text-decoration: none; }
      [data-theme="${theme}"] a:hover { text-decoration: underline; }
    `;

    // Theme-specific colors
    switch (theme) {
      case "dark":
        css += `
          [data-theme="dark"] a { color: #7BB0FF; }
          [data-theme="dark"] a:visited { color: #AF9CEF; }
          [data-theme="dark"] a:hover { color: #99CCFF; }
          [data-theme="dark"] a:active { color: #5C9AFF; }
        `;
        break;
      case "sepia":
        css += `
          [data-theme="sepia"] a { color: #9D633C; }
          [data-theme="sepia"] a:visited { color: #7A582F; }
          [data-theme="sepia"] a:hover { color: #B37544; }
          [data-theme="sepia"] a:active { color: #86532F; }
        `;
        break;
      case "paper":
        css += `
          [data-theme="paper"] a { color: #505050; }
          [data-theme="paper"] a:visited { color: #707070; }
          [data-theme="paper"] a:hover { color: #303030; }
          [data-theme="paper"] a:active { color: #252525; }
        `;
        break;
      default: // light
        css += `
          [data-theme="light"] a { color: #0077CC; }
          [data-theme="light"] a:visited { color: #6B40BD; }
          [data-theme="light"] a:hover { color: #0055AA; }
          [data-theme="light"] a:active { color: #004488; }
        `;
        break;
    }

    // Add styles for code block language label
    css += `
      .code-lang-label {
        position: absolute;
        top: 0;
        right: 8px; 
        padding: 1px 5px;
        font-size: 0.75em;
        color: ${settings.theme === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.5)'};
        background-color: ${settings.theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'};
        border-radius: 3px;
        pointer-events: none; /* Don't interfere with selecting text */
        z-index: 1; /* Ensure it's above code content */
      }
      pre {
        position: relative; /* Needed for absolute positioning of label */
        /* Add some padding to prevent label overlap with code */
        padding-top: 2em !important; 
      }
    `;

    return css;
  }

  // --- Conditional Rendering --- 

  // Handle loading state
  if (isLoading) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        width: "100vw",
        ...getContainerStyle()
      }}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        }}>
          <div style={{ marginBottom: "16px" }}>
            {/* Book icon SVG */}
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 19.5C4 18.837 4.26339 18.2011 4.73223 17.7322C5.20107 17.2634 5.83696 17 6.5 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6.5 2H20V22H6.5C5.83696 22 5.20107 21.7366 4.73223 21.2678C4.26339 20.7989 4 20.163 4 19.5V4.5C4 3.83696 4.26339 3.20107 4.73223 2.73223C5.20107 2.26339 5.83696 2 6.5 2V2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p style={{ color: "currentColor" }}>{t('extractingArticle')}</p>
        </div>
      </div>
    )
  }
  
  // Handle error state (article not extracted or other errors)
  if (!article || error) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        width: "100vw",
        ...getContainerStyle()
      }}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        }}>
          <div style={{ marginBottom: "16px", color: "red" }}>
            {/* Error icon SVG */}
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15 9L9 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 9L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p style={{ color: "currentColor" }}>{error || t('couldNotExtract')}</p>
        </div>
      </div>
    )
  }
  
  // --- Main Render --- 

  // Adjust content width based on settings
  const readingWidth = settings.width;
  const containerStyle = getContainerStyle();
  
  // Base styles for the content area
  const contentStyle: React.CSSProperties = {
    lineHeight: settings.lineHeight.toString(),
    fontSize: `${settings.fontSize}px`,
    fontFamily: settings.fontFamily,
    textAlign: settings.textAlign,
    maxWidth: `${settings.width}px`,
    margin: '40px auto', // Add top/bottom margin
    paddingBottom: '100px' // Ensure space at the bottom
  };
  
  return (
    <>
      {/* Inject theme-specific styles */}
      <style dangerouslySetInnerHTML={{ __html: generateThemeCss() }} />

      <Controls 
        onToggleSettings={toggleSettings} 
        onClose={handleClose}
        theme={settings.theme} 
        article={article}
      />
      
      {showSettings && (
        <Settings 
          onClose={() => setShowSettings(false)} 
        />
      )}
      
      {/* Main scrollable container */}
      <div 
        style={{
          width: "100%",
          minHeight: "100vh",
          padding: "20px", // Base padding around the content area
          boxSizing: "border-box",
          overflowY: "auto", // Changed from overflow:auto to allow only vertical scroll
          height: "100vh",
          position: "fixed", // Use fixed positioning for the overlay
          top: 0,
          left: 0,
          ...containerStyle // Apply theme background/color
        }}
        data-theme={settings.theme} // Set data-theme for CSS targeting
      >
        {/* Article content area */}
        <div 
          ref={readerContentRef} 
          style={contentStyle}
          className={`reader-content lang-${detectedLanguage}`}
        >
          {article.title && (
            <h1 style={{ 
              fontSize: `${Math.max(24, settings.fontSize * 1.5)}px`, 
              fontWeight: 'bold',
              marginBottom: '1.5em' 
            }}>
              {article.title}
            </h1>
          )}
          {/* 
            Render article content using dangerouslySetInnerHTML.
            IMPORTANT: Assumes article.content has been sanitized 
            during the extraction/parsing process BEFORE reaching this component.
            Failure to sanitize can lead to XSS vulnerabilities.
           */}
          <div dangerouslySetInnerHTML={{ __html: article.content || "" }} />
        </div>
      </div>
    </>
  )
}

export default Reader