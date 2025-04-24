import React, { forwardRef, useEffect, useRef, useMemo } from 'react';
import { LanguageCode } from '~/utils/language';
import { ThemeType } from '~/config/theme';
import { useTextSelection } from '~/hooks/useTextSelection';
import { useTheme } from '~/context/ThemeContext';

import { createLogger } from "~/utils/logger";

// Create a logger for this module
const logger = createLogger('reader-content');


interface ReaderContentProps {
  settings: {
    theme: ThemeType;
    fontFamily: string;
    fontSize: number;
    lineHeight: number;
    textAlign: string;
    width: number;
  };
  article: any;
  detectedLanguage: LanguageCode;
  error: string | null;
}

// Define optimal typography settings
const TYPOGRAPHY = {
  paragraphSpacing: {
    min: 0.5,  // Multiplier of line height
    max: 1.5,
    default: 0.8
  },
  margins: {
    min: 16,
    default: 20,
    max: 32
  }
};

// Helper function to get Tailwind font family class
const getFontFamilyClass = (fontFamily: string): string => {
  if (fontFamily.includes('serif')) return 'font-serif';
  if (fontFamily.includes('mono')) return 'font-mono';
  return 'font-sans';
};

// Helper function to get Tailwind text align class
const getTextAlignClass = (textAlign: string): string => {
  if (!textAlign) return 'text-left';
  return `text-${textAlign}`;
};

/**
 * Displays the article content in a well-formatted reader view
 */
