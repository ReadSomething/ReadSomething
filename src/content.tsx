import React, { useState, useEffect } from "react"
import type { PlasmoCSConfig } from "plasmo"
import { ReaderProvider } from "./context/ReaderContext"
import { I18nProvider } from "./context/I18nContext"
import Reader from "./components/Reader"

// Content script configuration
export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_idle"
}

// Set the content script world directly (won't be included in manifest)
// @ts-ignore - This is a Plasmo-specific configuration
export const world = "ISOLATED"

// Content Script UI Component
const ContentScriptUI = () => {
  const [isActive, setIsActive] = useState(false)
  
  // Toggle reader mode function
  const toggleReaderMode = () => {
        setIsActive(!isActive)
  }

  // Listen for messages via custom events
  useEffect(() => {
    // Custom event handler
    const handleCustomEvent = () => {
            toggleReaderMode();
    };
    
    // Add event listener
    document.addEventListener('READLITE_TOGGLE_INTERNAL', handleCustomEvent);
    
    return () => {
      document.removeEventListener('READLITE_TOGGLE_INTERNAL', handleCustomEvent);
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

// Log that the content script has loaded

export default ContentScriptUI 