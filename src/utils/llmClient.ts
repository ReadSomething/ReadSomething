/**
 * LLM API client for ReadLite sidepanel
 * This client sends requests to the background service worker which then calls the actual LLM API
 */

// Import LLM request options type to maintain consistency with main LLM API
import { LLMRequestOptions } from './llm';

/**
 * Call LLM API via background service worker
 * @param method LLM API method name
 * @param params Parameters array
 * @returns API call result
 */
const callBackgroundLLM = async (method: string, params: any[]): Promise<any> => {
  console.log(`[DEBUG] llmClient: Calling method "${method}" via background service worker`);
  
  return new Promise((resolve, reject) => {
    console.log(`[DEBUG] llmClient: Sending message to background worker`);
    
    chrome.runtime.sendMessage(
      { 
        type: 'LLM_API_REQUEST', 
        data: { method, params } 
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error(`[ERROR] llmClient: Runtime error: ${chrome.runtime.lastError.message}`);
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        if (!response) {
          console.error(`[ERROR] llmClient: No response received from background service worker`);
          reject(new Error('No response received from background service worker'));
          return;
        }
        
        if (!response.success) {
          console.error(`[ERROR] llmClient: API error: ${response.error || 'Unknown error'}`);
          reject(new Error(response.error || 'Unknown API error'));
          return;
        }
        
        console.log(`[DEBUG] llmClient: Received successful response from background worker`);
        resolve(response.data);
      }
    );
  });
};

// Track active stream listeners to prevent memory leaks
const activeStreamListeners = new Map();

/**
 * LLM client API
 * Provides the same methods as the main LLM API, but calls via background service worker
 */