const ReaderContent = forwardRef<HTMLDivElement, ReaderContentProps>(
  ({ settings, article, detectedLanguage, error }, ref) => {
    // Use ThemeContext
    const { getReaderColors, theme } = useTheme();
    
    // Get theme colors, recalculate when theme changes
    const readerColors = useMemo(() => getReaderColors(), [getReaderColors, theme]);
    
    // Create reference for content container
    const contentRef = useRef<HTMLDivElement | null>(null);
    
    // Use text selection hook
    const { selection, applyHighlight } = useTextSelection(contentRef);

    // Check if language is CJK (Chinese, Japanese, Korean)
    const isCJKLanguage = useMemo(() => {
      return ['zh', 'ja', 'ko'].includes(detectedLanguage);
    }, [detectedLanguage]);

    // Calculate optimal line height based on font size
    const getOptimalLineHeight = useMemo(() => {
      // Smaller font sizes need slightly larger line height ratios
      if (settings.fontSize < 14) {
        return Math.max(settings.lineHeight, 1.5);
      } else if (settings.fontSize > 20) {
        return Math.min(settings.lineHeight, 1.6);
      }
      return settings.lineHeight;
    }, [settings.fontSize, settings.lineHeight]);
    
    // Calculate paragraph spacing based on line height
    const getParagraphSpacing = useMemo(() => {
      const baseSpacing = getOptimalLineHeight * settings.fontSize;
      return `${baseSpacing * TYPOGRAPHY.paragraphSpacing.default}px`;
    }, [getOptimalLineHeight, settings.fontSize]);

    // Generate Tailwind class names
    const fontFamilyClass = useMemo(() => getFontFamilyClass(settings.fontFamily), [settings.fontFamily]);
    const textAlignClass = useMemo(() => getTextAlignClass(settings.textAlign), [settings.textAlign]);

    // Apply specific DOM transformations after content rendering
    useEffect(() => {
      if (!ref || !('current' in ref) || !ref.current || !article) return;
      
      // --- Code Block Language Label Handling ---
      try {
        const codeBlocks = ref.current.querySelectorAll('pre + div');
        
        codeBlocks.forEach((langDiv: Element) => {
          const pre = langDiv.previousElementSibling as HTMLPreElement;
          // Ensure the previous sibling is indeed a <pre> tag
          if (!pre || pre.tagName !== 'PRE') return;
          
          // Check for language info within the div
          const langSpan = langDiv.querySelector('p > span, span');
          if (langSpan?.textContent) {
            const langName = langSpan.textContent.trim();
            
            // Ensure <pre> can contain the absolutely positioned label
            if (window.getComputedStyle(pre).position === 'static') {
              pre.style.position = 'relative';
            }
            
            // Check if label already exists to prevent duplicates
            const existingLabel = pre.querySelector('.code-lang-label');
            if (!existingLabel) {
              const langLabel = document.createElement('div');
              langLabel.className = 'code-lang-label absolute top-0 right-0 bg-primary/10 text-primary/70 text-xs px-2 py-1 rounded-bl font-mono';
              langLabel.textContent = langName;
              pre.appendChild(langLabel);
            }
            
            // Hide the original language div
            (langDiv as HTMLElement).style.display = 'none';
          }
        });
      } catch (domError) {
        logger.error(`Error during code block DOM manipulation:`, domError);
      }
    }, [article, ref]);

    // Apply font settings
    useEffect(() => {
      if (!ref || typeof ref !== 'object' || !ref.current) return;
      
      try {
        const content = ref.current;
        
        // Set root level font variables for the entire content area to inherit
        content.style.setProperty('--readlite-reader-font-size', `${settings.fontSize}px`);
        content.style.setProperty('--readlite-reader-line-height', getOptimalLineHeight.toString());
        content.style.fontFamily = settings.fontFamily;
        
        // Apply classes to content elements, excluding headings
        const contentElements = content.querySelectorAll('p, li, blockquote, div:not(.code-lang-label)');
        
        contentElements.forEach((el: Element) => {
          const htmlEl = el as HTMLElement;
          
          // Use direct style settings for consistent control
          htmlEl.style.fontSize = `${settings.fontSize}px`;
          htmlEl.style.lineHeight = getOptimalLineHeight.toString();
          htmlEl.style.fontFamily = settings.fontFamily;
          
          // For paragraphs, add margin bottom
          if (el.tagName === 'P') {
            htmlEl.style.marginBottom = getParagraphSpacing;
          }
        });
        
        // Apply to code blocks with monospace fonts
        const codeBlocks = content.querySelectorAll('pre, code');
        codeBlocks.forEach((el: Element) => {
          const htmlEl = el as HTMLElement;
          htmlEl.style.fontFamily = 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace';
          htmlEl.style.fontSize = `${Math.max(13, settings.fontSize - 2)}px`;
        });
      } catch (err) {
        logger.error("Error applying font settings:", err);
      }
    }, [settings.fontFamily, settings.fontSize, getOptimalLineHeight, getParagraphSpacing, ref]);

    // Apply theme colors to article content
    useEffect(() => {
      if (!ref || !('current' in ref) || !ref.current) return;
      
      try {
        const content = ref.current;
        
        // Add theme class to the container
        content.setAttribute('data-theme', theme);
        
        // Apply link colors
        const links = content.querySelectorAll('a');
        const mouseEnterListeners: Array<{ element: HTMLElement, listener: EventListener }> = [];
        const mouseLeaveListeners: Array<{ element: HTMLElement, listener: EventListener }> = [];
        
        links.forEach((el: Element) => {
          const link = el as HTMLElement;
          
          // Use direct color from readerColors
          link.style.color = readerColors.link.normal;
          
          // Add hover effect with properly stored references for cleanup
          const enterListener = () => {
            link.style.color = readerColors.link.hover;
          };
          
          const leaveListener = () => {
            link.style.color = readerColors.link.normal;
          };
          
          link.addEventListener('mouseenter', enterListener);
          link.addEventListener('mouseleave', leaveListener);
          
          // Store references for cleanup
          mouseEnterListeners.push({ element: link, listener: enterListener });
          mouseLeaveListeners.push({ element: link, listener: leaveListener });
        });
        
        // Cleanup function to remove event listeners
        return () => {
          mouseEnterListeners.forEach(({ element, listener }) => {
            element.removeEventListener('mouseenter', listener);
          });
          
          mouseLeaveListeners.forEach(({ element, listener }) => {
            element.removeEventListener('mouseleave', listener);
          });
        };
        
      } catch (err) {
        logger.error("Error applying text colors:", err);
      }
    }, [readerColors, ref, theme]);

    // Send text selection state to parent component via messages
    useEffect(() => {
      if (selection.isActive && selection.rect) {
        window.postMessage({
          type: 'TEXT_SELECTED',
          isActive: selection.isActive,
          rect: selection.rect
        }, '*');
      }
    }, [selection.isActive, selection.rect]);

    // Listen for highlight commands from parent component
    useEffect(() => {
      // Handle highlight commands from messages
      const handleHighlightMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'HIGHLIGHT_TEXT' && event.data.color) {
          // Ensure highlight is applied to the correct selection
          applyHighlight(event.data.color);
          // Clear selection
          window.getSelection()?.removeAllRanges();
        }
      };

      // Handle highlight commands from custom events
      const handleHighlightEvent = (event: CustomEvent) => {
        if (event.detail && event.detail.color) {
          applyHighlight(event.detail.color);
          // Clear selection
          window.getSelection()?.removeAllRanges();
        }
      };

      // Add both event listeners
      window.addEventListener('message', handleHighlightMessage);
      contentRef.current?.addEventListener('highlight-text', handleHighlightEvent as EventListener);

      return () => {
        window.removeEventListener('message', handleHighlightMessage);
        contentRef.current?.removeEventListener('highlight-text', handleHighlightEvent as EventListener);
      };
    }, [applyHighlight, contentRef]);

    return (
      <div 
        ref={(element) => {
          // Set both ref and contentRef
          if (ref && typeof ref === 'function') {
            ref(element);
          } else if (ref) {
            ref.current = element;
          }
          contentRef.current = element;
        }}
        className={`
          readlite-reader-content 
          lang-${detectedLanguage} 
          mx-auto py-5 pb-[100px] 
          relative
          ${fontFamilyClass}
          ${textAlignClass}
          bg-primary
          text-primary
          antialiased
          transition-colors duration-300
        `}
        style={{
          maxWidth: `${settings.width}px`,
          padding: `0 ${TYPOGRAPHY.margins.default}px`,
          '--readlite-reader-font-size': `${settings.fontSize}px`,
          '--readlite-reader-line-height': getOptimalLineHeight.toString(),
        } as React.CSSProperties}
        data-font-size={settings.fontSize}
        data-line-height={getOptimalLineHeight}
        data-theme={theme}
      >
        {/* Dynamic styles applied via CSS variables */}
        <style>{`
          .readlite-reader-content {
            --readlite-reader-font-size: ${settings.fontSize}px;
            --readlite-reader-line-height: ${getOptimalLineHeight};
            font-family: ${settings.fontFamily};
          }
          
          .readlite-reader-content p, 
          .readlite-reader-content li, 
          .readlite-reader-content blockquote,
          .readlite-reader-content div:not(.code-lang-label) {
            font-size: var(--readlite-reader-font-size);
            line-height: var(--readlite-reader-line-height);
            font-family: ${settings.fontFamily};
          }
          
          .readlite-reader-content p {
            margin-bottom: ${getParagraphSpacing};
          }
          
          .readlite-reader-content pre,
          .readlite-reader-content code {
            font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
            font-size: ${Math.max(13, settings.fontSize - 2)}px;
          }
          
          .readlite-reader-content h1 { font-size: calc(var(--readlite-reader-font-size) * 1.6); }
          .readlite-reader-content h2 { font-size: calc(var(--readlite-reader-font-size) * 1.4); }
          .readlite-reader-content h3 { font-size: calc(var(--readlite-reader-font-size) * 1.2); }
          .readlite-reader-content h4 { font-size: calc(var(--readlite-reader-font-size) * 1.1); }
          .readlite-reader-content h5 { font-size: calc(var(--readlite-reader-font-size) * 1.0); }
          .readlite-reader-content h6 { font-size: var(--readlite-reader-font-size); }
        `}</style>
        
        {/* Article content */}
        {article && (
          <>
            {article.title && (
              <h1 
                className="mb-4 mt-8 font-semibold transition-colors duration-300 text-primary"
                style={{
                  letterSpacing: isCJKLanguage ? '0.02em' : '0',
                  fontFamily: settings.fontFamily
                }}
              >
                {article.title}
              </h1>
            )}
            
            {article.byline && (
              <div 
                className="mb-8 text-sm opacity-75 text-primary"
                style={{ fontFamily: settings.fontFamily }}
              >
                {article.byline}
              </div>
            )}
            
            {article.content ? (
              <div 
                dangerouslySetInnerHTML={{ __html: article.content }}
                className="content text-primary"
              />
            ) : null}
          </>
        )}
        
        {error && (
          <div className="mt-16 text-center">
            <h2 className="text-xl font-semibold mb-4 text-error">
              Error loading content
            </h2>
            <p className="text-error">{error}</p>
          </div>
        )}
      </div>
    );
  }
);

export default ReaderContent; 