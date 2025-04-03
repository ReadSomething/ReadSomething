import React, { useState, useEffect } from "react"
import type { PlasmoCSConfig } from "plasmo"
import { ReaderProvider } from "./context/ReaderContext"
import { I18nProvider } from "./context/I18nContext"
import Reader from "./components/Reader"

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
    
    // Cleanup function for when the component unmounts or dependencies change
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
    document.documentElement.classList.remove('plasmo-csui-active');
    return null;
  }
  
  // Add class to html element when active to disable page scroll
  document.documentElement.classList.add('plasmo-csui-active');
    
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
        /* Apply overflow: hidden directly to html when reader is active */
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