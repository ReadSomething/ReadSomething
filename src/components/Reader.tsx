import React, { useState, useEffect, useRef } from "react"
import { useReader } from "../context/ReaderContext"
import Settings from "../components/Settings"
import Controls from "../components/Controls"
import { useI18n } from "../hooks/useI18n"
import { LanguageCode } from "../utils/language"
/**
 * Main Reader component
 * Displays the article in a clean, readable format
 */
const Reader = () => {
  const { article, settings, isLoading, error, closeReader } = useReader()
  const [showSettings, setShowSettings] = useState(false)
  const [detectedLanguage, setDetectedLanguage] = useState<LanguageCode>('en')
  const readerContentRef = useRef<HTMLDivElement>(null)
  
  // Get translations function
  const { t } = useI18n()
  
  // Detect article language and set corresponding styles
  useEffect(() => {
    if (article && article.language) {
      // Language code is already normalized in detectLanguage function
      setDetectedLanguage(article.language as LanguageCode)
    }
  }, [article?.language]);
  
  // Apply language-specific settings
  useEffect(() => {
    const contentLang = detectedLanguage;
    
    // Get language-specific settings if available
    const langSettings = settings.languageSettings[contentLang];
    if (langSettings) {
      // Customize the content language settings here
    }
  }, [detectedLanguage, settings.languageSettings]);
  
  // Handle special code block structure
  useEffect(() => {
    if (!readerContentRef.current || !article) return;
    
    // Find code blocks with the special structure
    const codeBlocks = readerContentRef.current.querySelectorAll('pre + div');
    
    codeBlocks.forEach(langDiv => {
      const pre = langDiv.previousElementSibling as HTMLPreElement;
      if (!pre || pre.tagName !== 'PRE') return;
      
      // Position the pre element as relative if not already
      if (window.getComputedStyle(pre).position !== 'relative') {
        pre.style.position = 'relative';
      }
      
      // Check if there's language info in the div
      const langSpan = langDiv.querySelector('p > span');
      if (langSpan && langSpan.textContent) {
        // Create a language label and position it in the pre
        const langLabel = document.createElement('div');
        langLabel.className = 'code-lang-label';
        langLabel.textContent = langSpan.textContent;
        
        // Check if label already exists
        const existingLabel = pre.querySelector('.code-lang-label');
        if (!existingLabel) {
          pre.appendChild(langLabel);
        }
        
        // Hide the original language div as we've created a proper label
        (langDiv as HTMLElement).style.display = 'none';
      }
    });
  }, [article]);
  
  // All hooks must be called unconditionally at the top level
  // Debug useEffect to log when settings panel visibility changes
  useEffect(() => {
      }, [showSettings]);
  
  // Toggle settings panel
  const toggleSettings = () => {
    setShowSettings(!showSettings);
  }
  
  // Determine container style based on theme
  const getContainerStyle = () => {
    switch (settings.theme) {
      case "dark":
        return {
          backgroundColor: "#202020",
          color: "#E0E0E0"
        }
      case "sepia":
        return {
          backgroundColor: "#F2E8D7",
          color: "#594A38"
        }
      case "paper":
        return {
          backgroundColor: "#F7F7F7",
          color: "#333333"
        }
      default:
        return {
          backgroundColor: "#FFFFFF",
          color: "#2C2C2E"
        }
    }
  }
  
  // Get theme-based link styles
  const getLinkStyles = () => {
    switch (settings.theme) {
      case "dark":
        return `
          a { color: #7BB0FF; }
          a:visited { color: #AF9CEF; }
          a:hover { color: #99CCFF; text-decoration: underline; }
          a:active { color: #5C9AFF; }
        `;
      case "sepia":
        return `
          a { color: #9D633C; }
          a:visited { color: #7A582F; }
          a:hover { color: #B37544; text-decoration: underline; }
          a:active { color: #86532F; }
        `;
      case "paper":
        return `
          a { color: #505050; }
          a:visited { color: #707070; }
          a:hover { color: #303030; text-decoration: underline; }
          a:active { color: #252525; }
        `;
      default: // light
        return `
          a { color: #0077CC; }
          a:visited { color: #6B40BD; }
          a:hover { color: #0055AA; text-decoration: underline; }
          a:active { color: #004488; }
        `;
    }
  }
  
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
  
  // Handle no article extracted
  if (!article) {
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
          <p style={{ color: "currentColor" }}>{t('couldNotExtract')}</p>
        </div>
      </div>
    )
  }
  
  // Adjust width based on settings
  const readingWidth = settings.width;
  
  // Calculate content style with line height
  const containerStyle = getContainerStyle();
  const contentStyle = {
    lineHeight: settings.lineHeight.toString(),
    fontSize: `${settings.fontSize}px`,
    fontFamily: settings.fontFamily,
    textAlign: settings.textAlign,
  };
  
  // Handle closing reader mode
  const handleClose = () => {
    // Notify background script about state change before exiting
    chrome.runtime.sendMessage({
      type: "READER_MODE_CHANGED",
      isActive: false
    });
    
    // Create and dispatch the close event
    document.dispatchEvent(new CustomEvent('READLITE_TOGGLE_INTERNAL'));
  };
  
  return (
    <>
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
      
      <div style={{
        width: "100%",
        minHeight: "100vh",
        padding: "20px",
        boxSizing: "border-box",
        overflow: "auto",
        height: "100vh",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 2147483640,
        ...containerStyle
      }}>
        <style>{`
          .reader-content img {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 1em auto;
          }
          
          /* Content language specific styles */
          /* Chinese paragraph styles */
          .reader-content[data-content-lang="zh"] p {
            margin: 0 0 1em 0;
            text-indent: 0;
            letter-spacing: 0;
          }
          
          /* Apply justified text for Chinese with appropriate settings */
          .reader-content[data-content-lang="zh"][data-text-align="justify"] p {
            text-align: justify;
            text-justify: inter-ideographic; /* Chinese text justification */
          }
          
          /* Chinese punctuation handling */
          .reader-content[data-content-lang="zh"] {
            /* Ensure Chinese uses full-width punctuation */
            --punctuation-width: 1em;
            hanging-punctuation: first allow-end; /* Allow punctuation to hang */
          }
          
          /* Punctuation handling when at the end of a line */
          .reader-content[data-content-lang="zh"] p {
            overflow-wrap: break-word;
            word-break: normal;
          }
          
          /* Handle English and numbers */
          .reader-content[data-content-lang="zh"] code,
          .reader-content[data-content-lang="zh"] kbd,
          .reader-content[data-content-lang="zh"] pre,
          .reader-content[data-content-lang="zh"] samp {
            font-family: 'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'Menlo', monospace;
          }
          
          /* Optimize Chinese/English mixed text */
          .reader-content[data-content-lang="zh"] * {
            /* Consider using JS to dynamically add spaces between Chinese and English, like pangu.js */
            text-justify-trim: punctuation; /* Trim punctuation space */
          }
          
          /* No indent for first paragraph after headings in Chinese */
          .reader-content[data-content-lang="zh"] h1 + p, 
          .reader-content[data-content-lang="zh"] h2 + p, 
          .reader-content[data-content-lang="zh"] h3 + p, 
          .reader-content[data-content-lang="zh"] h4 + p, 
          .reader-content[data-content-lang="zh"] h5 + p, 
          .reader-content[data-content-lang="zh"] h6 + p {
            text-indent: 0;
          }
          
          /* Chinese blockquote styling optimization */
          .reader-content[data-content-lang="zh"] blockquote {
            padding: 0.5em 1em 0.5em 2em;
            position: relative;
            background-color: rgba(0, 0, 0, 0.03);
          }
          
          /* Chinese list spacing */
          .reader-content[data-content-lang="zh"] ul,
          .reader-content[data-content-lang="zh"] ol {
            margin-bottom: 1.2em;
            padding-left: 2em; /* Increase list indentation */
          }
          
          .reader-content[data-content-lang="zh"] li {
            margin-bottom: 0.5em;
            text-indent: 0; /* Ensure list items are not indented */
          }
          
          /* Chinese table optimization */
          .reader-content[data-content-lang="zh"] table {
            font-size: 0.95em;
            width: 100%;
            margin: 1.5em 0;
            border-collapse: collapse;
          }
          
          .reader-content[data-content-lang="zh"] th,
          .reader-content[data-content-lang="zh"] td {
            padding: 0.75em;
            text-align: left;
            border: 1px solid rgba(0, 0, 0, 0.1);
          }
          
          .reader-content[data-content-lang="zh"] th {
            font-weight: bold;
            background-color: rgba(0, 0, 0, 0.05);
          }
          
          /* Adapt to dark theme tables */
          .reader-content[data-theme="dark"][data-content-lang="zh"] th,
          .reader-content[data-theme="dark"][data-content-lang="zh"] td {
            border-color: rgba(255, 255, 255, 0.1);
          }
          
          .reader-content[data-theme="dark"][data-content-lang="zh"] th {
            background-color: rgba(255, 255, 255, 0.05);
          }
          
          /* Override default em styling for Chinese */
          .reader-content[data-content-lang="zh"] em {
            font-style: normal;
            font-weight: bold; /* Use bold instead of italic */
            text-emphasis: dot; /* Optional: Use emphasis mark */
            text-emphasis-position: under; /* Emphasis mark position */
          }
          
          /* Highlight text */
          .reader-content[data-content-lang="zh"] strong {
            font-weight: bold;
            /* Optional: Add background color to emphasized text */
            background-color: rgba(255, 255, 0, 0.1);
            padding: 0 0.1em;
          }
          
          /* Use a more appropriate paragraph spacing */
          .reader-content[data-content-lang="zh"] p + p {
            margin-top: 0.75em;
          }
          
          /* Title and content spacing */
          .reader-content[data-content-lang="zh"] h1,
          .reader-content[data-content-lang="zh"] h2,
          .reader-content[data-content-lang="zh"] h3,
          .reader-content[data-content-lang="zh"] h4,
          .reader-content[data-content-lang="zh"] h5,
          .reader-content[data-content-lang="zh"] h6 {
            margin-bottom: 1em;
          }
          
          /* List styling improvement */
          .reader-content[data-content-lang="zh"] li {
            list-style-position: outside;
            text-indent: 0;
          }
          
          /* English/default paragraph styles */
          .reader-content[data-content-lang="en"] p,
          .reader-content:not([data-content-lang="zh"]) p {
            margin: 0 0 1.2em 0;
            text-indent: 0;
          }
          
          /* Apply hyphenation for justified English text */
          .reader-content[data-content-lang="en"][data-text-align="justify"] p {
            hyphens: auto;
            -webkit-hyphens: auto;
            -ms-hyphens: auto;
          }
          
          /* English list spacing */
          .reader-content[data-content-lang="en"] ul,
          .reader-content[data-content-lang="en"] ol,
          .reader-content:not([data-content-lang="zh"]) ul,
          .reader-content:not([data-content-lang="zh"]) ol {
            margin-bottom: 1.2em;
            padding-left: 1.8em;
          }
          
          .reader-content[data-content-lang="en"] li,
          .reader-content:not([data-content-lang="zh"]) li {
            margin-bottom: 0.6em;
          }
          
          /* Generic heading margins */
          .reader-content h1, 
          .reader-content h2, 
          .reader-content h3, 
          .reader-content h4, 
          .reader-content h5, 
          .reader-content h6 {
            margin-top: 1.5em;
            margin-bottom: 0.8em;
            line-height: 1.3;
          }
          
          /* Specific heading styles */
          .reader-content h1 {
            font-size: 2em;
            font-weight: 700;
            margin-top: 0;
          }
          
          .reader-content h2 {
            font-size: 1.5em;
            font-weight: 600;
            border-bottom: 1px solid rgba(0, 0, 0, 0.1);
            padding-bottom: 0.3em;
          }
          
          .reader-content h3 {
            font-size: 1.25em;
            font-weight: 600;
          }
          
          .reader-content h4 {
            font-size: 1.1em;
            font-weight: 600;
          }
          
          /* Dark theme heading border */
          .reader-content[data-theme="dark"] h2 {
            border-bottom-color: rgba(255, 255, 255, 0.2);
          }
          
          /* Sepia theme heading border */
          .reader-content[data-theme="sepia"] h2 {
            border-bottom-color: rgba(89, 74, 56, 0.2);
          }
          
          /* Paper theme heading border */
          .reader-content[data-theme="paper"] h2 {
            border-bottom-color: rgba(51, 51, 51, 0.15);
          }
          
          /* Horizontal rules */
          .reader-content hr {
            height: 1px;
            background-color: rgba(0, 0, 0, 0.1);
            border: none;
            margin: 2em 0;
          }
          
          /* Dark theme horizontal rule */
          .reader-content[data-theme="dark"] hr {
            background-color: rgba(255, 255, 255, 0.2);
          }
          
          /* Blockquotes */
          .reader-content blockquote {
            margin: 1.5em 0;
            padding: 0.5em 1.2em;
            border-left: 4px solid #ddd;
            background-color: rgba(0, 0, 0, 0.03);
            border-radius: 0 3px 3px 0;
          }
          
          /* Dark theme blockquotes */
          .reader-content[data-theme="dark"] blockquote {
            border-left-color: #666;
            background-color: rgba(255, 255, 255, 0.05);
          }
          
          /* Sepia theme blockquotes */
          .reader-content[data-theme="sepia"] blockquote {
            border-left-color: #d0ba98;
            background-color: rgba(89, 74, 56, 0.05);
          }
          
          /* Paper theme blockquotes */
          .reader-content[data-theme="paper"] blockquote {
            border-left-color: #ccc;
            background-color: rgba(0, 0, 0, 0.03);
          }
          
          /* Simple code block styles */
          .reader-content pre {
            position: relative;
            margin: 1.5em 0;
            padding: 1em;
            overflow-x: auto;
            background-color: rgba(0, 0, 0, 0.03);
            border-radius: 6px;
            white-space: pre;
            word-wrap: normal;
            -webkit-overflow-scrolling: touch;
            max-width: 100%;
            border: 1px solid rgba(0, 0, 0, 0.1);
          }
          
          /* Dark theme support for code blocks */
          .reader-content[data-theme="dark"] pre {
            background-color: #2B2B2B;
            border: 1px solid #666;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
          }
          
          /* Sepia theme support for code blocks */
          .reader-content[data-theme="sepia"] pre {
            background-color: rgba(89, 74, 56, 0.03);
            border-color: rgba(89, 74, 56, 0.1);
          }
          
          /* Paper theme support for code blocks */
          .reader-content[data-theme="paper"] pre {
            background-color: rgba(51, 51, 51, 0.02);
            border-color: rgba(51, 51, 51, 0.1);
          }
          
          /* Code inside pre */
          .reader-content pre > code {
            display: block;
            padding: 0;
            font-family: 'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'Menlo', 'Monaco', 'Consolas', 'Courier New', monospace;
            font-size: 0.85em;
            line-height: 1.5;
            tab-size: 2;
            -moz-tab-size: 2;
            color: #24292e;
            letter-spacing: 0.2px;
          }
          
          /* Dark theme support for code text */
          .reader-content[data-theme="dark"] pre > code {
            color: #F8F8F2;
          }
          
          /* Sepia theme support for code text */
          .reader-content[data-theme="sepia"] pre > code {
            color: #594a38;
          }
          
          /* Paper theme support for code text */
          .reader-content[data-theme="paper"] pre > code {
            color: #333333;
          }
          
          /* Support for span elements inside code blocks */
          .reader-content pre > code span {
            font-family: inherit;
            line-height: inherit;
            font-size: inherit;
          }
          
          /* Inline code */
          .reader-content :not(pre) > code {
            padding: 0.2em 0.4em;
            background-color: rgba(0, 0, 0, 0.05);
            border-radius: 3px;
            font-family: 'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'Menlo', 'Monaco', 'Consolas', 'Courier New', monospace;
            font-size: 0.8em;
            white-space: nowrap;
            color: #24292e;
            letter-spacing: 0.2px;
          }
          
          /* Dark theme support for inline code */
          .reader-content[data-theme="dark"] :not(pre) > code {
            background-color: #3A3A3A;
            color: #F8F8F2;
            border: 1px solid #666;
          }
          
          /* Sepia theme support for inline code */
          .reader-content[data-theme="sepia"] :not(pre) > code {
            background-color: rgba(89, 74, 56, 0.05);
            color: #594a38;
          }
          
          /* Paper theme support for inline code */
          .reader-content[data-theme="paper"] :not(pre) > code {
            background-color: rgba(51, 51, 51, 0.05);
            color: #333333;
          }
          
          /* Code language label */
          .code-lang-label {
            position: absolute;
            top: 0;
            right: 0;
            padding: 0.3em 0.6em;
            font-size: 0.75em;
            color: #fff;
            background: rgba(0, 0, 0, 0.5);
            border-radius: 0 6px 0 6px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            text-transform: uppercase;
            z-index: 1;
            letter-spacing: 0.5px;
          }
          
          /* Dark theme support for code language label */
          .reader-content[data-theme="dark"] .code-lang-label {
            background: #505050;
            color: #FFFFFF;
            border: 1px solid #777;
            font-weight: bold;
          }
          
          /* Sepia theme support for code language label */
          .reader-content[data-theme="sepia"] .code-lang-label {
            background: rgba(89, 74, 56, 0.5);
          }
          
          /* Paper theme support for code language label */
          .reader-content[data-theme="paper"] .code-lang-label {
            background: rgba(51, 51, 51, 0.5);
          }
          
          /* Fix for mobile devices */
          @media (max-width: 768px) {
            .reader-content pre {
              padding: 0.8em;
              font-size: 0.85em;
              margin: 1em 0;
            }
            
            .code-lang-label {
              font-size: 0.7em;
              padding: 0.2em 0.4em;
            }
          }
          
          ${getLinkStyles()}
        `}</style>
        
        <div style={{
          maxWidth: `${readingWidth}px`,
          margin: "0 auto",
          padding: "20px 0 40px",
          overflow: "visible" /* Ensures no cutting of shadows/decorations */
        }}>
          {/* Article Content */}
          <div 
            className="reader-content"
            data-theme={settings.theme}
            data-content-lang={detectedLanguage}
            data-text-align={settings.textAlign}
            style={{
              padding: "0 20px", 
              width: "100%", 
              maxWidth: settings.width + "px", 
              margin: "0 auto",
              ...contentStyle
            }}
            ref={readerContentRef}
          >
            <h1 style={{ 
              fontSize: detectedLanguage === 'zh' ? "2.2rem" : "2rem", 
              lineHeight: "1.3", 
              marginBottom: "1rem",
              fontWeight: "bold"
            }}>
              {article.title}
            </h1>
            
            {/* Article metadata if available */}
            {(article.author || article.date || article.siteName) && (
              <div style={{ 
                marginBottom: "2rem", 
                color: "#666",
                fontSize: "0.9rem",
                opacity: 0.8 
              }}>
                {article.author && <span>{article.author}</span>}
                {article.author && article.date && <span> • </span>}
                {article.date && <span>{article.date}</span>}
                {(article.author || article.date) && article.siteName && <span> • </span>}
                {article.siteName && <span>{article.siteName}</span>}
              </div>
            )}
            
            <div 
              dangerouslySetInnerHTML={{ __html: article.content }} 
            />
          </div>
        </div>
      </div>
    </>
  )
}

export default Reader