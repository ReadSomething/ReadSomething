/**
 * LLM API client for ReadLite sidepanel
 * This client sends requests to the background service worker which then calls the actual LLM API
 */

// Import LLM request options type to maintain consistency with main LLM API
import { LLMRequestOptions } from './llm';
import { getAuthToken } from './auth';

import { createLogger } from "~/utils/logger";

// Create a logger for this module
const logger = createLogger('utils');


// New API endpoint 
const OPENROUTER_API_ENDPOINT = 'https://api.readlite.app/api/openrouter/chat/completions';

/**
 * Call LLM API via background service worker
 * @param method LLM API method name
 * @param params Parameters array
 * @returns API call result
 */
const callBackgroundLLM = async (method: string, params: any[]): Promise<any> => {
  logger.info(`[DEBUG] llmClient: Calling method "${method}" via background service worker`);
  
  return new Promise((resolve, reject) => {
    logger.info(`[DEBUG] llmClient: Sending message to background worker`);
    
    chrome.runtime.sendMessage(
      { 
        type: 'LLM_API_REQUEST', 
        data: { method, params } 
      },
      (response) => {
        if (chrome.runtime.lastError) {
          logger.error(`[ERROR] llmClient: Runtime error: ${chrome.runtime.lastError.message}`);
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        if (!response) {
          logger.error(`[ERROR] llmClient: No response received from background service worker`);
          reject(new Error('No response received from background service worker'));
          return;
        }
        
        if (!response.success) {
          logger.error(`[ERROR] llmClient: API error: ${response.error || 'Unknown error'}`);
          reject(new Error(response.error || 'Unknown API error'));
          return;
        }
        
        logger.info(`[DEBUG] llmClient: Received successful response from background worker`);
        resolve(response.data);
      }
    );
  });
};

// Track active stream listeners to prevent memory leaks
const activeStreamListeners = new Map();

/**
 * Direct API call to the LLM service
 * @param messages Chat messages to send
 * @param options API options
 * @returns Promise with API response
 */
export async function directApiCall(messages: any[], options: any): Promise<Response> {
  // Get auth token
  const token = await getAuthToken();
  
  // Prepare headers with authentication if available
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Add auth token if available
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Prepare request body
  const requestBody = {
    model: options.model,
    max_tokens: options.maxTokens,
    temperature: options.temperature,
    messages: messages,
    stream: !!options.stream
  };
  
  // Make the API call
  return fetch(OPENROUTER_API_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody)
  });
}

/**
 * LLM client API
 * Provides the same methods as the main LLM API, but calls via background service worker
 */