const llmClient = {
  /**
   * Generate text via background service worker
   */
  generateText: async (prompt: string, options: LLMRequestOptions = {}) => {
    console.log(`[DEBUG] llmClient.generateText: Called with prompt: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`);
    try {
      const result = await callBackgroundLLM('generateText', [prompt, options]);
      console.log(`[DEBUG] llmClient.generateText: Received result successfully`);
      return result;
    } catch (error) {
      console.error(`[ERROR] llmClient.generateText: Failed with error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  },
  
  /**
   * Generate text with streaming output
   * This method calls the background service worker to use the streaming API
   * and passes chunks of the response to the provided callback
   */
  generateTextStream: async (prompt: string, onChunk: (chunk: string) => void, options: LLMRequestOptions = {}) => {
    console.log(`[DEBUG] llmClient.generateTextStream: Starting with prompt: "${prompt.substring(0, 30)}..."`);
    
    let fullResponse = '';
    let receivedChunks = 0;
    let streamId = Date.now().toString();
    
    // Create a unique ID for this stream to properly track and remove listeners
    streamId = `stream_${streamId}_${Math.random().toString(36).substring(2, 9)}`;
    console.log(`[DEBUG] llmClient.generateTextStream: Created stream ID: ${streamId}`);
    
    // Use port-based communication for more reliable streaming
    return new Promise((resolve, reject) => {
      try {
        console.log(`[DEBUG] llmClient.generateTextStream: Establishing port connection to background`);
        
        // Connect to the background service worker
        const port = chrome.runtime.connect({ name: `llm_stream_${streamId}` });
        let isPortDisconnected = false;
        
        // Handle port disconnection
        port.onDisconnect.addListener(() => {
          console.log(`[DEBUG] llmClient.generateTextStream: Port disconnected for stream ${streamId}`);
          isPortDisconnected = true;
          
          // If we received chunks but port disconnected prematurely, still return what we have
          if (receivedChunks > 0) {
            console.log(`[DEBUG] llmClient.generateTextStream: Port disconnected but returning ${receivedChunks} chunks received so far`);
            resolve(fullResponse);
          } else {
            reject(new Error("Connection to background service was lost before receiving any response"));
          }
        });
        
        // Listen for messages on the port
        port.onMessage.addListener((message) => {
          if (!message) {
            console.log(`[DEBUG] llmClient.generateTextStream: Received empty message on port`);
            return;
          }
          
          if (message.type === 'LLM_STREAM_CHUNK') {
            if (message.data && typeof message.data.chunk === 'string') {
              const chunk = message.data.chunk;
              receivedChunks++;
              
              // Log chunk receipt (truncated for readability)
              const truncatedChunk = chunk.length > 20 ? chunk.substring(0, 20) + '...' : chunk;
              console.log(`[DEBUG] llmClient.generateTextStream: Received chunk #${receivedChunks} on port: "${truncatedChunk}"`);
              
              // Add to full response
              fullResponse += chunk;
              
              // Pass to callback
              onChunk(chunk);
            }
          } else if (message.type === 'LLM_STREAM_COMPLETE') {
            console.log(`[DEBUG] llmClient.generateTextStream: Stream completed successfully via port, received ${receivedChunks} chunks`);
            port.disconnect();
            resolve(fullResponse);
          } else if (message.type === 'LLM_STREAM_ERROR') {
            console.error(`[ERROR] llmClient.generateTextStream: Error from background: ${message.error}`);
            port.disconnect();
            if (receivedChunks > 0) {
              // If we have a partial response, return it instead of failing completely
              console.log(`[DEBUG] llmClient.generateTextStream: Returning partial response despite error`);
              resolve(fullResponse);
            } else {
              reject(new Error(message.error || "Unknown error in stream processing"));
            }
          }
        });
        
        // Send the request through the port
        console.log(`[DEBUG] llmClient.generateTextStream: Sending stream request via port`);
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
            console.warn(`[WARN] llmClient.generateTextStream: Stream timeout after 30 seconds`);
            port.disconnect();
            
            if (receivedChunks > 0) {
              console.log(`[DEBUG] llmClient.generateTextStream: Returning partial response after timeout`);
              resolve(fullResponse);
            } else {
              reject(new Error("Stream timed out after 30 seconds without receiving any response"));
            }
          }
        }, 30000);
      } catch (error) {
        console.error(`[ERROR] llmClient.generateTextStream: Setup error: ${error instanceof Error ? error.message : String(error)}`);
        reject(error);
      }
    });
  },
  
  /**
   * Summarize text via background service worker
   */
  summarizeText: async (text: string, maxLength: number = 3) => {
    console.log(`[DEBUG] llmClient.summarizeText: Called with text length: ${text.length}, maxLength: ${maxLength}`);
    try {
      const result = await callBackgroundLLM('summarizeText', [text, maxLength]);
      console.log(`[DEBUG] llmClient.summarizeText: Received result successfully`);
      return result;
    } catch (error) {
      console.error(`[ERROR] llmClient.summarizeText: Failed with error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  },
  
  /**
   * Extract key information via background service worker
   */
  extractKeyInfo: async (text: string) => {
    console.log(`[DEBUG] llmClient.extractKeyInfo: Called with text length: ${text.length}`);
    try {
      const result = await callBackgroundLLM('extractKeyInfo', [text]);
      console.log(`[DEBUG] llmClient.extractKeyInfo: Received result successfully`);
      return result;
    } catch (error) {
      console.error(`[ERROR] llmClient.extractKeyInfo: Failed with error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  },
  
  /**
   * Answer questions via background service worker
   */
  answerQuestion: async (question: string, context: string) => {
    console.log(`[DEBUG] llmClient.answerQuestion: Called with question: "${question.substring(0, 50)}${question.length > 50 ? '...' : ''}" and context length: ${context.length}`);
    try {
      const result = await callBackgroundLLM('answerQuestion', [question, context]);
      console.log(`[DEBUG] llmClient.answerQuestion: Received result successfully`);
      return result;
    } catch (error) {
      console.error(`[ERROR] llmClient.answerQuestion: Failed with error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  },

  /**
   * Clean up all active stream listeners
   * Call this when the component unmounts or when streams need to be force-cleaned
   */
  cleanupStreamListeners: () => {
    console.log(`[DEBUG] llmClient.cleanupStreamListeners: Cleaning up ${activeStreamListeners.size} listeners`);
    
    activeStreamListeners.forEach((listener, streamId) => {
      console.log(`[DEBUG] llmClient.cleanupStreamListeners: Removing listener for stream ${streamId}`);
      chrome.runtime.onMessage.removeListener(listener);
    });
    
    activeStreamListeners.clear();
    console.log(`[DEBUG] llmClient.cleanupStreamListeners: All listeners removed`);
  }
};

export default llmClient; 