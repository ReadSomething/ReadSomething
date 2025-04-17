import React, { useState, useEffect, useRef } from "react"
import type { PlasmoCSConfig } from "plasmo"
import { createPortal } from "react-dom"
import { ReaderProvider } from "./context/ReaderContext"
import { I18nProvider } from "./context/I18nContext"
import Reader from "./components/Reader"
import { setupAuthListener } from "./utils/auth"
import { createRoot } from 'react-dom/client'

// --- Config --- 

// Content script configuration
export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_idle"
}

// Set the content script world directly (won't be included in manifest)
// @ts-ignore - This is a Plasmo-specific configuration
export const world = "ISOLATED"

// --- Types --- 

// Define types for messages this script might receive or send
// Based on types used in background.ts
interface ReaderModeChangedMessage { type: 'READER_MODE_CHANGED'; isActive: boolean; }
interface ContentScriptReadyMessage { type: 'CONTENT_SCRIPT_READY'; }

// Type for messages potentially received from background (currently none handled)
type BackgroundMessage = {
  type: string;
  // Add other potential properties if messages are handled in the future
  [key: string]: any; 
};

// Extracted StyleIsolator component so it can be reused
export const StyleIsolator: React.FC<{ 
  children: React.ReactNode; 
  className?: string;
  fitContent?: boolean; // Add new prop to control if it fits content or full screen
  theme?: 'light' | 'dark' | 'sepia' | 'paper'; // Add theme prop
}> = ({ 
  children, 
  className = 'readlite-root',
  fitContent = false,
  theme = 'light' // Default theme
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null);
  const [mountPoint, setMountPoint] = useState<HTMLDivElement | null>(null);

  // Set up Shadow DOM and mount point - only run once
  useEffect(() => {
    if (!containerRef.current) return;

    // Only create shadow DOM if it doesn't already exist
    if (!containerRef.current.shadowRoot) {
      console.log("StyleIsolator creating shadow root");
      const shadow = containerRef.current.attachShadow({ mode: 'open' });
      setShadowRoot(shadow);
      
      // Create mount point
      const mount = document.createElement('div');
      mount.className = className;
      mount.setAttribute('data-theme', theme); // Add theme as data attribute
      shadow.appendChild(mount);
      setMountPoint(mount);
      
      // Load compiled Tailwind CSS
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        const tailwindLink = document.createElement('link');
        tailwindLink.rel = 'stylesheet';
        tailwindLink.href = chrome.runtime.getURL('src/styles/tailwind.output.css');
        shadow.appendChild(tailwindLink);
      }
    }
    
    return () => {
      // Only clean up if we're unmounting completely
      if (containerRef.current && containerRef.current.shadowRoot && containerRef.current.isConnected === false) {
        while (containerRef.current.shadowRoot.firstChild) {
          containerRef.current.shadowRoot.removeChild(containerRef.current.shadowRoot.firstChild);
        }
      }
    };
  }, [className]); // Only depends on className, not theme or fitContent
  
  // Update theme styles when theme changes
  useEffect(() => {
    if (!shadowRoot) return;
    
    // Update theme on mount point
    if (mountPoint) {
      mountPoint.setAttribute('data-theme', theme);
      console.log("StyleIsolator updated theme attribute to:", theme);
    }
    
    // Find or create style element
    let styleElement = shadowRoot.getElementById('readlite-theme-styles');
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'readlite-theme-styles';
      shadowRoot.insertBefore(styleElement, shadowRoot.firstChild);
    }
    
    // Update style content for the current theme
    styleElement.textContent = `
      :host {
        all: initial !important;
        display: block !important;
        position: ${fitContent ? 'relative' : 'fixed'} !important;
        top: ${fitContent ? 'auto' : '0'} !important;
        left: ${fitContent ? 'auto' : '0'} !important;
        width: ${fitContent ? '100%' : '100%'} !important;
        height: ${fitContent ? '100%' : '100%'} !important;
        z-index: ${fitContent ? 'auto' : '2147483645'} !important;
        pointer-events: auto !important;
      }
      
      .${className} {
        all: initial !important;
        display: block !important;
        width: 100% !important;
        height: 100% !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
        color: #333333 !important;
        background-color: transparent !important;
      }
      
      /* Prevent host page styles from leaking in */
      .${className} * {
        font-family: inherit !important;
        box-sizing: border-box !important;
      }
      
      /* Direct theme styles instead of variables */
      .${className}[data-theme="dark"] {
        color: white !important;
        background-color: #1a1b26 !important;
      }
      
      .${className}[data-theme="dark"] .readlite-agent-bubble,
      .${className}[data-theme="dark"] .readlite-message-content {
        background-color: #383a3f !important;
        color: white !important;
        border-color: rgba(60, 64, 67, 0.3) !important;
      }
      
      .${className}[data-theme="dark"] .readlite-markdown-content * {
        color: white !important;
      }
    `;
  }, [theme, fitContent, className, shadowRoot, mountPoint]);
  
  // Only render content when mount point is available
  if (!mountPoint) {
    return <div ref={containerRef} id="readlite-shadow-container"></div>;
  }
  
  // Use createPortal to render content into Shadow DOM mount point
  return (
    <div ref={containerRef} id="readlite-shadow-container">
      {createPortal(children, mountPoint)}
    </div>
  );
};

// --- Component --- 

/**
 * Content Script UI Component
 * Injected into the page, manages the reader mode state, and renders the Reader UI.
 */
