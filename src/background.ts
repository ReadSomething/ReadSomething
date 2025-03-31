/**
 * Background script for the ReadLite extension
 * Handles icon clicks and executes content script function
 */

// Background service worker for the ReadLite extension
import llmModule from './utils/llm';

// Enable the side panel when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  // Configure side panel to NOT open when user clicks on extension icon
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
});

// Track which tabs have reader mode active
const activeTabsMap = new Map<number, boolean>();
// Track which tabs have side panel open
const sidePanelActiveMap = new Map<number, boolean>();

// Colors for the extension icon
// For active state - Purple like the icon
const ACTIVE_COLOR: [number, number, number, number] = [187, 156, 216, 255]; // #BB9CD8 - Light purple like the icon
// For inactive state - Light gray-purple
const INACTIVE_COLOR: [number, number, number, number] = [216, 216, 240, 255]; // #D8D8F0 - Light gray-purple
// Text color for badge
const BADGE_TEXT_COLOR: [number, number, number, number] = [255, 255, 255, 255]; // White text

// Message types for communication between content script and service worker
type MessageType = 
  | { type: 'TOGGLE_READER_MODE' }
  | { type: 'OPEN_SIDEPANEL' }
  | { type: 'CLOSE_SIDEPANEL' }
  | { type: 'CONTENT_SCRIPT_READY' }
  | { type: 'READER_MODE_CHANGED', isActive: boolean }
  | { type: 'LLM_API_REQUEST', data: { method: string, params: any[] } };

// Handle messages from content script
chrome.runtime.onMessage.addListener((message: MessageType, sender, sendResponse) => {
  // Handle LLM API requests from sidepanel
  if ('type' in message && message.type === 'LLM_API_REQUEST' && 'data' in message) {
    console.log(`[DEBUG] background: Received LLM API request for method: "${message.data.method}"`);
    
    const { method, params } = message.data;
    console.log(`[DEBUG] background: Processing method "${method}"`);
    
    // Special handling for streaming methods
    if (method === 'generateTextStream') {
      if (
        llmModule && 
        typeof llmModule === 'object' && 
        'generateTextStream' in llmModule && 
        typeof (llmModule as any).generateTextStream === 'function'
      ) {
        // Get the sender.id to send back the stream chunks to the correct context
        const senderId = sender.id || '';
        const senderTabId = sender.tab?.id;
        
        try {
          // Extract prompt and options from params
          const [prompt, options] = params as [string, any];
          
          console.log(`[DEBUG] background: Setting up stream handler for ${prompt.substring(0, 30)}...`);
          
          // Add stream:true to options if not already set
          const streamOptions = { 
            ...options,
            stream: true 
          };
          
          // Create a callback to send chunks back to the client
          const streamHandler = (chunk: string) => {
            if (!chunk) {
              console.log(`[DEBUG] background: Empty chunk received, skipping`);
              return; // Skip empty chunks
            }
            
            try {
              // Log the chunk for debugging (but limit the size)
              const truncatedChunk = chunk.length > 30 ? chunk.substring(0, 30) + '...' : chunk;
              console.log(`[DEBUG] background: Sending stream chunk: "${truncatedChunk}"`);
              
              // Send message to client
              chrome.runtime.sendMessage({
                type: 'LLM_STREAM_CHUNK',
                data: { chunk }
              }).catch(error => {
                if (chrome.runtime.lastError) {
                  console.error(`[ERROR] background: Runtime error sending chunk: ${chrome.runtime.lastError.message}`);
                } else {
                  console.error(`[ERROR] background: Error sending stream chunk: ${error instanceof Error ? error.message : String(error)}`);
                }
              });
            } catch (error) {
              console.error(`[ERROR] background: Error in stream handler: ${error instanceof Error ? error.message : String(error)}`);
            }
          };
          
          // Call the streaming method with our chunk handler
          console.log(`[DEBUG] background: Starting streaming process for prompt: "${prompt.substring(0, 30)}..."`);
          
          let streamCompleted = false;
          
          (llmModule as any).generateTextStream(prompt, streamHandler, streamOptions)
            .then(() => {
              streamCompleted = true;
              console.log(`[DEBUG] background: Streaming completed successfully`);
              sendResponse({ success: true });
            })
            .catch((error: Error) => {
              console.error(`[ERROR] background: Streaming failed: ${error.message}`);
              console.error(error);
              sendResponse({ success: false, error: error.message });
            });
          
          // Set a safety timeout to ensure sendResponse is called
          setTimeout(() => {
            if (!streamCompleted) {
              console.warn(`[WARN] background: Stream safety timeout triggered after 30 seconds`);
              sendResponse({ 
                success: false, 
                error: 'Stream timed out after 30 seconds without completing' 
              });
            }
          }, 30000);
        } catch (error) {
          console.error(`[ERROR] background: Error in stream setup: ${error instanceof Error ? error.message : String(error)}`);
          console.error(error);
          sendResponse({ 
            success: false, 
            error: error instanceof Error ? error.message : String(error)
          });
        }
      } else {
        console.error(`[ERROR] background: Streaming method not found in LLM module`);
        sendResponse({ 
          success: false, 
          error: `Method generateTextStream not found in LLM API` 
        });
      }
      
      return true; // Indicates response will be sent asynchronously
    }
    
    // Regular (non-streaming) API methods
    if (
      llmModule && 
      typeof llmModule === 'object' && 
      method in llmModule && 
      typeof (llmModule as any)[method] === 'function'
    ) {
      console.log(`[DEBUG] background: Method "${method}" found in LLM module`);
      // Call the requested API method
      try {
        console.log(`[DEBUG] background: Calling LLM method "${method}" with params:`, params);
        const apiMethod = (llmModule as any)[method];
        apiMethod(...(params || []))
          .then((result: any) => {
            console.log(`[DEBUG] background: LLM API call successful`);
            sendResponse({ success: true, data: result });
          })
          .catch((error: Error) => {
            console.error(`[ERROR] background: LLM API call failed: ${error.message}`);
            sendResponse({ success: false, error: error.message });
          });
      } catch (error) {
        console.error(`[ERROR] background: Error executing LLM method: ${error instanceof Error ? error.message : String(error)}`);
        sendResponse({ 
          success: false, 
          error: error instanceof Error ? error.message : String(error)
        });
      }
    } else {
      console.error(`[ERROR] background: Method "${method}" not found in LLM module`);
      sendResponse({ 
        success: false, 
        error: `Method ${method} not found in LLM API` 
      });
    }
    
    return true; // Indicates response will be sent asynchronously
  }

  // Ensure we have a tab ID
  if (!sender.tab?.id) return false;
   
  const tabId = sender.tab.id;

  // Mark tab as having content script ready
  if ('type' in message && message.type === "CONTENT_SCRIPT_READY") {
    sendResponse({ received: true });
    return true;
  }
   
  // Handle reader mode state changes
  if ('type' in message && message.type === "READER_MODE_CHANGED" && 'isActive' in message) {
    // Update our state tracking
    activeTabsMap.set(tabId, message.isActive);
     
    // Update the icon for this specific tab
    updateIconState(tabId, message.isActive);
    sendResponse({ received: true });
    return true;
  }

  // Handle different message types
  if ('type' in message) {
    switch (message.type) {
      case 'TOGGLE_READER_MODE':
        handleToggleReaderMode(sender.tab);
        break;
      case 'OPEN_SIDEPANEL':
        openSidePanel(sender.tab);
        break;
      case 'CLOSE_SIDEPANEL':
        closeSidePanel(sender.tab);
        break;
    }
  }

  // Required to use sendResponse asynchronously
  return true;
});

