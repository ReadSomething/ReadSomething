import React, { useState, useEffect, useRef, useCallback } from "react"
import { useReader } from "../context/ReaderContext"
import Settings from "../components/Settings"
import { useI18n } from "../hooks/useI18n"
import { LanguageCode } from "../utils/language"
import { exportAsMarkdown } from "../utils/export"
import AgentUI from "../components/AgentUI"

/**
 * Main Reader component
 * Displays the article in a clean, readable format with a side-by-side AI assistant.
 */
const Reader = () => {
  const { article, settings, isLoading, error, closeReader } = useReader()
  const [showSettings, setShowSettings] = useState(false)
  const [showAISidePanel, setShowAISidePanel] = useState(true) // Default to show AI panel
  const [leftPanelWidth, setLeftPanelWidth] = useState(65) // Default to 65% width for reader
  const readerContentRef = useRef<HTMLDivElement>(null)
  const dividerRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const initialXRef = useRef(0)
  const initialWidthRef = useRef(0)
  const [detectedLanguage, setDetectedLanguage] = useState<LanguageCode>('en')
  const LOG_PREFIX = "[Reader]"
  
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
  
  // Load user preferences
  useEffect(() => {
    try {
      const savedWidth = localStorage.getItem('readerPanelWidth');
      if (savedWidth) {
        setLeftPanelWidth(parseFloat(savedWidth));
      }
      
      const savedShowAI = localStorage.getItem('showAIPanel');
      if (savedShowAI) {
        setShowAISidePanel(savedShowAI === 'true');
      }
    } catch (e) {
      console.error(`${LOG_PREFIX} Error loading preferences:`, e);
    }
  }, []);
  
  // Save user preferences
  useEffect(() => {
    if (isDraggingRef.current) return; // Don't save during drag
    try {
      localStorage.setItem('readerPanelWidth', leftPanelWidth.toString());
      localStorage.setItem('showAIPanel', showAISidePanel.toString());
    } catch (e) {
      console.error(`${LOG_PREFIX} Error saving preferences:`, e);
    }
  }, [leftPanelWidth, showAISidePanel]);
  
  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      // Consider adjusting panel width on small screens
      if (window.innerWidth < 768 && showAISidePanel) {
        // On very small screens, we might want to auto-hide AI panel
        // or adjust the leftPanelWidth to a larger percentage
        if (leftPanelWidth < 40) {
          setLeftPanelWidth(40); // Ensure reader is at least 40% on small screens
        }
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [showAISidePanel, leftPanelWidth]);
  
  // --- Drag Handlers ---
  
  // Start dragging the divider
  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    initialXRef.current = e.clientX;
    initialWidthRef.current = leftPanelWidth;
    
    // Add global event listeners
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', handleDragEnd);
    
    // Set cursor styles during drag
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  // Handle mouse movement during drag
  const handleDrag = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    
    // Use requestAnimationFrame for smoother updates
    requestAnimationFrame(() => {
      const containerWidth = window.innerWidth;
      const deltaX = e.clientX - initialXRef.current;
      const percentageDelta = (deltaX / containerWidth) * 100;
      
      // Calculate new width with constraints (30-85%)
      let newWidth = Math.min(85, Math.max(30, initialWidthRef.current + percentageDelta));
      
      setLeftPanelWidth(newWidth);
    });
  }, []);

  // End dragging
  const handleDragEnd = useCallback(() => {
    isDraggingRef.current = false;
    
    // Remove global event listeners
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', handleDragEnd);
    
    // Reset cursor styles
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [handleDrag]);
  
  // --- Event Handlers ---

  /**
   * Toggles the visibility of the settings panel.
   */
  const toggleSettings = useCallback(() => {
    console.log(`${LOG_PREFIX} Toggling settings panel.`)
    setShowSettings((prev: boolean) => !prev)
  }, []);
  
  /**
   * Toggles the visibility of the AI side panel.
   */
  const toggleAISidePanel = useCallback(() => {
    console.log(`${LOG_PREFIX} Toggling AI side panel.`)
    setShowAISidePanel((prev: boolean) => !prev)
  }, []);
  
  /**
   * Closes the reader view by notifying the background script and dispatching 
   * the internal toggle event (handled by content.tsx).
   */
  const handleClose = useCallback(() => {
    console.log(`${LOG_PREFIX} Closing reader.`)
    // Notify background script about state change before exiting
    chrome.runtime.sendMessage({
      type: "READER_MODE_CHANGED",
      isActive: false
    }).catch(error => console.warn("Failed to send READER_MODE_CHANGED message:", error))
    
    // Dispatch the internal event to trigger removal in content.tsx
    document.dispatchEvent(new CustomEvent('READLITE_TOGGLE_INTERNAL'))
  }, []);

  /**
   * Handles the download of the article as Markdown.
   * Reused from Controls.tsx
   */
  const handleMarkdownDownload = useCallback(() => {
    console.log(`${LOG_PREFIX} Handling Markdown download request.`);
    
    if (article?.title && article.content) {
      try {
        exportAsMarkdown(article.title, article.content);
        console.log(`${LOG_PREFIX} Markdown export initiated for: ${article.title}`);
      } catch (error) {
        console.error(`${LOG_PREFIX} Export to Markdown failed:`, error);
      }
    } else {
      console.error(`${LOG_PREFIX} Cannot export Markdown: Missing article title or content.`);
    }
  }, [article]);

  // --- Styling --- 

  /**
   * Returns the base container style object based on the current theme.
   */
  const getContainerStyle = (): React.CSSProperties => {
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
  const generateThemeCss = (): string => {
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
        color: ${theme === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.5)'};
        background-color: ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'};
        border-radius: 3px;
        pointer-events: none; /* Don't interfere with selecting text */
        z-index: 1; /* Ensure it's above code content */
      }
      pre {
        position: relative; /* Needed for absolute positioning of label */
        /* Add some padding to prevent label overlap with code */
        padding-top: 2em !important; 
      }

      /* Add responsive image styles */
      .reader-content img {
        width: 100%;    /* Forces image to span container width */
        max-width: 100%; /* Still good practice to prevent overflow in rare cases */
        height: auto;   /* Maintains aspect ratio */
        display: block; /* Prevents extra space below image */
        margin-top: 1em; /* Add some space above images */
        margin-bottom: 1em; /* Add some space below images */
      }

      /* Style figure and figcaption */
      .reader-content figure {
        margin: 2em 0; /* Add vertical margin, remove default browser horizontal margin */
        padding: 0;
        width: 100%; /* Ensure figure spans the container width */
        box-sizing: border-box;
      }

      .reader-content figcaption {
        margin-top: 0.5em; /* Space between image and caption */
        padding: 0.3em 0.6em;
        font-size: 0.9em; /* Slightly smaller text */
        font-style: italic; /* Italicize for distinction */
        text-align: center; /* Center the caption text */
        color: ${theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)'}; /* Slightly muted color */
        background-color: ${theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'}; /* Optional subtle background */
        border-radius: 3px;
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

  const containerStyle = getContainerStyle();
  
  // Style for the main container
  const mainContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    ...containerStyle,
  };
  
  // Style for content container
  const contentContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    flexGrow: 1,
    overflow: 'hidden',
    height: '100%', // Take full height
  };
  
  // Style for the reader column (left)
  const readerColumnStyle: React.CSSProperties = {
    width: showAISidePanel ? `${leftPanelWidth}%` : '100%', // Full width when AI panel is hidden
    height: '100%',
    overflowY: 'auto',
    transition: isDraggingRef.current ? 'none' : 'width 0.2s ease-out',
    position: 'relative',
    boxSizing: 'border-box',
  };

  // Style for the AI column (right)
  const aiColumnStyle: React.CSSProperties = {
    width: showAISidePanel ? `${100 - leftPanelWidth}%` : '0%',
    height: '100%',
    overflow: 'hidden',
    transition: isDraggingRef.current ? 'none' : 'width 0.2s ease-out',
    display: 'flex',
    flexDirection: 'column',
  };
  
  // Style for the divider/control bar
  const dividerStyle: React.CSSProperties = {
    width: '8px',
    backgroundColor: settings.theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
    cursor: 'col-resize',
    userSelect: 'none', // Prevent text selection during drag
    transition: 'background-color 0.2s',
    position: 'relative',
    display: showAISidePanel ? 'block' : 'none', // Only show divider when AI panel is visible
  };
  
  // Style for the divider drag handle
  const dividerHandleStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    height: '30px',
    width: '2px',
    backgroundColor: settings.theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
    borderRadius: '1px',
  };

  // Style for toolbar container
  const toolbarStyle: React.CSSProperties = {
    position: 'fixed',
    top: '0',
    right: '0',
    left: '0',
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: '8px 16px',
    background: settings.theme === 'dark' 
      ? 'linear-gradient(to bottom, rgba(32, 32, 32, 0.95), rgba(32, 32, 32, 0))' 
      : settings.theme === 'sepia'
      ? 'linear-gradient(to bottom, rgba(242, 232, 215, 0.95), rgba(242, 232, 215, 0))'
      : settings.theme === 'paper'
      ? 'linear-gradient(to bottom, rgba(247, 247, 247, 0.95), rgba(247, 247, 247, 0))'
      : 'linear-gradient(to bottom, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0))',
    backdropFilter: 'blur(5px)',
    zIndex: 10,
    height: '46px',
    boxSizing: 'border-box',
    transition: 'opacity 0.3s ease',
    opacity: 0.8,
  };
  
  // Style for toolbar buttons
  const toolbarButtonStyle: React.CSSProperties = {
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: 'none',
    background: 'none',
    color: 'currentColor',
    padding: 0,
    marginLeft: '12px',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
    opacity: 0.7,
  };

  const activeButtonStyle: React.CSSProperties = {
    opacity: 1,
    backgroundColor: settings.theme === 'dark' 
      ? 'rgba(255, 255, 255, 0.12)' 
      : 'rgba(0, 0, 0, 0.08)',
  };

  // Style for the reader content
  const contentStyle: React.CSSProperties = {
    lineHeight: settings.lineHeight.toString(),
    fontSize: `${settings.fontSize}px`,
    fontFamily: settings.fontFamily,
    textAlign: settings.textAlign,
    maxWidth: `${settings.width}px`,
    margin: '0 auto',
    padding: '20px 20px 100px 20px',
  };

  return (
    <>
      {/* Inject theme-specific styles globally */}
      <style dangerouslySetInnerHTML={{ __html: generateThemeCss() }} />

      {/* Main Container - the entire screen */}
      <div 
        style={mainContainerStyle}
        data-theme={settings.theme}
      >
        {/* Toolbar */}
        <div 
          style={toolbarStyle}
          onMouseEnter={e => { 
            (e.currentTarget as HTMLDivElement).style.opacity = '1';
          }}
          onMouseLeave={e => { 
            (e.currentTarget as HTMLDivElement).style.opacity = '0.8';
          }}
        >
          {/* Title Indicator - Shows when scrolling */}
          <div style={{ 
            flexGrow: 1, 
            textAlign: 'left',
            fontSize: '0.9rem',
            fontWeight: 'bold',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            opacity: 0.9
          }}>
            {article.title || t('untitledArticle')}
          </div>
          
          {/* AI Assistant Button */}
          <button
            style={{
              ...toolbarButtonStyle,
              ...(showAISidePanel ? activeButtonStyle : {}),
            }}
            onClick={toggleAISidePanel}
            title={showAISidePanel ? t('agent') || 'Hide AI' : t('agent') || 'Show AI'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="currentColor"/>
              <path d="M13 7H11V13H17V11H13V7Z" fill="currentColor"/>
            </svg>
          </button>
          
          {/* Save as Markdown Button */}
          <button
            style={toolbarButtonStyle}
            onClick={handleMarkdownDownload}
            title={t('download') || 'Download'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          {/* Settings Button */}
          <button
            style={{
              ...toolbarButtonStyle,
              ...(showSettings ? activeButtonStyle : {}),
            }}
            onClick={toggleSettings}
            title={t('settings') || 'Settings'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.258 9.77251 19.9887C9.5799 19.7194 9.31074 19.5143 9 19.4C8.69838 19.2669 8.36381 19.2272 8.03941 19.286C7.71502 19.3448 7.41568 19.4995 7.18 19.73L7.12 19.79C6.93425 19.976 6.71368 20.1235 6.47088 20.2241C6.22808 20.3248 5.96783 20.3766 5.705 20.3766C5.44217 20.3766 5.18192 20.3248 4.93912 20.2241C4.69632 20.1235 4.47575 19.976 4.29 19.79C4.10405 19.6043 3.95653 19.3837 3.85588 19.1409C3.75523 18.8981 3.70343 18.6378 3.70343 18.375C3.70343 18.1122 3.75523 17.8519 3.85588 17.6091C3.95653 17.3663 4.10405 17.1457 4.29 16.96L4.35 16.9C4.58054 16.6643 4.73519 16.365 4.794 16.0406C4.85282 15.7162 4.81312 15.3816 4.68 15.08C4.55324 14.7842 4.34276 14.532 4.07447 14.3543C3.80618 14.1766 3.49179 14.0813 3.17 14.08H3C2.46957 14.08 1.96086 13.8693 1.58579 13.4942C1.21071 13.1191 1 12.6104 1 12.08C1 11.5496 1.21071 11.0409 1.58579 10.6658C1.96086 10.2907 2.46957 10.08 3 10.08H3.09C3.42099 10.0723 3.742 9.96512 4.0113 9.77251C4.28059 9.5799 4.48572 9.31074 4.6 9C4.73312 8.69838 4.77282 8.36381 4.714 8.03941C4.65519 7.71502 4.50054 7.41568 4.27 7.18L4.21 7.12C4.02405 6.93425 3.87653 6.71368 3.77588 6.47088C3.67523 6.22808 3.62343 5.96783 3.62343 5.705C3.62343 5.44217 3.67523 5.18192 3.77588 4.93912C3.87653 4.69632 4.02405 4.47575 4.21 4.29C4.39575 4.10405 4.61632 3.95653 4.85912 3.85588C5.10192 3.75523 5.36217 3.70343 5.625 3.70343C5.88783 3.70343 6.14808 3.75523 6.39088 3.85588C6.63368 3.95653 6.85425 4.10405 7.04 4.29L7.1 4.35C7.33568 4.58054 7.63502 4.73519 7.95941 4.794C8.28381 4.85282 8.61838 4.81312 8.92 4.68H9C9.29577 4.55324 9.54802 4.34276 9.72569 4.07447C9.90337 3.80618 9.99872 3.49179 10 3.17V3C10 2.46957 10.2107 1.96086 10.5858 1.58579C10.9609 1.21071 11.4696 1 12 1C12.5304 1 13.0391 1.21071 13.4142 1.58579C13.7893 1.96086 14 2.46957 14 3V3.09C14.0013 3.41179 14.0966 3.72618 14.2743 3.99447C14.452 4.26276 14.7042 4.47324 15 4.6C15.3016 4.73312 15.6362 4.77282 15.9606 4.714C16.285 4.65519 16.5843 4.50054 16.82 4.27L16.88 4.21C17.0657 4.02405 17.2863 3.87653 17.5291 3.77588C17.7719 3.67523 18.0322 3.62343 18.295 3.62343C18.5578 3.62343 18.8181 3.67523 19.0609 3.77588C19.3037 3.87653 19.5243 4.02405 19.71 4.21C19.896 4.39575 20.0435 4.61632 20.1441 4.85912C20.2448 5.10192 20.2966 5.36217 20.2966 5.625C20.2966 5.88783 20.2448 6.14808 20.1441 6.39088C20.0435 6.63368 19.896 6.85425 19.71 7.04L19.65 7.1C19.4195 7.33568 19.2648 7.63502 19.206 7.95941C19.1472 8.28381 19.1869 8.61838 19.32 8.92V9C19.4468 9.29577 19.6572 9.54802 19.9255 9.72569C20.1938 9.90337 20.5082 9.99872 20.83 10H21C21.5304 10 22.0391 10.2107 22.4142 10.5858C22.7893 10.9609 23 11.4696 23 12C23 12.5304 22.7893 13.0391 22.4142 13.4142C22.0391 13.7893 21.5304 14 21 14H20.91C20.5882 14.0013 20.2738 14.0966 20.0055 14.2743C19.7372 14.452 19.5268 14.7042 19.4 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          {/* Close Reader Button */}
          <button
            style={toolbarButtonStyle}
            onClick={handleClose}
            title={t('close') || 'Close'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        
        {/* Content Container - holds the two columns */}
        <div style={contentContainerStyle}>
          {/* Reader Column (left side) */}
          <div style={readerColumnStyle}>
            {/* Reader Content Area */}
            <div 
              ref={readerContentRef}
              style={{
                ...contentStyle,
                // Add padding at top to compensate for the toolbar
                paddingTop: '50px',
              }}
              className={`reader-content lang-${detectedLanguage}`}
            >
              {!error && article?.title && (
                <h1 style={{ 
                  fontSize: `${Math.max(24, settings.fontSize * 1.5)}px`, 
                  fontWeight: 'bold',
                  marginBottom: '1.5em' 
                }}>
                  {article.title}
                </h1>
              )}
              {!error && article?.content && (
                <div dangerouslySetInnerHTML={{ __html: article.content }} />
              )}
            </div>
          </div>

          {/* Divider - only shown when AI panel is visible */}
          {showAISidePanel && (
            <div 
              ref={dividerRef}
              style={{
                ...dividerStyle,
                backgroundColor: isDraggingRef.current 
                  ? (settings.theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)')
                  : (settings.theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'),
              }}
              onMouseDown={handleDragStart}
            >
              {/* Vertical drag handle line */}
              <div style={dividerHandleStyle} />
            </div>
          )}

          {/* AI Column (right side) - only rendered when showAISidePanel is true */}
          {showAISidePanel && (
            <div style={aiColumnStyle}>
              <AgentUI 
                theme={settings.theme}
                onClose={toggleAISidePanel}
                isVisible={showAISidePanel}
                initialMessage="How can I help you understand this article better?"
              />
            </div>
          )}
        </div>
      </div>

      {/* Settings Panel (Overlay) */}
      {showSettings && (
        <Settings
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
  )
}

export default Reader