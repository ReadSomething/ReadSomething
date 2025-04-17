/**
 * Background script for the ReadLite extension
 * Handles icon clicks and executes content script function
 */

// Background service worker for the ReadLite extension
import llmModule from './utils/llm';
import { getAuthToken } from './utils/auth';
import { Model } from './types/api';

// --- Constants ---

// Track which tabs have reader mode active
const activeTabsMap = new Map<number, boolean>();

// Colors for the extension icon (Used by updateIconState)
const ACTIVE_COLOR: [number, number, number, number] = [187, 156, 216, 255]; // #BB9CD8
const INACTIVE_COLOR: [number, number, number, number] = [216, 216, 240, 255]; // #D8D8F0
const BADGE_TEXT_COLOR: [number, number, number, number] = [255, 255, 255, 255]; // White

// --- State ---

// Store available models fetched from the server
let availableModels: Model[] = [];
// Track when models were last fetched (timestamp)
let lastModelsFetchTime = 0;
// Cache expiration time in milliseconds (1 hour)
const MODELS_CACHE_EXPIRY = 60 * 60 * 1000;

// --- Types --- 

// Define specific payload interfaces for messages
interface ToggleReaderModeMessage { type: 'TOGGLE_READER_MODE'; }
interface ContentScriptReadyMessage { type: 'CONTENT_SCRIPT_READY'; }
interface ReaderModeChangedMessage { type: 'READER_MODE_CHANGED'; isActive: boolean; }
interface LlmStreamRequestData {
  prompt: string;
  options: any;
  streamId: string;
}
interface LlmApiRequestData {
  method: string;
  params: any[]; // Keep params flexible for now, but method is required
}
interface LlmStreamRequestMessage { type: 'LLM_STREAM_REQUEST'; data: LlmStreamRequestData; }
interface LlmApiRequestMessage { type: 'LLM_API_REQUEST'; data: LlmApiRequestData; }
interface AuthStatusChangedMessage { 
  type: 'AUTH_STATUS_CHANGED'; 
  isAuthenticated: boolean; 
}
// Message to request the model list
interface GetModelsRequestMessage { 
  type: 'GET_MODELS_REQUEST'; 
  forceRefresh?: boolean;
}

// Union type defining all possible background message types
type BackgroundMessage = 
  ToggleReaderModeMessage | 
  ContentScriptReadyMessage | 
  ReaderModeChangedMessage | 
  LlmApiRequestMessage | 
  LlmStreamRequestMessage |
  AuthStatusChangedMessage |
  GetModelsRequestMessage;

// --- Main Message Listener --- 

/**
 * Handles incoming messages from content scripts and the side panel.
 */
chrome.runtime.onMessage.addListener((message: BackgroundMessage, sender, sendResponse) => {
  const LOG_PREFIX = "[Background:onMessage]";
  
  // Handle LLM API requests specifically
  if (message.type === 'LLM_API_REQUEST') {
    // Type guard ensures message.data exists here
    handleLlmApiRequest(message.data, sender, sendResponse);
    return true; // Indicates response will be sent asynchronously
  }

  // Other messages require a tab ID from the sender
  const tabId = sender.tab?.id;
  if (!tabId) {
    console.warn(`${LOG_PREFIX} Received message type "${message.type}" without sender tab ID. Ignoring.`);
    return false; // No further processing, no async response
  }
   
  // Handle different message types from content scripts
  switch (message.type) {
    case 'CONTENT_SCRIPT_READY':
      handleContentScriptReady(sender, sendResponse);
      return true; // Async response possible
    case 'READER_MODE_CHANGED':
      // Type guard ensures message.isActive exists
      handleReaderModeChanged(message.isActive, tabId, sendResponse);
      return true; // Async response possible
    case 'TOGGLE_READER_MODE':
      handleToggleReaderMode(sender.tab);
      break; // Synchronous or no response needed
    case 'AUTH_STATUS_CHANGED':
      // Type guard ensures message.isAuthenticated exists
      handleAuthStatusChanged(message.isAuthenticated, sendResponse);
      return true; // Async response possible
    case 'GET_MODELS_REQUEST':
      handleGetModelsRequest(message as GetModelsRequestMessage, sendResponse);
      return true; // Async response possible
    default:
      // Optional: Handle unknown message types if necessary
      // console.warn(`${LOG_PREFIX} Received unknown message type:`, message);
      return false;
  }

  // Return true if any path might use sendResponse asynchronously later,
  // otherwise return false or undefined for synchronous handling.
  // The switch cases handle returns, default is false.
  return false; 
});

