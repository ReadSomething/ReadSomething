/**
 * Authentication utilities for ReadLite
 * Handles token management, authentication status, and login functionality
 */

// Token storage keys
const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_TIMESTAMP_KEY = 'auth_timestamp';
const TOKEN_EXPIRY_DAYS = 30; // Token expires after 30 days

/**
 * Check if user is authenticated with a valid token
 * @returns Promise resolving to authentication status
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const token = await getAuthToken();
    const timestamp = await getAuthTimestamp();
    
    // If no token, not authenticated
    if (!token) return false;
    
    // Check if token has expired
    if (timestamp) {
      const expiryTime = timestamp + (TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      if (Date.now() > expiryTime) {
        // Token expired, clear it
        await clearAuthData();
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error("[Auth] Error checking authentication status:", error);
    return false;
  }
}

/**
 * Get the stored authentication token
 * @returns Promise resolving to the token or null if not available
 */
export async function getAuthToken(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get([AUTH_TOKEN_KEY], (result) => {
      resolve(result[AUTH_TOKEN_KEY] || null);
    });
  });
}

/**
 * Get the timestamp when the token was stored
 * @returns Promise resolving to the timestamp or null if not available
 */
export async function getAuthTimestamp(): Promise<number | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get([AUTH_TIMESTAMP_KEY], (result) => {
      resolve(result[AUTH_TIMESTAMP_KEY] || null);
    });
  });
}

/**
 * Clear all authentication data
 * @returns Promise resolving when data is cleared
 */
export async function clearAuthData(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove([AUTH_TOKEN_KEY, AUTH_TIMESTAMP_KEY], () => {
      resolve();
    });
  });
}

/**
 * Open the authentication page in a new tab
 * Uses the browser's language to determine which locale to use
 */
export function openAuthPage(): void {
  // Determine correct locale
  const locale = determineUserLocale();
  
  // Use window.open which is available in content scripts
  window.open(`https://readlite.app/${locale}/auth/sync`, '_blank');
}

/**
 * Get user's locale based on browser language
 * @returns 'zh' for Chinese users, 'en' for everyone else
 */
function determineUserLocale(): string {
  try {
    // Try using chrome.i18n API if available
    if (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getUILanguage) {
      const browserLang = chrome.i18n.getUILanguage();
      return browserLang.startsWith('zh') ? 'zh' : 'en';
    } 
    // Fallback to navigator.language which is available in content scripts
    else {
      const browserLang = navigator.language || navigator.languages?.[0] || 'en';
      return browserLang.startsWith('zh') ? 'zh' : 'en';
    }
  } catch (error) {
    console.error("[Auth] Error determining user locale:", error);
    return 'en'; // Default to English on error
  }
}

/**
 * Set up listener for auth messages from the web app
 * Should be called once during extension initialization
 */
export function setupAuthListener(): void {
  // Check if we're in a content script context
  if (typeof window !== 'undefined') {
    window.addEventListener('message', function(event) {
      // Security check for message origin
      if (event.origin !== 'https://readlite.app') return;
      
      // Process auth token message
      if (event.data && event.data.type === 'READLITE_AUTH_TOKEN') {
        const token = event.data.token;
        
        // Save token to extension storage
        chrome.storage.local.set({
          [AUTH_TOKEN_KEY]: token,
          [AUTH_TIMESTAMP_KEY]: Date.now()
        }, function() {
          console.log('[Auth] Token saved to extension storage');
          
          // Send confirmation message back to web app
          window.postMessage({
            type: 'READLITE_AUTH_TOKEN_RECEIVED',
            success: true
          }, '*');
          
          // Notify background script about auth status change
          chrome.runtime.sendMessage({
            type: 'AUTH_STATUS_CHANGED',
            isAuthenticated: true
          });
        });
      }
    });
  }
} 