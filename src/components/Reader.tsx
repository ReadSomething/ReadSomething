import React, { useState, useEffect, useRef, useCallback } from "react"
import { useReader } from "../context/ReaderContext"
import Settings from "./settings/Settings"
import { useI18n } from "../hooks/useI18n"
import { LanguageCode } from "../utils/language"
import { exportAsMarkdown } from "../utils/export"
import AgentUI from "./agent"
import ReaderToolbar from "~/components/reader/ReaderToolbar"
import ReaderContent from "~/components/ReaderContent"
import ReaderDivider from "~/components/reader/ReaderDivider"
import ThemeStyles from "~/components/reader/ThemeStyles"
import { ThemeProvider } from "../context/ThemeContext"
import { ThemeType, cssVarNames } from "../config/theme"
import { createLogger } from "../utils/logger"

// Create a logger for this module
const logger = createLogger('main-reader');


/**
 * Main Reader component
 * Displays the article in a clean, readable format with a side-by-side AI assistant.
 */
const Reader = () => {
  const { article, settings, isLoading, error, closeReader } = useReader()
  const [showSettings, setShowSettings] = useState(false)
  const [showAgent, setShowAgent] = useState(false)
  const [leftPanelWidth, setLeftPanelWidth] = useState(65) // Default to 65% width for reader
  const [visibleContent, setVisibleContent] = useState<string>('') // State for visible content
  const readerContentRef = useRef<HTMLDivElement>(null)
  const dividerRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const initialXRef = useRef(0)
  const initialWidthRef = useRef(0)
  const settingsButtonRef = useRef<HTMLButtonElement>(null) as React.RefObject<HTMLButtonElement>
  const [detectedLanguage, setDetectedLanguage] = useState<LanguageCode>('en')
  
  // Get translations function
  const { t } = useI18n()
  
  // 引用StyleIsolator创建的shadowRoot
  const readerContainerRef = useRef<HTMLDivElement>(null);
  
  // Extract current theme from settings for use with ThemeProvider
  const theme = settings.theme as ThemeType;
  
  // --- Effects ---

  // Detect article language when article data is available
  useEffect(() => {
    if (article?.language) {
      // Language code is already normalized in detectLanguage function
      const lang = article.language as LanguageCode;
      setDetectedLanguage(lang);
    }
  }, [article?.language]);
  
  // Load user preferences
  useEffect(() => {
    try {
      const savedWidth = localStorage.getItem('readerPanelWidth');
      if (savedWidth) {
        setLeftPanelWidth(parseFloat(savedWidth));
      }
      
      const savedShowAI = localStorage.getItem('showAIPanel');
      if (savedShowAI) {
        setShowAgent(savedShowAI === 'true');
      }
    } catch (e) {
      logger.error(`Error loading preferences:`, e);
    }
  }, []);
  
  // Save user preferences
  useEffect(() => {
    if (isDraggingRef.current) return; // Don't save during drag
    try {
      localStorage.setItem('readerPanelWidth', leftPanelWidth.toString());
      localStorage.setItem('showAIPanel', showAgent.toString());
    } catch (e) {
      logger.error(`Error saving preferences:`, e);
    }
  }, [leftPanelWidth, showAgent]);
  
  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      // Consider adjusting panel width on small screens
      if (window.innerWidth < 768 && showAgent) {
        // On very small screens, we might want to auto-hide AI panel
        // or adjust the leftPanelWidth to a larger percentage
        if (leftPanelWidth < 40) {
          setLeftPanelWidth(40); // Ensure reader is at least 40% on small screens
        }
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [showAgent, leftPanelWidth]);
  
  // Disable browser scrollbar when Agent panel is open
  useEffect(() => {
    if (showAgent) {
      // Disable browser scrollbar when Agent is open
      document.body.style.overflow = 'hidden';
    } else {
      // Re-enable browser scrollbar when Agent is closed
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      // Ensure scrollbar is re-enabled when component unmounts
      document.body.style.overflow = 'auto';
    };
  }, [showAgent]);
  
  // Extract visible content when scrolling or resizing
  useEffect(() => {
    if (!readerContentRef.current || !article) return;
    
    const readerContent = readerContentRef.current;
    const readerColumn = readerContent.parentElement;
    
    if (!readerColumn) return;
    
    // Keep track of last processed scroll position
    let lastScrollTop = readerColumn.scrollTop;
    let lastProcessedTime = Date.now();
    let scrollCounter = 0;
    let forceUpdateCounter = 0; // Counter for periodic updates
    
    // Function to extract visible content from the DOM
    const extractVisibleContent = () => {
      // Skip processing if scroll hasn't moved enough (at least 50px or 500ms passed)
      const currentScrollTop = readerColumn.scrollTop;
      const scrollDelta = Math.abs(currentScrollTop - lastScrollTop);
      const timeDelta = Date.now() - lastProcessedTime;
      
      forceUpdateCounter++;
      const shouldForceUpdate = forceUpdateCounter >= 10; // Force update every 10 events
      
      if (scrollDelta < 50 && timeDelta < 500 && !shouldForceUpdate) {
        return;
      }
      
      if (shouldForceUpdate) {
        forceUpdateCounter = 0;
      }
      
      scrollCounter++;
      lastScrollTop = currentScrollTop;
      lastProcessedTime = Date.now();
      
      const containerRect = readerContent.getBoundingClientRect();
      if (!containerRect) return;
      
      // Get all text-containing elements in the article content
      const textElements = readerContent.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote');
      
      if (!textElements || textElements.length === 0) {
        return;
      }
      
      // Top and bottom boundaries of the viewport, adjusted for the reader column's scroll position
      const readerScrollTop = readerColumn.scrollTop;
      const readerViewportTop = 0;
      const readerViewportBottom = readerColumn.clientHeight;
      
      let visibleText = '';
      let visibleElementsCount = 0;
      let visibleElementsList = [];
      
      // Always include the article title if available
      if (article.title) {
        visibleText += article.title + '\n\n';
      }
      
      // Loop through elements to find which ones are visible
      textElements.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        const offsetTop = rect.top + readerScrollTop - containerRect.top;
        
        // Check if element is at least partially visible in the reader column
        const elementTop = rect.top;
        const elementBottom = rect.bottom;
        const windowTop = 0;
        const windowBottom = window.innerHeight;
        
        // Simple visibility detection
        const isVisibleSimple = 
          elementBottom > windowTop && 
          elementTop < windowBottom;
        
        // Combined visibility detection methods
        const isVisible = isVisibleSimple || (
          offsetTop < readerViewportBottom &&
          offsetTop + rect.height > readerViewportTop &&
          rect.height > 0
        );
        
        if (isVisible) {
          visibleElementsCount++;
          // Get text content from the element
          let elementText = el.textContent?.trim() || '';
          
          // Add the text with appropriate formatting based on tag
          if (elementText) {
            const tagName = el.tagName.toLowerCase();
            const shortPreview = elementText.substring(0, 30) + (elementText.length > 30 ? '...' : '');
            visibleElementsList.push(`${tagName}: ${shortPreview}`);
            
            // Format based on tag type
            if (tagName.startsWith('h')) {
              // Add formatting for headers
              visibleText += elementText + '\n\n';
            } else if (tagName === 'li') {
              // Add bullet point for list items
              visibleText += '• ' + elementText + '\n';
            } else if (tagName === 'blockquote') {
              // Format blockquotes
              visibleText += '> ' + elementText + '\n\n';
            } else {
              // Regular paragraph
              visibleText += elementText + '\n\n';
            }
          }
        }
      });
      
      // Generate a simple hash for comparison instead of full string comparison
      const contentHash = `${visibleElementsCount}-${visibleText.length}-${visibleText.substring(0, 50)}`;
      const currentContentHash = sessionStorage.getItem('lastVisibleContentHash') || '';
      
      // Update state with the visible content only if significantly changed
      if (contentHash !== currentContentHash || shouldForceUpdate) {
        sessionStorage.setItem('lastVisibleContentHash', contentHash);
        setVisibleContent(visibleText);
      }
    };
    
    // Initial extraction
    extractVisibleContent();
    
    // Force a second extraction after a short delay to ensure DOM is fully rendered
    setTimeout(() => {
      forceUpdateCounter = 100; // Force an update
      extractVisibleContent();
    }, 1000);
    
    // Set up event listeners for scroll and resize
    const handleScroll = () => {
      // Use requestAnimationFrame to avoid performance issues
      requestAnimationFrame(extractVisibleContent);
    };
    
    // Add scroll listener to the reader column
    readerColumn.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);
    
    return () => {
      readerColumn.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      // Clear the hash on unmount
      sessionStorage.removeItem('lastVisibleContentHash');
    };
  }, [article]);
  
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
    setShowSettings((prev: boolean) => !prev)
  }, [setShowSettings]);
  
  /**
   * Toggles the visibility of the AI side panel.
   */
  const toggleAgent = useCallback(() => {
    setShowAgent((prev: boolean) => !prev)
  }, [setShowAgent]);
  
  /**
   * Closes the reader view by notifying the background script and dispatching 
   * the internal toggle event (handled by content.tsx).
   */
  const handleClose = useCallback(() => {
    // Notify background script about state change before exiting
    chrome.runtime.sendMessage({
      type: "READER_MODE_CHANGED",
      isActive: false
    }).catch(error => logger.warn("Failed to send READER_MODE_CHANGED message:", error))
    
    // Dispatch the internal event to trigger removal in content.tsx
    document.dispatchEvent(new CustomEvent('READLITE_TOGGLE_INTERNAL'))
  }, []);

  /**
   * Handles the download of the article as Markdown.
   * Reused from Controls.tsx
   */
  const handleMarkdownDownload = useCallback(() => {
    if (article?.title && article.content) {
      try {
        exportAsMarkdown(article.title, article.content);
      } catch (error) {
        logger.error(`Export to Markdown failed:`, error);
      }
    }
  }, [article]);

  // --- Conditional Rendering --- 

  // Handle loading state
  if (isLoading) {
    return (
      <ThemeProvider currentTheme={theme}>
        <div 
          className="flex justify-center items-center h-screen w-screen"
          style={{ 
            backgroundColor: `var(${cssVarNames.bg.primary})`, 
            color: `var(${cssVarNames.text.primary})`
          }}
          data-theme={theme}
        >
          <div className="flex flex-col items-center">
            <div className="mb-4">
              {/* Book icon SVG */}
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 19.5C4 18.837 4.26339 18.2011 4.73223 17.7322C5.20107 17.2634 5.83696 17 6.5 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6.5 2H20V22H6.5C5.83696 22 5.20107 21.7366 4.73223 21.2678C4.26339 20.7989 4 20.163 4 19.5V4.5C4 3.83696 4.26339 3.20107 4.73223 2.73223C5.20107 2.26339 5.83696 2 6.5 2V2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-current">{t('extractingArticle')}</p>
          </div>
        </div>
      </ThemeProvider>
    )
  }
  
  // Handle error state (article not extracted or other errors)
  if (!article || error) {
    return (
      <ThemeProvider currentTheme={theme}>
        <div 
          className="flex justify-center items-center h-screen w-screen"
          style={{ 
            backgroundColor: `var(${cssVarNames.bg.primary})`, 
            color: `var(${cssVarNames.text.primary})`
          }}
          data-theme={theme}
        >
          <div className="flex flex-col items-center">
            <div className="mb-4 text-red-500">
              {/* Error icon SVG */}
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15 9L9 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 9L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-current">{error || t('couldNotExtract')}</p>
          </div>
        </div>
      </ThemeProvider>
    )
  }
  
  // --- Main Render --- 

  const getReaderContainerStyle = () => {
    return {
      flexDirection: 'column' as const, 
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      backgroundColor: `var(${cssVarNames.bg.primary})`,
      color: `var(${cssVarNames.text.primary})`
    };
  };

  return (
    <ThemeProvider currentTheme={theme}>
      {/* Inject theme-specific styles globally */}
      <ThemeStyles theme={theme} />

      {/* Main Container - the entire screen */}
      <div 
        ref={readerContainerRef}
        className="reader-container"
        style={getReaderContainerStyle()}
        data-theme={theme}
      >
        {/* Content Container - holds the two columns */}
        <div className="flex flex-row flex-grow overflow-hidden h-full">
          {/* Reader Column (left side) */}
          <div 
            className={`h-full overflow-y-auto relative box-border ${
              showAgent ? "" : "w-full"
            }`}
            style={{
              width: showAgent ? `${leftPanelWidth}%` : '100%',
              transition: isDraggingRef.current ? 'none' : 'width 0.2s ease-out'
            }}
          >
            {/* Reader Content Area */}
            <ReaderContent 
              ref={readerContentRef}
              settings={settings}
              article={article}
              detectedLanguage={detectedLanguage}
              error={error}
            />
            
            {/* Toolbar */}
            <ReaderToolbar 
              showAgent={showAgent}
              leftPanelWidth={leftPanelWidth}
              settings={settings}
              toggleAgent={toggleAgent}
              handleMarkdownDownload={handleMarkdownDownload}
              toggleSettings={toggleSettings}
              handleClose={handleClose}
              settingsButtonRef={settingsButtonRef}
              showSettings={showSettings}
              t={t}
            />
          </div>

          {/* Divider - only shown when AI panel is visible */}
          {showAgent && (
            <ReaderDivider 
              ref={dividerRef}
              theme={theme}
              isDragging={isDraggingRef.current}
              onDragStart={handleDragStart}
            />
          )}

          {/* AI Column (right side) - only rendered when showAISidePanel is true */}
          {showAgent && (
            <div 
              className={`h-full overflow-hidden flex flex-col relative ${
                theme === 'dark' 
                  ? 'border-l border-white/[0.07]' 
                  : 'border-l border-black/[0.06]'
              }`}
              style={{
                width: `${100 - leftPanelWidth}%`,
                transition: isDraggingRef.current ? 'none' : 'width 0.2s ease-out'
              }}
            >
              <AgentUI
                onClose={toggleAgent}
                initialMessage={t('welcomeMessage')}
                isVisible={showAgent}
                article={article}
                visibleContent={visibleContent}
                baseFontSize={settings.fontSize}
                baseFontFamily={settings.fontFamily}
                useStyleIsolation={true}
              />
            </div>
          )}
        </div>
      </div>

      {/* Settings Panel (Overlay) */}
      {showSettings && (
        <Settings
          onClose={() => setShowSettings(false)}
          buttonRef={settingsButtonRef}
        />
      )}
    </ThemeProvider>
  )
}

export default Reader