// --- LLM API Handling ---

/**
 * Routes LLM API requests to the appropriate handler (streaming or regular).
 */
function handleLlmApiRequest(data: LlmApiRequestData, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) {
  const LOG_PREFIX = "[Background:LLM]";
  console.log(`${LOG_PREFIX} Received request for method: "${data.method}"`);
  
  // Use 'as any' for dynamic access, but add type checks
  const moduleToCheck = llmModule as any; 

  if (data.method === 'generateTextStream' && typeof moduleToCheck?.generateTextStream === 'function') {
    // Pass the actual function reference
    handleStreamingRequest(moduleToCheck.generateTextStream, data.params, sender, sendResponse);
  } else if (typeof moduleToCheck?.[data.method] === 'function') {
    // Pass the method name and the function reference
    handleRegularApiRequest(data.method, moduleToCheck[data.method], data.params, sendResponse);
  } else {
    console.error(`${LOG_PREFIX} Method "${data.method}" not found or not a function in LLM module.`);
    sendResponse({ success: false, error: `Method ${data.method} not found in LLM API` });
  }
}

// Track active stream ports
const activeStreamPorts = new Map();

/**
 * Listen for port connections from the client
 * This handles LLM streaming more reliably than one-off messages
 */
chrome.runtime.onConnect.addListener((port) => {
  const LOG_PREFIX = "[Background:Port]";
  const portName = port.name || 'unknown';
  
  // Check if this is an LLM stream port
  if (portName.startsWith('llm_stream_')) {
    const streamId = portName.replace('llm_stream_', '');
    console.log(`${LOG_PREFIX} New stream connection established: ${streamId}`);
    
    // Store the port reference for potential cleanup later
    activeStreamPorts.set(streamId, port);
    
    // Handle disconnect
    port.onDisconnect.addListener(() => {
      console.log(`${LOG_PREFIX} Port disconnected: ${streamId}`);
      activeStreamPorts.delete(streamId);
      
      // Handle cleanup for a disconnected port
      // TODO: Consider canceling any ongoing stream process for this port
    });
    
    // Handle messages from the client
    port.onMessage.addListener((message) => {
      console.log(`${LOG_PREFIX} Received message on port ${streamId}: ${message.type}`);
      
      if (message.type === 'LLM_STREAM_REQUEST') {
        // Handle the streaming request via port
        handlePortStreamingRequest(message.data, port);
      }
    });
  }
});

/**
 * Handle streaming request using port communication
 */
