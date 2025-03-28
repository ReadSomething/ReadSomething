/**
 * Background script for the ReadLite extension
 * Handles icon clicks and executes content script function
 */

// Track which tabs have reader mode active
const activeTabsMap = new Map<number, boolean>();

// Colors based on the purple book icon
const ACTIVE_COLOR: [number, number, number, number] = [177, 156, 217, 255]; // #B19CD9 - Lavender purple (original icon color)
const INACTIVE_COLOR: [number, number, number, number] = [216, 216, 240, 255]; // #D8D8F0 - Light gray-purple

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Ensure we have a tab ID
  if (!sender.tab?.id) return false;
  
  const tabId = sender.tab.id;
    
  // Mark tab as having content script ready
  if (message.type === "CONTENT_SCRIPT_READY") {
    sendResponse({ received: true });
    return true;
  }
  
  // Handle reader mode state changes
  if (message.type === "READER_MODE_CHANGED") {
    // Update our state tracking
    activeTabsMap.set(tabId, message.isActive);
    
    // Update the icon for this specific tab
    updateIconState(tabId, message.isActive);
    sendResponse({ received: true });
    return true;
  }
  
  return false;
});

/**
 * Update the extension icon state for a specific tab
 * @param tabId - The ID of the tab to update
 * @param active - Whether reader mode is active
 */
function updateIconState(tabId: number, active: boolean) {
  if (active) {
    // For active state: use "ON" text with a compact badge
    chrome.action.setBadgeText({ 
      tabId: tabId,
      text: "ON" 
    });
    
    // Use the lavender purple color that matches the icon
    chrome.action.setBadgeBackgroundColor({ 
      tabId: tabId,
      color: ACTIVE_COLOR 
    });
    
    // Make badge text smaller and more compact
    chrome.action.setBadgeTextColor({ 
      tabId: tabId,
      color: "#FFFFFF" 
    });
  } else {
    // For inactive state: clear the badge completely
    chrome.action.setBadgeText({ 
      tabId: tabId,
      text: "" 
    });
  }
}

// Handle tab switching to update the icon state correctly
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tabId = activeInfo.tabId;
  const isActive = activeTabsMap.get(tabId) || false;
  
  // Update icon state for the newly activated tab
  updateIconState(tabId, isActive);
});

// Listen for extension icon clicks
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  
  const tabId = tab.id;
  
  // Toggle the state for this tab
  const currentState = activeTabsMap.get(tabId) || false;
  const newState = !currentState;
  
  // Update our tracking
  activeTabsMap.set(tabId, newState);
  
  // Update the icon
  updateIconState(tabId, newState);
  
  try {
    // Execute script to dispatch the custom event directly
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        // Create and dispatch the event directly
        document.dispatchEvent(new CustomEvent('READLITE_TOGGLE_INTERNAL'));
      }
    });
    
  } catch (error) {
    console.error("Error executing script:", error);
  }
});

// Handle tab removal to clean up our state tracking
chrome.tabs.onRemoved.addListener((tabId) => {
  activeTabsMap.delete(tabId);
}); 