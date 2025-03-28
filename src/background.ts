/**
 * Background script for the ReadLite extension
 * Handles icon clicks and executes content script function
 */

// Track which tabs have content scripts loaded
const tabsWithContentScript = new Set<number>();

// Track active state of the extension
let isActive = false;

// Colors based on the purple book icon
const BADGE_BACKGROUND_COLOR: [number, number, number, number] = [177, 156, 217, 255]; // #B19CD9 - Lavender purple (original icon color)

// Listen for content script ready messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    
  // Mark tab as having content script ready
  if (message.type === "CONTENT_SCRIPT_READY" && sender.tab?.id) {
    tabsWithContentScript.add(sender.tab.id);
    sendResponse({ received: true });
    return true;
  }
  
  return false;
});

// Listen for tab updates to track when content scripts are loaded
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // When tab is fully loaded, we can assume content script is injected
  if (changeInfo.status === "complete") {
    // Wait a bit to ensure content script has initialized
    setTimeout(() => {
      tabsWithContentScript.add(tabId);
    }, 500);
  }
});

// Remove tab from tracking when closed
chrome.tabs.onRemoved.addListener((tabId) => {
  tabsWithContentScript.delete(tabId);
});

// Function to toggle reader mode in a tab
async function toggleReaderMode(tabId: number) {
    
  try {
    // Send message to content script
    const response = await chrome.tabs.sendMessage(tabId, {
      type: "TOGGLE_READER_MODE",
      from: "background"
    });
      } catch (error) {
    console.error("Error sending message to content script:", error);
    
    // Check if the error is because content script isn't ready
    if (error instanceof Error && error.message.includes("receiving end does not exist")) {
            
      try {
        // Reload the tab to ensure content script is injected
        await chrome.tabs.reload(tabId);
        
        // Wait for page to load and then try again
        setTimeout(async () => {
          try {
            const retryResponse = await chrome.tabs.sendMessage(tabId, {
              type: "TOGGLE_READER_MODE",
              from: "background-retry"
            });
                      } catch (retryError) {
            console.error("Failed to toggle reader mode after reload:", retryError);
          }
        }, 2000);
      } catch (reloadError) {
        console.error("Failed to reload tab:", reloadError);
      }
    }
  }
}

/**
 * Update the extension icon state
 * @param active - Whether the extension is active
 */
function updateIconState(active: boolean) {
  if (active) {
    // For active state: use "on" text with a compact badge
    chrome.action.setBadgeText({ text: "ON" });
    
    // Use the lavender purple color that matches the icon
    chrome.action.setBadgeBackgroundColor({ 
      color: BADGE_BACKGROUND_COLOR 
    });
    
    // Make badge text smaller and more compact
    chrome.action.setBadgeTextColor({ color: "#FFFFFF" });
  } else {
    // For inactive state: clear the badge completely
    chrome.action.setBadgeText({ text: "" });
  }
  
  // Store the current state
  isActive = active;
}

// Listen for extension icon clicks
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  
  // Toggle the active state
  isActive = !isActive;
  
  // Update the icon to reflect the new state
  updateIconState(isActive);
  
  try {
    // Execute script to dispatch the custom event directly
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Create and dispatch the event directly
        document.dispatchEvent(new CustomEvent('READLITE_TOGGLE_INTERNAL'));
      }
    });
    
  } catch (error) {
    console.error("Error executing script:", error);
  }
});

// Initialize icon state on extension load
updateIconState(isActive); 