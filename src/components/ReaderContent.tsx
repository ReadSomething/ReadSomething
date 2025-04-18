import React, { forwardRef, useEffect, CSSProperties, useMemo } from 'react';
import { LanguageCode } from '~/utils/language';
import { ThemeType, getReaderColors } from '~/config/theme';

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

/**
 * Displays the article content in a well-formatted reader view
 */
const ReaderContent = forwardRef<HTMLDivElement, ReaderContentProps>(
  ({ settings, article, detectedLanguage, error }, ref) => {
    // Get reader colors from theme system
    const readerColors = useMemo(() => getReaderColors(settings.theme), [settings.theme]);

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
              langLabel.className = 'code-lang-label';
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
        
        // Apply font settings to content elements
        const contentElements = content.querySelectorAll('p, li, blockquote, h1, h2, h3, h4, h5, h6, div:not(.code-lang-label)');
        contentElements.forEach((el: Element) => {
          (el as HTMLElement).style.fontFamily = settings.fontFamily;
          (el as HTMLElement).style.fontSize = `${settings.fontSize}px`;
          (el as HTMLElement).style.lineHeight = getOptimalLineHeight.toString();
        });
        
        // Apply spacing to paragraphs
        const paragraphs = content.querySelectorAll('p');
        paragraphs.forEach((el: Element) => {
          (el as HTMLElement).style.marginBottom = getParagraphSpacing;
        });
        
        // Apply to code blocks
        const codeBlocks = content.querySelectorAll('pre, code');
        codeBlocks.forEach((el: Element) => {
          (el as HTMLElement).style.fontFamily = 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace';
          (el as HTMLElement).style.fontSize = `${Math.max(13, settings.fontSize - 2)}px`;
          (el as HTMLElement).style.lineHeight = Math.min(1.5, getOptimalLineHeight).toString();
        });
      } catch (err) {
        logger.error("Error applying font settings:", err);
      }
    }, [settings.fontSize, getOptimalLineHeight, getParagraphSpacing, ref]);

    // Create content style with proper typing
    const contentStyle: CSSProperties = {
      maxWidth: `${settings.width}px`,
      margin: '0 auto',
      padding: `0 ${TYPOGRAPHY.margins.default}px`,
      fontFamily: settings.fontFamily,
      fontSize: `${settings.fontSize}px`,
      lineHeight: getOptimalLineHeight,
      textAlign: settings.textAlign as any, // Cast to any to avoid type errors
      backgroundColor: readerColors.background,
      color: readerColors.text,
      textRendering: 'optimizeLegibility',
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale'
    };

    // Style for title
    const titleStyle: CSSProperties = {
      fontSize: `${Math.max(24, settings.fontSize * 1.5)}px`,
      fontFamily: settings.fontFamily,
      color: readerColors.title,
      letterSpacing: isCJKLanguage ? '0.02em' : '0',
      fontWeight: 600
    };

    return (
      <div 
        ref={ref}
        style={contentStyle}
        className={`reader-content lang-${detectedLanguage} mx-auto py-5 pb-[100px] relative`}
      >
        <style>{`
          /* Global font settings */
          .reader-content {
            font-family: ${settings.fontFamily} !important;
            text-rendering: optimizeLegibility;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            color: ${readerColors.text} !important;
            max-width: ${settings.width}px !important;
            margin: 0 auto;
          }
          
          /* Ensure content elements inherit font settings */
          .reader-content p, 
          .reader-content li, 
          .reader-content blockquote,
          .reader-content h1,
          .reader-content h2,
          .reader-content h3,
          .reader-content h4,
          .reader-content h5,
          .reader-content h6,
          .reader-content div:not(.code-lang-label) {
            font-family: ${settings.fontFamily} !important;
            line-height: ${getOptimalLineHeight} !important;
            font-size: ${settings.fontSize}px !important;
            color: ${readerColors.text} !important;
          }
          
          /* Improve paragraph spacing */
          .reader-content p {
            margin-bottom: ${getParagraphSpacing} !important;
            font-weight: 400;
          }
          
          /* CJK language optimizations */
          .lang-zh p, .lang-ja p, .lang-ko p,
          .lang-zh li, .lang-ja li, .lang-ko li {
            text-align: ${settings.textAlign === 'justify' ? 'justify' : settings.textAlign} !important;
            text-justify: inter-character;
            letter-spacing: ${settings.fontSize <= 16 ? '0.02em' : '0.01em'};
            word-break: normal;
          }

          /* English text alignment */
          .lang-en p, .lang-en li {
            text-align: ${settings.textAlign};
            hyphens: auto;
            letter-spacing: ${settings.fontSize <= 14 ? '0.01em' : '0'};
            word-break: normal;
          }
          
          /* Implement text-wrap: balance for headings */
          .reader-content h1, 
          .reader-content h2, 
          .reader-content h3 {
            text-wrap: balance;
          }
          
          /* Add support for text hyphenation */
          .reader-content p {
            hyphens: auto;
          }
          
          /* First paragraph after heading should not be indented */
          .reader-content h1 + p,
          .reader-content h2 + p,
          .reader-content h3 + p {
            text-indent: 0 !important;
          }
          
          /* Improved spacing */
          .reader-content p {
            margin-bottom: ${getParagraphSpacing} !important;
            font-weight: 400;
          }
          
          /* Improved lists */
          .reader-content ul, .reader-content ol {
            padding-left: 2em;
            margin: 1em 0;
            color: ${readerColors.text} !important;
          }
          
          .reader-content li {
            margin-bottom: 0.5em;
            font-weight: 400;
          }
          
          .reader-content li + li {
            margin-top: 0.5em;
          }
          
          /* Improved blockquotes */
          .reader-content blockquote {
            border-left: 3px solid ${readerColors.title}40;
            padding-left: 1em;
            margin-left: 0;
            font-style: italic;
            color: ${readerColors.text};
          }
          
          .reader-content h1 {
            font-size: ${Math.max(24, settings.fontSize * 1.5)}px !important;
            font-weight: 700;
            margin-top: 1.8em;
            margin-bottom: 0.8em;
            letter-spacing: ${isCJKLanguage ? '0.02em' : '0'};
            color: ${readerColors.title} !important;
          }
          
          .reader-content h2 {
            font-size: ${Math.max(20, settings.fontSize * 1.3)}px !important;
            font-weight: 600;
            margin-top: 1.5em;
            margin-bottom: 0.7em;
            letter-spacing: ${isCJKLanguage ? '0.015em' : '0'};
            color: ${readerColors.title} !important;
          }
          
          .reader-content h3 {
            font-size: ${Math.max(18, settings.fontSize * 1.15)}px !important;
            font-weight: 600;
            margin-top: 1.3em;
            margin-bottom: 0.6em;
            letter-spacing: ${isCJKLanguage ? '0.01em' : '0'};
            color: ${readerColors.title} !important;
          }
          
          .reader-content img {
            max-width: 100%;
            height: auto;
            margin: 1em auto;
            border-radius: 4px;
          }
          
          .reader-content pre,
          .reader-content code {
            font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace !important;
            font-size: ${Math.max(13, settings.fontSize - 2)}px !important;
            line-height: ${Math.min(1.5, getOptimalLineHeight)} !important;
            border-radius: 4px;
          }
          
          .reader-content pre {
            padding: 1em;
            overflow-x: auto;
            background-color: ${readerColors.background === '#ffffff' ? '#f5f7f9' : '#1e1e1e'};
          }
          
          .reader-content a {
            color: ${readerColors.link.normal};
            text-decoration: none;
            border-bottom: 1px solid ${readerColors.link.normal}30;
            transition: border-color 0.2s ease, color 0.2s ease;
          }
          
          .reader-content a:visited {
            color: ${readerColors.link.visited};
            border-bottom-color: ${readerColors.link.visited}30;
          }
          
          .reader-content a:hover {
            color: ${readerColors.link.hover};
            border-bottom-color: ${readerColors.link.hover};
          }
          
          .reader-content a:active {
            color: ${readerColors.link.active};
          }
          
          .code-lang-label {
            position: absolute;
            top: 0;
            right: 0;
            font-size: 0.75rem;
            padding: 0.25rem 0.5rem;
            background-color: rgba(0, 0, 0, 0.1);
            color: currentColor;
            border-bottom-left-radius: 0.25rem;
          }
          
          /* Paragraph indentation styles */
          .reader-content p.indented {
            text-indent: 2em;
          }
          
          /* First letter drop cap effect */
          .reader-content p.drop-cap::first-letter {
            float: left;
            font-size: 3em;
            line-height: 0.8;
            font-weight: 500;
            margin-right: 0.1em;
            padding-top: 0.1em;
            color: ${readerColors.title};
          }
          
          /* CJK-specific drop cap adjustments */
          .lang-zh p.drop-cap::first-letter,
          .lang-ja p.drop-cap::first-letter,
          .lang-ko p.drop-cap::first-letter {
            padding-right: 0.1em;
            padding-bottom: 0.1em;
          }
          
          /* First letter improvements for different font weights */
          .reader-content p.drop-cap::first-letter {
            text-shadow: 0 0 1px rgba(0,0,0,0.05);
            ${settings.theme === 'dark' ? 'text-shadow: 0 0 1px rgba(255,255,255,0.1);' : ''}
          }
          
          /* Improve reading flow with hyphenation for Latin languages */
          .lang-en .reader-content p,
          .lang-fr .reader-content p,
          .lang-es .reader-content p,
          .lang-de .reader-content p,
          .lang-it .reader-content p {
            hyphens: auto;
          }
        `}</style>
        
        {!error && article?.title && (
          <div className="flex justify-between items-center mb-5">
            <h1 
              style={titleStyle}
              className="font-semibold m-0 leading-tight tracking-tight flex-1"
            >
              {article.title}
            </h1>
          </div>
        )}
        
        {!error && article?.content && (
          <div className="break-words" dangerouslySetInnerHTML={{ __html: article.content }} />
        )}
      </div>
    );
  }
);

ReaderContent.displayName = 'ReaderContent';

export default ReaderContent; 