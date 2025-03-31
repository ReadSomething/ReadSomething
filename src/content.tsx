import React, { useState, useEffect } from "react"
import type { PlasmoCSConfig } from "plasmo"
import { ReaderProvider } from "./context/ReaderContext"
import { I18nProvider } from "./context/I18nContext"
import Reader from "./components/Reader"
import { createRoot } from "react-dom/client"

// Content script configuration
export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_idle"
}

// Set the content script world directly (won't be included in manifest)
// @ts-ignore - This is a Plasmo-specific configuration
export const world = "ISOLATED"

// Type definitions for messages
type BackgroundMessage = {
  type: string;
  isVisible?: boolean;
};

// Function to open the AI Assistant side panel
const openAIAssistant = () => {
  // Send message to background script to open side panel
  chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL' });
};

// Content Script UI Component
const ContentScriptUI = () => {
  const [isActive, setIsActive] = useState(false)
  
  // Toggle reader mode function
  const toggleReaderMode = () => {
    const newState = !isActive;
    setIsActive(newState);
    
    // Notify background script about the state change
    chrome.runtime.sendMessage({
      type: "READER_MODE_CHANGED",
      isActive: newState
    });
  }

  // Listen for messages via custom events
  useEffect(() => {
    // Custom event handler
    const handleCustomEvent = () => {
      toggleReaderMode();
    };
    
    // Add event listener
    document.addEventListener('READLITE_TOGGLE_INTERNAL', handleCustomEvent);
    
    // Notify background script that content script is ready
    chrome.runtime.sendMessage({
      type: "CONTENT_SCRIPT_READY"
    });
    
    // Listen for messages from background script
    const handleBackgroundMessages = (
      message: BackgroundMessage, 
      sender: chrome.runtime.MessageSender, 
      sendResponse: (response?: any) => void
    ) => {
      // Handle sidepanel visibility changes
      if (message.type === 'SIDEPANEL_VISIBILITY_CHANGED') {
        // Dispatch a custom event that the DOM can listen to
        window.postMessage({
          type: 'SIDEPANEL_VISIBILITY_CHANGED',
          isVisible: message.isVisible
        }, '*');
        
        // Send response that we received the message
        sendResponse({ received: true });
        return true;
      }
      return false;
    };
    
    // Add message listener
    chrome.runtime.onMessage.addListener(handleBackgroundMessages);
    
    return () => {
      document.removeEventListener('READLITE_TOGGLE_INTERNAL', handleCustomEvent);
      chrome.runtime.onMessage.removeListener(handleBackgroundMessages);
    };
  }, [isActive]);
  
  // If not active, don't render anything
  if (!isActive) {
    return null
  }
  
    
  return (
    <div className="plasmo-csui-container" style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      zIndex: 2147483645,
      overflow: "hidden"
    }}>
      <style>{`
        /* Only keep essential styles for container functionality */
        html.plasmo-csui-active {
          overflow: hidden !important;
        }
      `}</style>
      <I18nProvider>
        <ReaderProvider>
          <Reader />
        </ReaderProvider>
      </I18nProvider>
    </div>
  )
}

export default ContentScriptUI 