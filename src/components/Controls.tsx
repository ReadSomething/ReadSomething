import React, { useState, useEffect } from "react"
import { exportAsMarkdown } from "../utils/export"
import { Article } from "../utils/parser"
import { useI18n } from "../hooks/useI18n"

// --- Types & Interfaces ---

interface ControlsProps {
  onToggleSettings: () => void;
  onClose: () => void;
  theme: "light" | "dark" | "sepia" | "paper";
  article: Article;
}

// Simplified structure for theme-specific styles (menu styles removed)
interface ThemeStyles {
  container: React.CSSProperties;
  settingsButton: React.CSSProperties;
  closeButton: React.CSSProperties;
  downloadButton: React.CSSProperties;
  aiButton: React.CSSProperties;
}

// --- Constants ---

const BASE_BUTTON_STYLE: React.CSSProperties = {
  width: "40px",
  height: "40px",
  borderRadius: "50%",
  border: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
  transition: "transform 0.15s ease, box-shadow 0.15s ease",
  position: "relative", // Added for potential pseudo-elements or indicators
};

// --- Component --- 

/**
 * Reader controls component
 * Provides floating action buttons for settings, download (Markdown), AI assistant, and closing the reader.
 */
const Controls: React.FC<ControlsProps> = ({ onToggleSettings, onClose, theme, article }) => {
  const { t } = useI18n();
  // Removed isDownloadMenuOpen state
  const LOG_PREFIX = "[Controls]";

  // --- Event Handlers ---

  /** Opens the AI Assistant side panel by sending a message to the background script. */
  const toggleAIAssistant = () => {
    console.log(`${LOG_PREFIX} Sending OPEN_SIDEPANEL message.`);
    chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL' })
      .catch(error => console.warn(`${LOG_PREFIX} Failed to send OPEN_SIDEPANEL message:`, error));
  };
  
  /** Handles the download button click, exporting the article as Markdown. */
  const handleMarkdownDownload = (e: React.MouseEvent) => {
    console.log(`${LOG_PREFIX} Handling Markdown download request.`);
    // Stop propagation if called from button event
    if (e) {
      e.stopPropagation(); 
      e.preventDefault();
    }
    
    // TODO: Add visual feedback (e.g., button loading state)
    if (article?.title && article.content) {
      try {
        exportAsMarkdown(article.title, article.content);
        console.log(`${LOG_PREFIX} Markdown export initiated for: ${article.title}`);
        // TODO: Add success feedback
      } catch (error) {
        console.error(`${LOG_PREFIX} Export to Markdown failed:`, error);
        // TODO: Add error feedback
      }
    } else {
      console.error(`${LOG_PREFIX} Cannot export Markdown: Missing article title or content.`);
      // TODO: Add feedback for missing data
    }
  };

  // Removed toggleDownloadMenu function
  // Removed useEffect for closing download menu

  // --- Styling --- 

  /**
   * Generates the style objects for UI elements based on the current theme.
   */
  const getStylesByTheme = (): ThemeStyles => {
    // Define theme-specific color palettes and overrides
    let buttonBg = "white";
    let buttonColor = "#333";

    switch (theme) {
      case "dark":
        buttonBg = "#444";
        buttonColor = "white";
        break;
      case "sepia":
        buttonBg = "#e8d9c0";
        buttonColor = "#5b4636";
        break;
      case "paper":
        buttonBg = "#EFEFEF";
        buttonColor = "#000000";
        break;
    }

    // Construct the full styles object using base styles and overrides
    const commonButtonStyle = { 
        ...BASE_BUTTON_STYLE, 
        backgroundColor: buttonBg, 
        color: buttonColor 
    };
    
    return {
      container: {
        backgroundColor: "transparent"
      },
      settingsButton: commonButtonStyle,
      closeButton: commonButtonStyle,
      downloadButton: commonButtonStyle,
      aiButton: commonButtonStyle,
      // Removed downloadMenu and downloadMenuItem styles
    };
  }
  
  const styles = getStylesByTheme();

  // Removed getMenuItemStyle function
  
  // --- Render --- 

  return (
    // Main container for the controls, positioned fixed
    <div style={{
      position: "fixed",
      top: "20px",
      right: "20px",
      display: "flex",
      flexDirection: "row", // Changed back to row layout
      gap: "12px",
      zIndex: 2147483647, // High z-index to stay on top
      ...styles.container 
     }} 
     className="reader-controls"
    >
      {/* Settings Button */}
      <button 
        onClick={onToggleSettings}
        style={styles.settingsButton}
        aria-label={t('settings')}
        title={t('settings')}
      >
        {/* Settings Icon SVG */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 18C15.3137 18 18 15.3137 18 12C18 8.68629 15.3137 6 12 6C8.68629 6 6 8.68629 6 12C6 15.3137 8.68629 18 12 18Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M22 12H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 12H2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 4V2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 22V20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M19.0708 4.92969L17.6566 6.3439" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M6.34337 17.6569L4.92915 19.0711" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M19.0708 19.0711L17.6566 17.6569" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M6.34337 6.3439L4.92915 4.92969" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      
      {/* Download Button (Direct Markdown Download) */}
      {/* Removed outer div wrapper */}
      <button 
        onClick={handleMarkdownDownload} // Changed onClick handler
        style={styles.downloadButton}
        aria-label={t('downloadAsMarkdown')} // Updated aria-label
        title={t('downloadAsMarkdown')} // Updated title
        // Removed aria-haspopup and aria-expanded
      >
        {/* Download Icon SVG */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3L12 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 12L12 16L8 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12L21 20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22L5 22C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20L3 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      {/* Removed Dropdown Menu JSX */}
      
      {/* AI Assistant Button */}
      <button
        onClick={toggleAIAssistant}
        style={styles.aiButton}
        aria-label={t('aiAssistant')}
        title={t('aiAssistant')}
      >
        {/* New AI Icon SVG (Robot Head) */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 8V4H8"/>
          <rect x="4" y="8" width="16" height="12" rx="2"/>
          <path d="M8 12h8"/>
          <path d="M16 8V4h4"/>
          <circle cx="12" cy="14" r="1"/> 
        </svg>
      </button>
      
      {/* Close Button */}
      <button
        onClick={onClose}
        style={styles.closeButton}
        aria-label={t('close')}
        title={t('close')}
      >
        {/* Close Icon SVG */}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
    </div>
  )
}

export default Controls 