// Update the extension icon based on reader mode state
function updateIconState(tabId: number, isActive: boolean) {
  const color = isActive ? ACTIVE_COLOR : INACTIVE_COLOR;
  
  // Set the badge color
  chrome.action.setBadgeBackgroundColor({
    tabId: tabId,
    color: color
  });

  // Set badge text color (white for better contrast)
  chrome.action.setBadgeTextColor({
    tabId: tabId,
    color: BADGE_TEXT_COLOR
  });
  
  // Set the badge text (ON when active, empty when inactive)
  chrome.action.setBadgeText({
    tabId: tabId,
    text: isActive ? "ON" : ""
  });
}

// Listen for tab updates to reset icons as needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // When a tab is fully loaded
  if (changeInfo.status === 'complete') {
    // Set the icon to inactive for this tab by default
    // The content script will message us if reader mode is active
    updateIconState(tabId, false);
  }
});

// Send a message to the content script about the side panel visibility
function sendSidePanelVisibilityMessage(tabId: number, isVisible: boolean) {
  chrome.tabs.sendMessage(tabId, {
    type: 'SIDEPANEL_VISIBILITY_CHANGED',
    isVisible: isVisible
  }).catch((error: Error) => {
    // Error handling silently
  });
}

// Open side panel in the current tab
function openSidePanel(tab?: chrome.tabs.Tab) {
  if (tab?.id) {
    chrome.sidePanel.open({ tabId: tab.id }).then(() => {
      // Mark the side panel as open for this tab
      sidePanelActiveMap.set(tab.id!, true);
      
      // Notify the content script about the side panel visibility change
      sendSidePanelVisibilityMessage(tab.id!, true);
    }).catch((error: Error) => {
      // Error handling silently
    });
  }
}

// Close side panel in the current tab
function closeSidePanel(tab?: chrome.tabs.Tab) {
  if (tab?.id) {
    try {
      // Since chrome.sidePanel.close() doesn't exist, we need a workaround
      // We can try to change the panel state via chrome.sidePanel.setOptions
      chrome.sidePanel.setOptions({
        tabId: tab.id,
        path: 'empty.html', // Use an empty page to simulate closing
        enabled: false
      }).then(() => {
        // After "closing", reset to the original side panel
        chrome.sidePanel.setOptions({
          tabId: tab.id,
          path: 'sidepanel.html',
          enabled: true
        });
        
        // Mark the side panel as closed for this tab
        sidePanelActiveMap.set(tab.id!, false);
        
        // Notify the content script about the side panel visibility change
        sendSidePanelVisibilityMessage(tab.id!, false);
      }).catch((error: Error) => {
        // Error handling silently
      });
    } catch (error) {
      // Still notify about the changed state so UI is consistent
      sidePanelActiveMap.set(tab.id, false);
      sendSidePanelVisibilityMessage(tab.id, false);
    }
  }
}

// Function to toggle reader mode
async function handleToggleReaderMode(tab?: chrome.tabs.Tab) {
  if (!tab?.id) return;
  
  try {
    // Execute a content script to toggle reader mode
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Dispatch custom event to toggle reader mode 
        document.dispatchEvent(new CustomEvent('READLITE_TOGGLE_INTERNAL'));
      }
    });
  } catch (error) {
    // Error handling silently
  }
}

// Set up browser action click handler
chrome.action.onClicked.addListener(async (tab) => {
  // Toggle reader mode when extension icon is clicked
  await handleToggleReaderMode(tab);
});

// Handle tab removal to clean up our state tracking
chrome.tabs.onRemoved.addListener((tabId) => {
  activeTabsMap.delete(tabId);
  sidePanelActiveMap.delete(tabId);
});