const ContentScriptUI = () => {
  const [isActive, setIsActive] = useState(false)
  const LOG_PREFIX = "[ContentScriptUI]";

  /**
   * Toggles the reader mode state and notifies the background script.
   */
  const toggleReaderMode = () => {
    console.log(`${LOG_PREFIX} Toggling reader mode...`);
    setIsActive(prevState => {
      const newState = !prevState;
      console.log(`${LOG_PREFIX} Reader mode is now: ${newState ? 'Active' : 'Inactive'}`);
      // Notify background script about the state change
      chrome.runtime.sendMessage<ReaderModeChangedMessage>({ 
        type: "READER_MODE_CHANGED", 
        isActive: newState 
      }).catch(error => {
        console.warn(`${LOG_PREFIX} Failed to send READER_MODE_CHANGED message:`, error);
      });
      return newState;
    });
  }

  // Set up listeners and initial communication
  useEffect(() => {
    /**
     * Handles the custom event dispatched by the background script 
     * (via executeScript) to toggle the reader UI.
     */
    const handleInternalToggleEvent = () => {
      console.log(`${LOG_PREFIX} Received internal toggle event.`);
      toggleReaderMode();
    };
    
    document.addEventListener('READLITE_TOGGLE_INTERNAL', handleInternalToggleEvent);
    
    // Notify background script that this content script instance is ready
    console.log(`${LOG_PREFIX} Sending CONTENT_SCRIPT_READY message.`);
    chrome.runtime.sendMessage<ContentScriptReadyMessage>({ type: "CONTENT_SCRIPT_READY" })
      .catch(error => {
        console.warn(`${LOG_PREFIX} Failed to send CONTENT_SCRIPT_READY message:`, error);
      });
    
    /**
     * Handles messages received directly from the background script.
     * Currently, no messages are processed here, but the listener structure remains.
     */
    const handleBackgroundMessages = (
      message: BackgroundMessage, 
      sender: chrome.runtime.MessageSender, 
      sendResponse: (response?: any) => void
    ): boolean => { // Explicitly return boolean
      // Example: Check for a hypothetical future message type
      // if (message.type === 'SOME_FUTURE_ACTION') {
      //   console.log("Received SOME_FUTURE_ACTION", message);
      //   sendResponse({ received: true });
      //   return true; 
      // }
      return false; // Indicate message not handled asynchronously
    };
    
    // Add the message listener
    chrome.runtime.onMessage.addListener(handleBackgroundMessages);
    
    // Set up authentication listener for tokens from ReadLite web app
    // This will listen for postMessage events from the auth page and store tokens
    setupAuthListener();
    
    return () => {
      console.log(`${LOG_PREFIX} Cleaning up listeners.`);
      document.removeEventListener('READLITE_TOGGLE_INTERNAL', handleInternalToggleEvent);
      // Check if the listener exists before trying to remove it (good practice)
      if (chrome.runtime?.onMessage?.hasListener(handleBackgroundMessages)) {
          chrome.runtime.onMessage.removeListener(handleBackgroundMessages);
      }
    };
  }, []); // Empty dependency array: Run only on mount and unmount
  
  // --- Rendering --- 

  // Do not render the UI if reader mode is inactive
  if (!isActive) {
    // Ensure the body class is removed if we become inactive
    // This might be redundant if Reader component handles it, but good safety.
    document.documentElement.classList.remove('readlite-active');
    return null;
  }
  
  // Add class to html element when active to disable page scroll
  document.documentElement.classList.add('readlite-active');
    
  return (
    <StyleIsolator>
      <div className="readlite-container" style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 2147483645,
        overflow: "hidden",
        backgroundColor: "var(--color-background, #ffffff)",
        color: "var(--color-text, #333333)"
      }}>
        <style>{`
          /* Key isolation styles */
          html.readlite-active {
            overflow: hidden !important;
          }
          
          /* Base style variables */
          .readlite-container {
            --color-background: #ffffff;
            --color-message-bg: #f8f9fa;
            --color-user-bubble: #e2efff;
            --color-agent-bubble: #ffffff;
            --color-input-bg: #ffffff;
            --color-text: #333333;
            --color-text-user: #1a1a1a;
            --color-text-agent: #1a1a1a;
            --color-text-secondary: #5f6368;
            --color-accent: #1a73e8;
            --color-border: #dadce0;
            --color-error: #d93025;
            --color-scrollbar: #dadce0;
            --color-scrollbar-hover: #bdc1c6;
            --color-chip-bg: #f1f3f4;
            --color-thinking-pulse: #e2efff;
          }
          
          /* Dark mode */
          .readlite-container.dark {
            --color-background: #202124;
            --color-message-bg: #292a2d;
            --color-user-bubble: #174ea6;
            --color-agent-bubble: #383a3f;
            --color-input-bg: #202124;
            --color-text: #ffffff;
            --color-text-user: #ffffff;
            --color-text-agent: #ffffff;
            --color-text-secondary: #9aa0a6;
            --color-accent: #8ab4f8;
            --color-border: #3c4043;
            --color-error: #f28b82;
            --color-scrollbar: #3c4043;
            --color-scrollbar-hover: #5f6368;
            --color-chip-bg: #3c4043;
            --color-thinking-pulse: #174ea6;
          }
        `}</style>
        <I18nProvider>
          <ReaderProvider>
            <Reader />
          </ReaderProvider>
        </I18nProvider>
      </div>
    </StyleIsolator>
  )
}

// Injection point for the content script
const app = document.createElement('div');
app.id = 'readlite-root';
document.body.appendChild(app);

// Create React root
const root = createRoot(app);
root.render(<ContentScriptUI />);

console.log('[Content Script] ReadLite content script initialized');

export default ContentScriptUI