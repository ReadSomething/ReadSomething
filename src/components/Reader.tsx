import React, { useState, useEffect, useRef, useCallback } from "react"
import { useReader } from "../context/ReaderContext"
import Settings from "./settings/Settings"
import { useI18n } from "../context/I18nContext"
import { LanguageCode } from "../utils/language"
import { exportAsMarkdown } from "../utils/export"
import AgentUI from "./agent"
import ReaderToolbar from "~/components/reader/ReaderToolbar"
import ReaderContent from "~/components/ReaderContent"
import ReaderDivider from "~/components/reader/ReaderDivider"
import { ThemeProvider, useTheme } from "../context/ThemeContext"
import { ThemeType } from "../config/theme"
import { createLogger } from "~/utils/logger"

// Create a logger for this module
const logger = createLogger('main-reader');

/**
 * Reading Progress Indicator Component
 * Shows a progress bar at the top of the reader
 */
const ReadingProgress: React.FC<{ scrollContainer?: HTMLElement | null }> = ({ scrollContainer }) => {
  const [progress, setProgress] = useState(0);
  const { theme } = useTheme();
  
  // Update progress as user scrolls
  useEffect(() => {
    if (!scrollContainer) return;
    
    const handleScroll = () => {
      // Get scroll position, account for container height and content scroll height
      const scrollPosition = scrollContainer.scrollTop;
      const containerHeight = scrollContainer.clientHeight;
      const scrollHeight = scrollContainer.scrollHeight - containerHeight;
      
      // Calculate progress as percentage
      const currentProgress = Math.min(100, Math.max(0, (scrollPosition / scrollHeight) * 100));
      setProgress(currentProgress);
    };
    
    // Set initial progress
    handleScroll();
    
    // Add scroll listener
    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [scrollContainer]);
  
  // Don't render if no valid scroll container
  if (!scrollContainer) return null;
  
  return (
    <div className="fixed top-0 left-0 w-full h-1 z-50 bg-accent/20">
      <div 
        className={`h-full transition-all duration-150 ease-out bg-accent`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

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
  
  // Reader column ref for progress indicator
  const readerColumnRef = useRef<HTMLDivElement>(null);
  
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
      localStorage.setItem('showAIPanel', showAgent.toString());
    } catch (e) {
      logger.error(`Error saving preferences:`, e);
    }
  }, [showAgent]);
  
  // Save panel width when it changes, but not during dragging
  useEffect(() => {
    if (isDraggingRef.current) return; // Don't save during drag
    try {
      localStorage.setItem('readerPanelWidth', leftPanelWidth.toString());
    } catch (e) {
      logger.error(`Error saving panel width:`, e);
    }
  }, [leftPanelWidth]);
  
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
    
    // Get the correct document object (iframe or parent document)
    const eventTarget = e.target as HTMLElement;
    const targetDoc = eventTarget?.ownerDocument || document;
    
    // Add global event listeners to the correct document
    targetDoc.addEventListener('mousemove', handleDrag, { capture: true });
    targetDoc.addEventListener('mouseup', handleDragEnd, { capture: true });
    
    // Set cursor styles during drag
    targetDoc.body.style.cursor = 'col-resize';
    targetDoc.body.style.userSelect = 'none';
  };

  // Handle mouse movement during drag
  const handleDrag = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    
    // Use requestAnimationFrame for smoother updates
    requestAnimationFrame(() => {
      // Get the container element to calculate width
      const containerElement = readerContainerRef.current;
      // Fallback to window width if container not found
      const containerWidth = containerElement?.clientWidth || window.innerWidth;
      
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
    
    // Get the correct document object (may be different when ending the drag)
    const docs = [document]; 
    
    // If we're in an iframe, also try to get the iframe document
    try {
      const iframe = document.getElementById('readlite-iframe-container') as HTMLIFrameElement;
      if (iframe?.contentDocument) {
        docs.push(iframe.contentDocument);
      }
    } catch (e) {
      // Ignore errors accessing iframe document
    }
    
    // Remove listeners and reset styles from all potential documents
    docs.forEach(doc => {
      doc.removeEventListener('mousemove', handleDrag, { capture: true });
      doc.removeEventListener('mouseup', handleDragEnd, { capture: true });
      
      // Reset cursor styles
      if (doc.body) {
        doc.body.style.cursor = '';
        doc.body.style.userSelect = '';
      }
    });
    
    // Now that dragging is complete, save the width setting
    try {
      localStorage.setItem('readerPanelWidth', leftPanelWidth.toString());
    } catch (e) {
      logger.error(`Error saving panel width after drag:`, e);
    }
  }, [handleDrag, leftPanelWidth]);
  
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
          className="flex justify-center items-center h-screen w-screen bg-primary text-primary"
          data-theme={theme}
        >
          <div className="flex flex-col items-center">
            <div className="mb-4 animate-pulse">
              {/* Book icon SVG */}
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 19.5C4 18.837 4.26339 18.2011 4.73223 17.7322C5.20107 17.2634 5.83696 17 6.5 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6.5 2H20V22H6.5C5.83696 22 5.20107 21.7366 4.73223 21.2678C4.26339 20.7989 4 20.163 4 19.5V4.5C4 3.83696 4.26339 3.20107 4.73223 2.73223C5.20107 2.26339 5.83696 2 6.5 2V2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-current font-medium">{t('extractingArticle')}</p>
            <div className="mt-4 w-16 h-1 bg-accent/20 rounded-full overflow-hidden">
              <div className="h-full bg-accent w-1/2 animate-loading"></div>
            </div>
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
          className="flex justify-center items-center h-screen w-screen bg-primary text-primary"
          data-theme={theme}
        >
          <div className="flex flex-col items-center max-w-md mx-auto p-4 rounded-lg">
            <div className="mb-4 text-error">
              {/* Error icon SVG */}
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15 9L9 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 9L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-current text-center font-medium">{error || t('couldNotExtract')}</p>
            <button 
              onClick={handleClose}
              className="mt-6 px-4 py-2 bg-accent/10 hover:bg-accent/20 text-accent rounded-md transition-colors"
            >
              {t('returnToPage')}
            </button>
          </div>
        </div>
      </ThemeProvider>
    )
  }
  
  // --- Main Render --- 

  return (
    <ThemeProvider currentTheme={theme}>
      {/* Reading Progress Indicator */}
      <ReadingProgress scrollContainer={readerColumnRef.current} />

      {/* Main Container - the entire screen */}
      <div 
        ref={readerContainerRef}
        className="readlite-reader-container bg-primary text-primary flex flex-col w-full h-full overflow-hidden relative"
        data-theme={theme}
      >
        {/* Content Container - holds the two columns */}
        <div className="flex flex-row flex-grow h-full">
          {/* Reader Column (left side) */}
          <div 
            ref={readerColumnRef}
            className={`h-full overflow-y-auto relative box-border scrollbar-custom ${
              showAgent ? "" : "w-full"
            } ${isDraggingRef.current ? '' : 'transition-all duration-200 ease-out'}`}
            style={{
              width: showAgent ? `${leftPanelWidth}%` : undefined
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
              isDragging={isDraggingRef.current}
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
              className={`h-full flex flex-col relative overflow-y-auto border-l border-border ${isDraggingRef.current ? '' : 'transition-all duration-200 ease-out'}`}
              style={{
                width: `${100 - leftPanelWidth}%`
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