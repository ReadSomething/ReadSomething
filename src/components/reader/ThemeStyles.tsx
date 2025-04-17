import React from 'react';

interface ThemeStylesProps {
  theme: 'light' | 'dark' | 'sepia' | 'paper';
  lineHeight?: number;
}

/**
 * Generates and injects theme-specific CSS styles
 */
const ThemeStyles: React.FC<ThemeStylesProps> = ({ theme, lineHeight }) => {
  /**
   * Generates CSS rules for link colors and other theme-specific styles.
   */
  const generateThemeCss = (): string => {
    let css = ``;
    
    // Base link styles
    css += `
      [data-theme="${theme}"] a { 
        text-decoration: none;
        transition: color 0.2s ease;
      }
      [data-theme="${theme}"] a:hover { 
        text-decoration: underline;
      }
    `;

    // Add styles for selection toolbar
    css += `
      /* Selection Toolbar Styles */
      .selection-toolbar {
        animation: fadeIn 0.15s ease-out;
        box-shadow: 0 2px 10px ${theme === 'dark' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)'};
        backdrop-filter: blur(5px);
        -webkit-backdrop-filter: blur(5px);
        border: 1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'};
      }
      
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(5px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      .toolbar-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }
      
      .toolbar-btn:hover {
        background-color: ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'};
      }
      
      [data-theme="${theme}"] .toolbar-btn {
        color: ${theme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.7)'};
      }
    `;

    // Theme-specific colors
    switch (theme) {
      case "dark":
        css += `
          [data-theme="dark"] a { color: rgba(123, 176, 255, 0.85); }
          [data-theme="dark"] a:visited { color: rgba(175, 156, 239, 0.85); }
          [data-theme="dark"] a:hover { color: rgba(153, 204, 255, 0.95); }
          [data-theme="dark"] a:active { color: rgba(92, 154, 255, 0.95); }
          
          [data-theme="dark"] h1, [data-theme="dark"] h2, [data-theme="dark"] h3 {
            color: rgba(255, 255, 255, 0.9);
          }
          
          [data-theme="dark"] p, [data-theme="dark"] li {
            color: rgba(255, 255, 255, 0.85);
          }
        `;
        break;
      case "sepia":
        css += `
          [data-theme="sepia"] a { color: rgba(157, 99, 60, 0.85); }
          [data-theme="sepia"] a:visited { color: rgba(122, 88, 47, 0.8); }
          [data-theme="sepia"] a:hover { color: rgba(179, 117, 68, 0.95); }
          [data-theme="sepia"] a:active { color: rgba(134, 83, 47, 0.95); }
          
          [data-theme="sepia"] h1, [data-theme="sepia"] h2, [data-theme="sepia"] h3 {
            color: rgba(89, 74, 56, 0.95);
          }
          
          [data-theme="sepia"] p, [data-theme="sepia"] li {
            color: rgba(89, 74, 56, 0.85);
          }
        `;
        break;
      case "paper":
        css += `
          [data-theme="paper"] a { color: rgba(80, 80, 80, 0.85); }
          [data-theme="paper"] a:visited { color: rgba(112, 112, 112, 0.8); }
          [data-theme="paper"] a:hover { color: rgba(48, 48, 48, 0.95); }
          [data-theme="paper"] a:active { color: rgba(37, 37, 37, 0.95); }
          
          [data-theme="paper"] h1, [data-theme="paper"] h2, [data-theme="paper"] h3 {
            color: rgba(51, 51, 51, 0.9);
          }
          
          [data-theme="paper"] p, [data-theme="paper"] li {
            color: rgba(51, 51, 51, 0.85);
          }
        `;
        break;
      default: // light
        css += `
          [data-theme="light"] a { color: rgba(0, 119, 204, 0.85); }
          [data-theme="light"] a:visited { color: rgba(107, 64, 189, 0.8); }
          [data-theme="light"] a:hover { color: rgba(0, 85, 170, 0.95); }
          [data-theme="light"] a:active { color: rgba(0, 68, 136, 0.95); }
          
          [data-theme="light"] h1, [data-theme="light"] h2, [data-theme="light"] h3 {
            color: rgba(44, 44, 46, 0.9);
          }
          
          [data-theme="light"] p, [data-theme="light"] li {
            color: rgba(44, 44, 46, 0.85);
          }
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
        color: ${theme === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)'};
        background-color: ${theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'};
        border-radius: 3px;
        pointer-events: none; /* Don't interfere with selecting text */
        z-index: 1; /* Ensure it's above code content */
      }
      
      pre {
        position: relative; /* Needed for absolute positioning of label */
        /* Add some padding to prevent label overlap with code */
        padding-top: 2em !important; 
        background-color: ${theme === 'dark' ? 'rgba(30, 30, 30, 0.5)' : 'rgba(245, 245, 245, 0.8)'} !important;
        border-radius: 4px;
        border: 1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'};
      }
      
      code {
        font-family: 'SF Mono', SFMono-Regular, ui-monospace, Menlo, Monaco, 'Cascadia Mono', 'Segoe UI Mono', monospace;
        font-size: 0.9em;
        background-color: ${theme === 'dark' ? 'rgba(40, 40, 40, 0.6)' : 'rgba(240, 240, 240, 0.8)'};
        padding: 0.2em 0.4em;
        border-radius: 3px;
      }
      
      /* Add responsive image styles */
      .reader-content img {
        width: 100%;    /* Forces image to span container width */
        max-width: 100%; /* Still good practice to prevent overflow in rare cases */
        height: auto;   /* Maintains aspect ratio */
        display: block; /* Prevents extra space below image */
        margin-top: 1em; /* Add some space above images */
        margin-bottom: 1em; /* Add some space below images */
        border-radius: 4px; /* Slightly rounded corners */
        ${theme === 'dark' ? 'filter: brightness(0.95);' : ''}
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
        font-size: 0.85em; /* Slightly smaller text */
        font-style: italic; /* Italicize for distinction */
        text-align: center; /* Center the caption text */
        color: ${theme === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.5)'}; /* Slightly muted color */
        background-color: ${theme === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)'}; /* Optional subtle background */
        border-radius: 3px;
      }
      
      /* Add some spacing between paragraphs */
      .reader-content p {
        margin: 0.8em 0;
        line-height: ${lineHeight ? lineHeight * 0.9 : 1.5}; /* Slightly reduced line height */
      }
      
      /* Style blockquotes */
      .reader-content blockquote {
        border-left: 3px solid ${theme === 'dark' 
          ? 'rgba(100, 181, 246, 0.5)' 
          : theme === 'sepia'
            ? 'rgba(157, 99, 60, 0.5)'
            : theme === 'paper'
              ? 'rgba(80, 80, 80, 0.3)'
              : 'rgba(0, 119, 204, 0.3)'};
        margin: 1em 0;
        padding: 0.5em 0 0.5em 1em;
        background-color: ${theme === 'dark' 
          ? 'rgba(255, 255, 255, 0.03)' 
          : 'rgba(0, 0, 0, 0.02)'};
        border-radius: 2px;
      }
      
      .reader-content blockquote p {
        color: ${theme === 'dark' 
          ? 'rgba(255, 255, 255, 0.75)' 
          : 'rgba(0, 0, 0, 0.65)'};
      }
      
      /* Style headings with subtle bottom borders */
      .reader-content h1, .reader-content h2 {
        padding-bottom: 0.3em;
        margin-top: 1.5em;
        margin-bottom: 0.8em;
      }
      
      .reader-content h3, .reader-content h4 {
        margin-top: 1.2em;
        margin-bottom: 0.5em;
      }
    `;

    // Add styles for highlighted text
    css += `
      /* Highlighted text styles */
      .reader-highlight {
        background-color: ${
          theme === 'dark' ? 'rgba(255, 255, 0, 0.25)' : 
          theme === 'sepia' ? 'rgba(255, 222, 173, 0.5)' : 
          theme === 'paper' ? 'rgba(255, 204, 0, 0.3)' : 
          'rgba(255, 255, 0, 0.4)'
        };
        padding: 1px 0;
        border-radius: 2px;
        transition: background-color 0.3s ease;
      }
      
      .reader-highlight:hover {
        background-color: ${
          theme === 'dark' ? 'rgba(255, 255, 0, 0.35)' : 
          theme === 'sepia' ? 'rgba(255, 222, 173, 0.6)' : 
          theme === 'paper' ? 'rgba(255, 204, 0, 0.4)' : 
          'rgba(255, 255, 0, 0.5)'
        };
      }
    `;

    return css;
  }

  return <style dangerouslySetInnerHTML={{ __html: generateThemeCss() }} />;
}

export default ThemeStyles; 