function handlePortStreamingRequest(data: any, port: chrome.runtime.Port) {
  const LOG_PREFIX = "[Background:PortStream]";
  const { prompt, options, streamId } = data;
  console.log(`${LOG_PREFIX} Handling stream request for ${streamId}`);
  
  try {
    const moduleToCheck = llmModule as any;
    if (typeof moduleToCheck?.generateTextStream !== 'function') {
      console.error(`${LOG_PREFIX} generateTextStream method not found`);
      port.postMessage({ type: 'LLM_STREAM_ERROR', error: 'Stream method not available' });
      return;
    }
    
    console.log(`${LOG_PREFIX} Setting up stream for prompt: "${prompt?.substring(0, 30)}..."`);
    
    // Wrap the streamHandler to send chunks via port
    const streamHandler = (chunk: string) => {
      try {
        // Only send if port is still connected
        if (port) {
          port.postMessage({
            type: 'LLM_STREAM_CHUNK',
            data: { chunk },
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error(`${LOG_PREFIX} Error sending chunk via port: ${error instanceof Error ? error.message : String(error)}`);
      }
    };
    
    // Start the streaming process
    console.log(`${LOG_PREFIX} Starting stream process`);
    moduleToCheck.generateTextStream(prompt, streamHandler, options)
      .then(() => {
        console.log(`${LOG_PREFIX} Stream completed successfully`);
        // Send completion message
        if (port) {
          port.postMessage({ type: 'LLM_STREAM_COMPLETE' });
        }
      })
      .catch((error: Error) => {
        console.error(`${LOG_PREFIX} Stream failed: ${error.message}`);
        // Send error message
        if (port) {
          port.postMessage({ 
            type: 'LLM_STREAM_ERROR', 
            error: error.message || 'Unknown streaming error'
          });
        }
      });
      
  } catch (error) {
    console.error(`${LOG_PREFIX} Error in stream setup: ${error instanceof Error ? error.message : String(error)}`);
    port.postMessage({ 
      type: 'LLM_STREAM_ERROR', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Handles streaming LLM API requests.
 * Note: This method is kept for backward compatibility but new code should use port-based streaming
 */
function handleStreamingRequest(
  // Explicitly type the expected function signature
  streamMethod: (prompt: string, streamHandler: (chunk: string) => void, options?: any) => Promise<void>,
  params: any[], 
  sender: chrome.runtime.MessageSender, 
  // Nullable type to indicate if sendResponse has been used (e.g., by timeout)
  sendResponse: ((response?: any) => void) | null 
) {
  const LOG_PREFIX = "[Background:LLM:Stream]";
  let localSendResponse = sendResponse; // Create a local copy to modify

  try {
    const [prompt, options] = params as [string, any];
    console.log(`${LOG_PREFIX} Setting up stream handler for prompt starting with: "${prompt?.substring(0, 30)}..."`);
    
    const streamOptions = { ...options, stream: true };
    
    // Callback to send chunks back to the requesting context
    const streamHandler = (chunk: string) => {
      try {
        // Check if the extension context (chrome.runtime) is still valid before sending
        if (!chrome.runtime?.id) { 
          console.warn(`${LOG_PREFIX} Extension context invalid, cannot send stream chunk.`);
          // TODO: Consider attempting to cancel the ongoing stream if context becomes invalid.
          return; 
        }
        
        // Send chunk back to the runtime (which could be sidepanel or other contexts)
        chrome.runtime.sendMessage({
          type: 'LLM_STREAM_CHUNK',
          data: { chunk },
          timestamp: Date.now() // Keep timestamp for potential ordering checks client-side
        }).catch(error => {
          // Catch errors during sending (e.g., if receiver closes)
          const errorMessage = chrome.runtime.lastError?.message || (error instanceof Error ? error.message : 'Unknown send error');
          console.warn(`${LOG_PREFIX} Runtime error sending chunk: ${errorMessage}`);
          // TODO: Consider recommending port-based streaming when this error happens
          console.log(`${LOG_PREFIX} Consider using port-based streaming for more reliable communication`);
        });
      } catch (error) {
        console.error(`${LOG_PREFIX} Error inside stream handler: ${error instanceof Error ? error.message : String(error)}`);
      }
    };
    
    console.log(`${LOG_PREFIX} Starting streaming process.`);
    let streamCompleted = false;
    
    // Safety timeout: If the stream promise doesn't resolve/reject within 30s,
    // send a failure response. This handles cases where the stream might hang indefinitely.
    const timeoutId = setTimeout(() => {
      if (!streamCompleted) {
        console.warn(`${LOG_PREFIX} Stream safety timeout triggered after 30 seconds.`);
        if (localSendResponse) {
            localSendResponse({ success: false, error: 'Stream timed out after 30 seconds' });
            localSendResponse = null; // Mark response as sent
        } 
      }
    }, 30000);

    streamMethod(prompt, streamHandler, streamOptions)
      .then(() => {
        streamCompleted = true;
        clearTimeout(timeoutId); // Clear the safety timeout
        console.log(`${LOG_PREFIX} Streaming completed successfully.`);
        if (localSendResponse) { // Check if timeout already responded
            localSendResponse({ success: true });
        } else {
            console.log(`${LOG_PREFIX} Stream completed, but response already sent by timeout.`);
        }
      })
      .catch((error: Error) => {
        streamCompleted = true; 
        clearTimeout(timeoutId); // Clear the safety timeout
        console.error(`${LOG_PREFIX} Streaming failed: ${error.message}`);
        console.error(error); // Log the full error object
        if (localSendResponse) { // Check if timeout already responded
            localSendResponse({ success: false, error: error.message });
        } else {
             console.log(`${LOG_PREFIX} Stream failed, but response already sent by timeout.`);
        }
      });

  } catch (error) {
    console.error(`${LOG_PREFIX} Error during stream setup: ${error instanceof Error ? error.message : String(error)}`);
    console.error(error); // Log the full error object
    if (localSendResponse) {
        localSendResponse({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  }
}

/**
 * Handles regular (non-streaming) LLM API requests.
 */
function handleRegularApiRequest(
  method: string,
  // Explicitly type the expected function signature
  apiMethod: (...args: any[]) => Promise<any>,
  params: any[], 
  sendResponse: (response?: any) => void
) {
  const LOG_PREFIX = "[Background:LLM:Regular]";
  console.log(`${LOG_PREFIX} Calling method "${method}"`);
  try {
    apiMethod(...(params || []))
      .then((result: any) => {
        console.log(`${LOG_PREFIX} Call to "${method}" successful.`);
        sendResponse({ success: true, data: result });
      })
      .catch((error: Error) => {
        console.error(`${LOG_PREFIX} Call to "${method}" failed: ${error.message}`);
        console.error(error); // Log the full error object
        sendResponse({ success: false, error: error.message });
      });
  } catch (error) {
    console.error(`${LOG_PREFIX} Error executing method "${method}": ${error instanceof Error ? error.message : String(error)}`);
    console.error(error); // Log the full error object
    sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
}

// --- Content Script & Tab State Handling ---

/**
 * Handles the CONTENT_SCRIPT_READY message.
 */
function handleContentScriptReady(sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) {
  console.log(`[Background] Content script ready in tab: ${sender.tab?.id}`);
  sendResponse({ received: true });
}

/**
 * Handles the READER_MODE_CHANGED message from the content script.
 * Updates the internal state map and the browser action icon.
 */
function handleReaderModeChanged(isActive: boolean, tabId: number, sendResponse: (response?: any) => void) {
  console.log(`[Background] Reader mode changed in tab ${tabId}: ${isActive}`);
  activeTabsMap.set(tabId, isActive);
  updateIconState(tabId, isActive);
  sendResponse({ received: true });
}

/**
 * Updates the browser action icon (badge) for a specific tab based on reader mode state.
 */
function updateIconState(tabId: number, isActive: boolean) {
  const LOG_PREFIX = "[Background:Icon]";
  try {
    const color = isActive ? ACTIVE_COLOR : INACTIVE_COLOR;
    const text = isActive ? "ON" : "";

    chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: color });
    chrome.action.setBadgeTextColor({ tabId: tabId, color: BADGE_TEXT_COLOR });
    chrome.action.setBadgeText({ tabId: tabId, text: text });
    // console.log(`${LOG_PREFIX} Updated icon for tab ${tabId}: ${text}`); // Optional: for debugging
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to update icon for tab ${tabId}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Sends a command to the content script to toggle the reader mode view.
 */
async function handleToggleReaderMode(tab?: chrome.tabs.Tab) {
  const LOG_PREFIX = "[Background:ReaderToggle]";
  if (!tab?.id) {
    console.warn(`${LOG_PREFIX} Attempted to toggle reader mode without valid tab.`);
    return;
  }
  
  console.log(`${LOG_PREFIX} Requesting toggle in tab ${tab.id}`);
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // This custom event is listened for by the content script (content.tsx)
        document.dispatchEvent(new CustomEvent('READLITE_TOGGLE_INTERNAL'));
      }
    });
    console.log(`${LOG_PREFIX} Toggle script executed for tab ${tab.id}.`);
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to execute toggle script for tab ${tab.id}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// --- Browser Event Listeners ---

/**
 * Listens for tab updates (e.g., page loads) to reset the icon state.
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // When a tab finishes loading, reset its icon to default (inactive)
  // The content script will send READER_MODE_CHANGED if it activates reader mode.
  if (changeInfo.status === 'complete') {
    console.log(`[Background] Tab ${tabId} updated (status: complete), resetting icon.`);
    updateIconState(tabId, false);
  }
});

/**
 * Listens for tab removal to clean up the state map.
 */
chrome.tabs.onRemoved.addListener((tabId) => {
  console.log(`[Background] Tab ${tabId} removed, cleaning up state.`);
  if (activeTabsMap.has(tabId)) {
      activeTabsMap.delete(tabId);
  }
});

/**
 * Listens for extension suspension to clean up resources.
 */
chrome.runtime.onSuspend.addListener(() => {
  const LOG_PREFIX = "[Background:Suspend]";
  console.log(`${LOG_PREFIX} Extension is suspending, cleaning up resources.`);
  
  // Clean up any open LLM streams using 'as any' for safety
  const moduleForSuspend = llmModule as any; 
  if (typeof moduleForSuspend?.cancelAllStreams === 'function') {
    try {
      console.log(`${LOG_PREFIX} Attempting to cancel LLM streams.`);
      moduleForSuspend.cancelAllStreams();
    } catch (e) {
      console.error(`${LOG_PREFIX} Failed to cancel LLM streams:`, e);
    }
  } else {
      console.log(`${LOG_PREFIX} cancelAllStreams method not found or not a function.`);
  }
  
  // Clear state map
  console.log(`${LOG_PREFIX} Clearing active tabs map.`);
  activeTabsMap.clear();
});

/**
 * Handles clicks on the browser action (extension icon).
 */
chrome.action.onClicked.addListener(async (tab) => {
  console.log(`[Background] Action icon clicked for tab: ${tab.id}`);
  // Toggle reader mode when extension icon is clicked
  await handleToggleReaderMode(tab);
});

/**
 * Handles authentication status change message.
 * Broadcasts the new status to all tabs.
 */
function handleAuthStatusChanged(isAuthenticated: boolean, sendResponse: (response?: any) => void) {
  console.log(`[Background] Authentication status changed: ${isAuthenticated}`);
  
  // Broadcast to all tabs
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'AUTH_STATUS_CHANGED',
          isAuthenticated
        }).catch(error => {
          // Ignore errors, as some tabs may not have the content script running
          console.debug(`[Background] Failed to send auth status to tab ${tab.id}: ${error instanceof Error ? error.message : String(error)}`);
        });
      }
    }
  });
  
  // Respond to confirm receipt
  sendResponse({ received: true });
}

/**
 * Fetches the list of available models from the API endpoint.
 * Updates the global `availableModels` state.
 */
async function fetchModelsInBackground(): Promise<void> {
  const LOG_PREFIX = "[Background:FetchModels]";
  console.log(`${LOG_PREFIX} Attempting to fetch models...`);
  try {
    const token = await getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch('https://api.readlite.app/api/models', { headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const models = await response.json();

    if (Array.isArray(models) && models.length > 0 && models.every(m => m.value && m.label)) {
      availableModels = models;
      console.log(`${LOG_PREFIX} Successfully fetched and updated models:`, availableModels);
    } else {
      console.warn(`${LOG_PREFIX} Fetched models have unexpected structure or are empty, using defaults.`, models);
      availableModels = []; // Reset to defaults if fetch is invalid
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to fetch models, using defaults:`, error);
    availableModels = []; // Reset to defaults on error
  }
}

/**
 * Handles the GET_MODELS_REQUEST message.
 */
function handleGetModelsRequest(message: GetModelsRequestMessage, sendResponse: (response?: any) => void) {
  const LOG_PREFIX = "[Background:GetModels]";
  console.log(`${LOG_PREFIX} Received GET_MODELS_REQUEST`);
  
  const forceRefresh = message.forceRefresh === true;
  const isExpired = Date.now() - lastModelsFetchTime > MODELS_CACHE_EXPIRY;
  
  // Fetch new data if:
  // 1. Force refresh requested, OR
  // 2. Cache is empty/not loaded, OR
  // 3. Cache has expired
  if (forceRefresh || !availableModels || availableModels.length === 0 || isExpired) {
    const reason = forceRefresh ? "force refresh requested" : 
                  (!availableModels || availableModels.length === 0) ? "cache empty" : 
                  "cache expired";
    console.log(`${LOG_PREFIX} Fetching from server (reason: ${reason})`);
    
    fetchModelsInBackground()
      .then(() => {
        lastModelsFetchTime = Date.now(); // Update the timestamp
        sendResponse({ success: true, data: availableModels, fromCache: false });
      })
      .catch((error) => {
        console.error(`${LOG_PREFIX} Error fetching models:`, error);
        // If we have cached data, return it even on fetch error
        if (availableModels && availableModels.length > 0) {
          console.log(`${LOG_PREFIX} Returning cached data despite fetch error`);
          sendResponse({ 
            success: true, 
            data: availableModels, 
            fromCache: true,
            fetchError: error instanceof Error ? error.message : String(error)
          });
        } else {
          sendResponse({ 
            success: false, 
            error: error instanceof Error ? error.message : String(error), 
            data: [] 
          });
        }
      });
  } else {
    // Return cached models
    console.log(`${LOG_PREFIX} Returning cached models (${availableModels.length} items)`);
    sendResponse({ success: true, data: availableModels, fromCache: true });
  }
}
