import React, { useState, useRef, useEffect } from "react"
import { exportAsMarkdown } from "../utils/export"
import { Article } from "../utils/parser"
import { useI18n } from "../hooks/useI18n"

interface ControlsProps {
  onToggleSettings: () => void;
  onClose: () => void;
  theme: "light" | "dark" | "sepia" | "paper";
  article: Article;
}

/**
 * Reader controls component
 * Provides buttons for settings and closing the reader
 */
const Controls: React.FC<ControlsProps> = ({ onToggleSettings, onClose, theme, article }) => {
  const { t } = useI18n();
  
  // Get button styles based on theme
  const getStylesByTheme = () => {
    const baseButtonStyle: React.CSSProperties = {
      width: "40px",
      height: "40px",
      borderRadius: "50%",
      border: "none",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
      transition: "transform 0.15s ease, box-shadow 0.15s ease"
    }
    
    // Change button contrast based on theme
    switch (theme) {
      case "dark":
        return {
          container: {
            backgroundColor: "transparent"
          },
          settingsButton: {
            ...baseButtonStyle,
            backgroundColor: "#444",
            color: "white"
          },
          closeButton: {
            ...baseButtonStyle,
            backgroundColor: "#444",
            color: "white"
          },
          downloadButton: {
            ...baseButtonStyle,
            backgroundColor: "#444",
            color: "white"
          },
          downloadMenu: {
            backgroundColor: "#333",
            color: "white",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
            border: "1px solid #555"
          },
          downloadMenuItem: {
            color: "white",
            backgroundColor: "transparent",
            hover: {
              backgroundColor: "#555"
            }
          }
        }
      case "sepia":
        return {
          container: {
            backgroundColor: "transparent"
          },
          settingsButton: {
            ...baseButtonStyle,
            backgroundColor: "#e8d9c0",
            color: "#5b4636"
          },
          closeButton: {
            ...baseButtonStyle,
            backgroundColor: "#e8d9c0",
            color: "#5b4636"
          },
          downloadButton: {
            ...baseButtonStyle,
            backgroundColor: "#e8d9c0",
            color: "#5b4636"
          },
          downloadMenu: {
            backgroundColor: "#f9f1e3",
            color: "#5b4636",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
            border: "1px solid #e0d0b1"
          },
          downloadMenuItem: {
            color: "#5b4636",
            backgroundColor: "transparent",
            hover: {
              backgroundColor: "#f0e5d3"
            }
          }
        }
      case "paper":
        return {
          container: {
            backgroundColor: "transparent"
          },
          settingsButton: {
            ...baseButtonStyle,
            backgroundColor: "#EFEFEF",
            color: "#000000"
          },
          closeButton: {
            ...baseButtonStyle,
            backgroundColor: "#EFEFEF",
            color: "#000000"
          },
          downloadButton: {
            ...baseButtonStyle,
            backgroundColor: "#EFEFEF",
            color: "#000000"
          },
          downloadMenu: {
            backgroundColor: "#F7F7F7",
            color: "#000000",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
            border: "1px solid #E0E0E0"
          },
          downloadMenuItem: {
            color: "#000000",
            backgroundColor: "transparent",
            hover: {
              backgroundColor: "#EFEFEF"
            }
          }
        }
      default:
        return {
          container: {
            backgroundColor: "transparent"
          },
          settingsButton: {
            ...baseButtonStyle,
            backgroundColor: "white",
            color: "#333"
          },
          closeButton: {
            ...baseButtonStyle,
            backgroundColor: "white",
            color: "#333"
          },
          downloadButton: {
            ...baseButtonStyle,
            backgroundColor: "white",
            color: "#333"
          },
          downloadMenu: {
            backgroundColor: "white",
            color: "#333",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
            border: "1px solid #EFEFEF"
          },
          downloadMenuItem: {
            color: "#333",
            backgroundColor: "transparent",
            hover: {
              backgroundColor: "#F7F7F7"
            }
          }
        }
    }
  }
  
  // Handle download as Markdown
  const handleMarkdownDownload = (e: React.MouseEvent) => {
    // Stop event propagation immediately
    e.nativeEvent.stopImmediatePropagation();
    e.stopPropagation();
    e.preventDefault();
    
    // Use setTimeout with 0 delay to break out of the current event loop
    // This helps avoid conflicts with other scripts
    setTimeout(() => {
      if (article && article.title && article.content) {
        try {
          // Call the export function in a separate try-catch
          exportAsMarkdown(article.title, article.content);
        } catch (error) {
          console.error("Export to Markdown failed:", error);
        }
      } else {
        console.error("Cannot export Markdown: Missing article data");
      }
    }, 0);
  };
  
  const styles = getStylesByTheme()
  
  return (
    <div style={{
      position: "fixed",
      top: "20px",
      right: "20px",
      display: "flex",
      gap: "12px",
      zIndex: 2147483647,
      ...styles.container
    }}>
      <button
        style={styles.downloadButton}
        aria-label={t('download')}
        title={t('download')}
        onClick={handleMarkdownDownload}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 15L12 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8 11L12 15L16 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M20 15V18C20 19.1046 19.1046 20 18 20H6C4.89543 20 4 19.1046 4 18V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      
      {/* Settings Button */}
      <button
        onClick={onToggleSettings}
        style={styles.settingsButton}
        aria-label="Settings"
        title="Settings"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8.325 2.317C8.751 0.561 11.249 0.561 11.675 2.317C11.7389 2.5808 11.8642 2.82578 12.0407 3.032C12.2172 3.23822 12.4399 3.39985 12.6907 3.50375C12.9414 3.60764 13.2132 3.65085 13.4838 3.62987C13.7544 3.60889 14.0162 3.5243 14.248 3.383C15.791 2.443 17.558 4.209 16.618 5.753C16.4769 5.98466 16.3924 6.24634 16.3715 6.51677C16.3506 6.78721 16.3938 7.05877 16.4975 7.30938C16.6013 7.55999 16.7627 7.78258 16.9687 7.95905C17.1747 8.13553 17.4194 8.26091 17.683 8.325C19.439 8.751 19.439 11.249 17.683 11.675C17.4192 11.7389 17.1742 11.8642 16.968 12.0407C16.7618 12.2172 16.6001 12.4399 16.4963 12.6907C16.3924 12.9414 16.3491 13.2132 16.3701 13.4838C16.3911 13.7544 16.4757 14.0162 16.617 14.248C17.557 15.791 15.791 17.558 14.247 16.618C14.0153 16.4769 13.7537 16.3924 13.4832 16.3715C13.2128 16.3506 12.9412 16.3938 12.6906 16.4975C12.44 16.6013 12.2174 16.7627 12.0409 16.9687C11.8645 17.1747 11.7391 17.4194 11.675 17.683C11.249 19.439 8.751 19.439 8.325 17.683C8.26108 17.4192 8.13578 17.1742 7.95929 16.968C7.7828 16.7618 7.56011 16.6001 7.30935 16.4963C7.05859 16.3924 6.78683 16.3491 6.51621 16.3701C6.24559 16.3911 5.98375 16.4757 5.752 16.617C4.209 17.557 2.442 15.791 3.382 14.247C3.5231 14.0153 3.60755 13.7537 3.62848 13.4832C3.6494 13.2128 3.60624 12.9412 3.50247 12.6906C3.3987 12.44 3.23726 12.2174 3.03127 12.0409C2.82529 11.8645 2.58056 11.7391 2.317 11.675C0.561 11.249 0.561 8.751 2.317 8.325C2.5808 8.26108 2.82578 8.13578 3.032 7.95929C3.23822 7.7828 3.39985 7.56011 3.50375 7.30935C3.60764 7.05859 3.65085 6.78683 3.62987 6.51621C3.60889 6.24559 3.5243 5.98375 3.383 5.752C2.443 4.209 4.209 2.442 5.753 3.382C6.753 4.011 8.049 3.696 8.325 2.317Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M10 13C11.6569 13 13 11.6569 13 10C13 8.34315 11.6569 7 10 7C8.34315 7 7 8.34315 7 10C7 11.6569 8.34315 13 10 13Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      
      {/* Close Button */}
      <button
        onClick={onClose}
        style={styles.closeButton}
        aria-label="Close"
        title="Close"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  )
}

export default Controls 