const llmClient = {
  /**
   * Generate text via background service worker
   */
  generateText: async (prompt: string, options: LLMRequestOptions = {}) => {
    logger.info(`[DEBUG] llmClient.generateText: Called with prompt: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`);
    try {
      const result = await callBackgroundLLM('generateText', [prompt, options]);
      logger.info(`[DEBUG] llmClient.generateText: Received result successfully`);
      return result;
    } catch (error) {
      logger.error(`[ERROR] llmClient.generateText: Failed with error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  },
  
  /**
   * Generate text with streaming output
   * This method calls the background service worker to use the streaming API
   * and passes chunks of the response to the provided callback
   */
  generateTextStream: async (prompt: string, onChunk: (chunk: string) => void, options: LLMRequestOptions = {}) => {
    logger.info(`[DEBUG] llmClient.generateTextStream: Starting with prompt: "${prompt.substring(0, 30)}..."`);
    
    let fullResponse = '';
    let receivedChunks = 0;
    let streamId = Date.now().toString();
    
    // Create a unique ID for this stream to properly track and remove listeners
    streamId = `stream_${streamId}_${Math.random().toString(36).substring(2, 9)}`;
    logger.info(`[DEBUG] llmClient.generateTextStream: Created stream ID: ${streamId}`);
    
    // Use port-based communication for more reliable streaming
    return new Promise((resolve, reject) => {
      try {
        // Create a communication port
        const port = chrome.runtime.connect({ name: `llm_stream_${streamId}` });
        let isPortDisconnected = false;
        
        // Set up disconnect event
        port.onDisconnect.addListener(() => {
          logger.info(`[DEBUG] llmClient.generateTextStream: Port disconnected`);
          isPortDisconnected = true;
          
          // Register this port/callback for cleanup
          activeStreamListeners.set(streamId, {
            port,
            onChunk
          });
        });
        
        // Listen for messages on the port
        port.onMessage.addListener((message) => {
          if (!message) {
            logger.info(`[DEBUG] llmClient.generateTextStream: Received empty message on port`);
            return;
          }
          
          if (message.type === 'LLM_STREAM_CHUNK') {
            if (message.data && typeof message.data.chunk === 'string') {
              const chunk = message.data.chunk;
              receivedChunks++;
              
              // Log chunk receipt (truncated for readability)
              const truncatedChunk = chunk.length > 20 ? chunk.substring(0, 20) + '...' : chunk;
              logger.info(`[DEBUG] llmClient.generateTextStream: Received chunk #${receivedChunks} on port: "${truncatedChunk}"`);
              
              // Add to full response
              fullResponse += chunk;
              
              // Pass to callback
              onChunk(chunk);
            }
          } else if (message.type === 'LLM_STREAM_COMPLETE') {
            logger.info(`[DEBUG] llmClient.generateTextStream: Stream completed successfully via port, received ${receivedChunks} chunks`);
            port.disconnect();
            resolve(fullResponse);
          } else if (message.type === 'LLM_STREAM_ERROR') {
            logger.error(`[ERROR] llmClient.generateTextStream: Error from background: ${message.error}`);
            port.disconnect();
            if (receivedChunks > 0) {
              // If we have a partial response, return it instead of failing completely
              logger.info(`[DEBUG] llmClient.generateTextStream: Returning partial response despite error`);
              resolve(fullResponse);
            } else {
              reject(new Error(message.error || "Unknown error in stream processing"));
            }
          }
        });
        
        // Send the request through the port
        logger.info(`[DEBUG] llmClient.generateTextStream: Sending stream request via port`);
        port.postMessage({ 
          type: 'LLM_STREAM_REQUEST',
          data: {
            prompt,
            options,
            streamId
          }
        });
        
        // Set a safety timeout in case the background never responds
        const timeoutId = setTimeout(() => {
          if (!isPortDisconnected) {
            logger.warn(`[WARN] llmClient.generateTextStream: Stream timeout after 30 seconds`);
            port.disconnect();
            
            if (receivedChunks > 0) {
              logger.info(`[DEBUG] llmClient.generateTextStream: Returning partial response after timeout`);
              resolve(fullResponse);
            } else {
              reject(new Error("Stream timed out after 30 seconds without receiving any response"));
            }
          }
        }, 30000);
      } catch (error) {
        logger.error(`[ERROR] llmClient.generateTextStream: Setup error: ${error instanceof Error ? error.message : String(error)}`);
        reject(error);
      }
    });
  },
  
  /**
   * Summarize text via background service worker
   */
  summarizeText: async (text: string, maxLength: number = 3) => {
    logger.info(`[DEBUG] llmClient.summarizeText: Called with text length: ${text.length}, maxLength: ${maxLength}`);
    try {
      const result = await callBackgroundLLM('summarizeText', [text, maxLength]);
      logger.info(`[DEBUG] llmClient.summarizeText: Received result successfully`);
      return result;
    } catch (error) {
      logger.error(`[ERROR] llmClient.summarizeText: Failed with error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  },
  
  /**
   * Extract key information from text via background service worker
   */
  extractKeyInfo: async (text: string, question: string) => {
    logger.info(`[DEBUG] llmClient.extractKeyInfo: Called with text length: ${text.length}`);
    try {
      const result = await callBackgroundLLM('extractKeyInfo', [text, question]);
      logger.info(`[DEBUG] llmClient.extractKeyInfo: Received result successfully`);
      return result;
    } catch (error) {
      logger.error(`[ERROR] llmClient.extractKeyInfo: Failed with error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  },
  
  /**
   * Answer specific question about text
   */
  answerQuestion: async (text: string, question: string) => {
    logger.info(`[DEBUG] llmClient.answerQuestion: Called with question: "${question}"`);
    try {
      const result = await callBackgroundLLM('answerQuestion', [text, question]);
      logger.info(`[DEBUG] llmClient.answerQuestion: Received result successfully`);
      return result;
    } catch (error) {
      logger.error(`[ERROR] llmClient.answerQuestion: Failed with error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  },
  
  /**
   * Clean up stream listeners to prevent memory leaks
   * Important to call when component unmounts
   */
  cleanupStreamListeners: () => {
    logger.info(`[DEBUG] llmClient.cleanupStreamListeners: Cleaning up ${activeStreamListeners.size} listeners`);
    activeStreamListeners.forEach((listener, id) => {
      try {
        if (listener.port) {
          listener.port.disconnect();
        }
      } catch (e) {
        // Ignore errors during cleanup
      }
    });
    activeStreamListeners.clear();
  }
};

export default llmClient; 