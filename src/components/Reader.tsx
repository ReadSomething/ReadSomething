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
import { ThemeProvider } from "../context/ThemeContext"
import { ThemeType } from "../config/theme"
import { createLogger } from "~/utils/logger"
import SelectionToolbar from "./reader/SelectionToolbar"
import { HighlightColor } from "~/hooks/useTextSelection"
import { BookOpenIcon, XCircleIcon } from '@heroicons/react/24/outline';

// Create a logger for this module
const logger = createLogger('main-reader');

/**
 * Reading Progress Indicator Component
 * Shows a progress bar at the top of the reader
 */
const ReadingProgress: React.FC<{ scrollContainer?: HTMLElement | null }> = ({ scrollContainer }) => {
  const [progress, setProgress] = useState(0);
  
  // Update progress as user scrolls
  useEffect(() => {
    if (!scrollContainer) {
      console.log('No scroll container available for progress bar');
      return;
    }
    
    console.log('Progress bar attached to scroll container:', scrollContainer);
    
    const handleScroll = () => {
      // Get scroll position, account for container height and content scroll height
      const scrollPosition = scrollContainer.scrollTop;
      const containerHeight = scrollContainer.clientHeight;
      const scrollHeight = scrollContainer.scrollHeight - containerHeight;
      
      if (scrollHeight <= 0) {
        console.log('Invalid scroll height detected');
        return;
      }
      
      // Calculate progress as percentage
      const currentProgress = Math.min(100, Math.max(0, (scrollPosition / scrollHeight) * 100));
      console.log(`Scroll progress: ${currentProgress.toFixed(1)}%`);
      setProgress(currentProgress);
    };
    
    // Set initial progress
    handleScroll();
    
    // Add scroll listener
    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [scrollContainer]);
  
  // Always render a container, even without a valid scrollContainer
  return (
    <div className="fixed top-0 left-0 w-full h-1.5 z-[9999] bg-accent/20 pointer-events-none">
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
  const [isFullscreen, setIsFullscreen] = useState(false); // Track fullscreen state
  const readerContentRef = useRef<HTMLIFrameElement>(null)
  const dividerRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const initialXRef = useRef(0)
  const initialWidthRef = useRef(0)
  const settingsButtonRef = useRef<HTMLButtonElement>(null) as React.RefObject<HTMLButtonElement>
  const [detectedLanguage, setDetectedLanguage] = useState<LanguageCode>('en')
  
  // Get translations function
  const { t } = useI18n()
  
  // Reference to main reader column for scroll tracking
  const readerColumnRef = useRef<HTMLDivElement>(null);
  
  // Reference to shadowRoot created by StyleIsolator
  const readerContainerRef = useRef<HTMLDivElement>(null);
  
  // Extract current theme from settings for use with ThemeProvider
  const theme = settings.theme as ThemeType;
  
  // Add text selection related state and handlers
  const [selectionState, setSelectionState] = useState<{
    isActive: boolean;
    rect: DOMRect | null;
  }>({
    isActive: false,
    rect: null
  });

  // Track scroll position for progress bar
  const [scrollProgress, setScrollProgress] = useState(0);
  
  // Direct scroll handler for progress bar
  useEffect(() => {
    if (!readerColumnRef.current) return;
    
    const scrollContainer = readerColumnRef.current;
    
    const handleDirectScroll = () => {
      const scrollPosition = scrollContainer.scrollTop;
      const containerHeight = scrollContainer.clientHeight;
      const scrollHeight = scrollContainer.scrollHeight - containerHeight;
      
      if (scrollHeight <= 0) return;
      
      const progress = Math.min(100, Math.max(0, (scrollPosition / scrollHeight) * 100));
      setScrollProgress(progress);
    };
    
    handleDirectScroll(); // Initial calculation
    
    scrollContainer.addEventListener('scroll', handleDirectScroll);
    return () => scrollContainer.removeEventListener('scroll', handleDirectScroll);
  }, [readerColumnRef.current]);

  // Listen for text selection messages from ReaderContent
  useEffect(() => {
    const handleSelectionMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'TEXT_SELECTED') {
        // In fullscreen mode, adjust rectangle coordinates
        let rect = event.data.rect;
        
        if (rect) {
          console.log('Selection received:', rect);
          
          // Ensure the selection box displays correctly in fullscreen mode
          if (isFullscreen) {
            // Apply any fullscreen-specific adjustments if needed
            rect = {
              ...rect,
              // Make sure all properties are valid numbers
              left: isFinite(rect.left) ? rect.left : 0,
              top: isFinite(rect.top) ? rect.top : 0,
              right: isFinite(rect.right) ? rect.right : 0,
              bottom: isFinite(rect.bottom) ? rect.bottom : 0,
              width: isFinite(rect.width) ? rect.width : 0,
              height: isFinite(rect.height) ? rect.height : 0
            };
          }
          
          // Only show if we have valid dimensions
          if (rect.width > 0 && rect.height > 0) {
            setSelectionState({
              isActive: event.data.isActive,
              rect: rect
            });
            console.log('Selection state updated:', rect);
          }
        }
      }
    };

    window.addEventListener('message', handleSelectionMessage);
    return () => {
      window.removeEventListener('message', handleSelectionMessage);
    };
  }, [isFullscreen]);

  // Handle text highlight
  const handleHighlight = useCallback((color: HighlightColor) => {
    try {
      if (readerContentRef.current) {
        if (typeof readerContentRef.current.contentDocument !== 'undefined') {
          // If it's an iframe
          const contentDocument = readerContentRef.current.contentDocument;
          if (contentDocument) {
            const selection = contentDocument.getSelection();
            if (selection && !selection.isCollapsed) {
              // Send message to iframe content
              readerContentRef.current.contentWindow?.postMessage(
                { type: 'HIGHLIGHT_TEXT', color }, 
                '*'
              );
            }
          }
        } else {
          // If it's directly embedded content (not iframe)
          readerContentRef.current.dispatchEvent(
            new CustomEvent('highlight-text', { detail: { color } })
          );
        }
      } else {
        // Fallback to generic message passing
        window.postMessage({ type: 'HIGHLIGHT_TEXT', color }, '*');
      }
      
      // Don't automatically clear selection state after highlighting
      // Let the user dismiss the toolbar manually
    } catch (err) {
      console.error('Error in handleHighlight:', err);
      setSelectionState({ isActive: false, rect: null });
    }
  }, [readerContentRef]);

  // Handle direct DOM selection in fullscreen mode
  const captureSelection = useCallback(() => {
    if (!isFullscreen) return;
    
    try {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Validate the selection rectangle
        if (rect && isFinite(rect.width) && isFinite(rect.height) && 
            rect.width > 0 && rect.height > 0) {
          console.log('Direct DOM selection captured:', rect);
          setSelectionState({
            isActive: true,
            rect: rect
          });
        }
      }
    } catch (err) {
      console.error('Error capturing selection:', err);
    }
  }, [isFullscreen, setSelectionState]);

  // Handle text selection events
  const handleTextSelection = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    // Text selection handler for fullscreen mode
    if (isFullscreen) {
      // Use setTimeout to allow the selection to complete
      setTimeout(() => {
        captureSelection();
      }, 0);
    }
  }, [isFullscreen, captureSelection]);

  // --- Effects ---

  // Monitor fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Ensure text selection in fullscreen mode
  useEffect(() => {
    if (isFullscreen && readerContainerRef.current) {
      // Small timeout to ensure styles are applied after fullscreen transition
      setTimeout(() => {
        if (readerContainerRef.current) {
          readerContainerRef.current.style.userSelect = 'text'; 
          readerContainerRef.current.style.webkitUserSelect = 'text';
        }
        if (readerContentRef.current) {
          readerContentRef.current.style.userSelect = 'text';
          readerContentRef.current.style.webkitUserSelect = 'text';
        }
        
        // Also ensure the document body allows text selection
        document.body.style.userSelect = 'text';
        document.body.style.webkitUserSelect = 'text';
      }, 100);
    }
  }, [isFullscreen]);
  
  // Additional useEffect specifically for handling text selection in fullscreen
  useEffect(() => {
    if (!isFullscreen) return;

    // Add CSS to ensure selection toolbar is visible in fullscreen
    const style = document.createElement('style');
    style.id = 'fullscreen-selection-style';
    style.textContent = `
      ::selection {
        background: rgba(0, 100, 255, 0.3) !important;
      }
      
      * {
        -webkit-user-select: text !important;
        user-select: text !important;
      }
      
      @media all {
        :fullscreen {
          -webkit-user-select: text !important;
          user-select: text !important;
        }
      }
      
      /* Ensure the selection toolbar is visible in fullscreen */
      .readlite-selection-toolbar {
        position: fixed !important;
        z-index: 2147483647 !important;
        transform: translateZ(0) !important;
        pointer-events: auto !important;
      }
      
      /* Ensure the selection toolbar buttons are clickable */
      .readlite-selection-toolbar button {
        pointer-events: auto !important;
      }
      
      /* Ensure the selection toolbar is above all other elements */
      :fullscreen .readlite-selection-toolbar {
        position: fixed !important;
        z-index: 2147483647 !important;
        pointer-events: auto !important;
        display: block !important;
        opacity: 1 !important;
        visibility: visible !important;
      }

      /* Force the selection toolbar to appear inside fullscreen context */
      :root:fullscreen .readlite-selection-toolbar,
      :root:fullscreen ~ .readlite-selection-toolbar,
      :root:fullscreen > * .readlite-selection-toolbar {
        display: block !important;
      }
    `;
    document.head.appendChild(style);

    // Special handling for fullscreen selection events
    const handleFullscreenSelection = () => {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (rect && rect.width > 0 && rect.height > 0) {
          // Update selection state with fullscreen coordinates
          setSelectionState({
            isActive: true,
            rect: rect
          });
        }
      }
    };

    // Add event listeners specifically for fullscreen
    document.addEventListener('mouseup', handleFullscreenSelection);
    document.addEventListener('selectionchange', () => {
      // Delay slightly to ensure selection is complete
      setTimeout(handleFullscreenSelection, 10);
    });

    return () => {
      const styleEl = document.getElementById('fullscreen-selection-style');
      if (styleEl) {
        styleEl.remove();
      }
      document.removeEventListener('mouseup', handleFullscreenSelection);
      document.removeEventListener('selectionchange', handleFullscreenSelection);
    };
  }, [isFullscreen, setSelectionState]);

  // Additional useEffect for handling selection changes in fullscreen mode
  useEffect(() => {
    if (!isFullscreen || !readerContainerRef.current) return;
    
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (rect && rect.width > 0 && rect.height > 0) {
          setSelectionState({
            isActive: true,
            rect: rect
          });
        }
      }
    };
    
    document.addEventListener('selectionchange', handleSelectionChange);
    
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [isFullscreen, setSelectionState]);

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
    
    // Ensure user-select is enabled for the fullscreen element
    if (document.fullscreenElement && readerContainerRef.current) {
      readerContainerRef.current.style.userSelect = 'text';
      // Also try to explicitly enable text selection on reader content
      if (readerContentRef.current) {
        readerContentRef.current.style.userSelect = 'text';
      }
    }
    
    // Now that dragging is complete, save the width setting
    try {
      localStorage.setItem('readerPanelWidth', leftPanelWidth.toString());
    } catch (e) {
      logger.error(`Error saving panel width after drag:`, e);
    }
  }, [handleDrag, leftPanelWidth]);
  
  // --- Event Handlers ---

  /**
   * Sets up necessary CSS animations for UI components like tooltips and toolbars
   */
  useEffect(() => {
    // Add required animation styles for selection toolbar
    if (readerContainerRef.current) {
      const doc = readerContainerRef.current.ownerDocument || document;
      
      // Only add styles if they don't already exist
      if (!doc.getElementById('readlite-animation-styles')) {
        try {
          const style = doc.createElement('style');
          style.id = 'readlite-animation-styles';
          style.textContent = `
            @keyframes fadeout {
              from { opacity: 1; }
              to { opacity: 0; }
            }
            
            .animate-fadeout {
              animation: fadeout 0.3s ease-out forwards;
            }
            
            @keyframes fadein {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            
            .animate-fadein {
              animation: fadein 0.3s ease-in forwards;
            }
          `;
          doc.head.appendChild(style);
        } catch (e) {
          logger.warn('Failed to add animation styles to reader document', e);
        }
      }
    }
  }, [readerContainerRef.current]);

  /**
   * Toggles fullscreen mode for the reader
   */
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      // Enter fullscreen
      readerContainerRef.current?.requestFullscreen().catch(err => {
        logger.error(`Error attempting to enable fullscreen:`, err);
      });
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, []);

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

  // Add debug logging for ReadingProgress
  useEffect(() => {
    console.log('Reader component mounted');
    console.log('readerColumnRef.current:', readerColumnRef.current);
  }, []);

  useEffect(() => {
    console.log('readerColumnRef updated:', readerColumnRef.current);
  }, [readerColumnRef.current]);

  // Update the scroll container reference for the ReadingProgress component
  useEffect(() => {
    if (readerColumnRef.current) {
      console.log('Reader column reference is available for scroll tracking');
    }
  }, [readerColumnRef.current]);

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
              {/* Book icon */}
              <BookOpenIcon className="w-16 h-16 text-current" />
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
              {/* Error icon */}
              <XCircleIcon className="w-16 h-16 text-current" />
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
      {/* Inline Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1.5 z-[9999] bg-accent/20 pointer-events-none">
        <div 
          className="h-full transition-all duration-150 ease-out bg-accent"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Main Container - the entire screen */}
      <div 
        ref={readerContainerRef}
        className="readlite-reader-container bg-primary text-primary flex flex-col w-full h-full overflow-hidden relative"
        style={{
          ...(isFullscreen ? { userSelect: 'text' } : {}),
        }}
        data-theme={theme}
        data-fullscreen={isFullscreen ? 'true' : 'false'}
        onMouseUp={handleTextSelection}
        onTouchEnd={handleTextSelection}
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
              toggleAgent={toggleAgent}
              handleMarkdownDownload={handleMarkdownDownload}
              toggleSettings={toggleSettings}
              handleClose={handleClose}
              toggleFullscreen={toggleFullscreen}
              isFullscreen={isFullscreen}
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
        
        {/* Text selection toolbar - now rendered directly for better positioning */}
        {selectionState.isActive && selectionState.rect && (
          <SelectionToolbar
            isVisible={selectionState.isActive}
            selectionRect={selectionState.rect}
            onHighlight={handleHighlight}
            onClose={() => setSelectionState({ isActive: false, rect: null })}
          />
        )}
        
        {/* Settings Panel (Moved inside the fullscreen container) */}
        {showSettings && (
          <Settings
            onClose={() => setShowSettings(false)}
            buttonRef={settingsButtonRef}
          />
        )}
      </div>
    </ThemeProvider>
  )
}

export default Reader