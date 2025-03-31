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
    
    // Set up a message listener for stream chunks
    const messageListener = (message: any) => {
      try {
        if (!message) {
          console.log(`[DEBUG] llmClient.generateTextStream: Received empty message`);
          return;
        }
        
        console.log(`[DEBUG] llmClient.generateTextStream: Received message type: ${message.type}`);
        
        if (message.type === 'LLM_STREAM_CHUNK') {
          if (message.data && typeof message.data.chunk === 'string') {
            const chunk = message.data.chunk;
            receivedChunks++;
            
            // Log chunk receipt (truncated for readability)
            const truncatedChunk = chunk.length > 20 ? chunk.substring(0, 20) + '...' : chunk;
            console.log(`[DEBUG] llmClient.generateTextStream: Received chunk #${receivedChunks}: "${truncatedChunk}"`);
            
            // Add to full response
            fullResponse += chunk;
            
            // Pass to callback
            onChunk(chunk);
          } else {
            console.warn(`[WARN] llmClient.generateTextStream: Received message with invalid chunk data:`, 
              typeof message.data === 'object' ? JSON.stringify(message.data).substring(0, 100) : message.data);
          }
        }
      } catch (error) {
        console.error(`[ERROR] llmClient.generateTextStream: Error in message listener: ${error instanceof Error ? error.message : String(error)}`);
        console.error(error);
      }
    };
    
    // Register listener
    console.log(`[DEBUG] llmClient.generateTextStream: Adding message listener`);
    chrome.runtime.onMessage.addListener(messageListener);
    
    try {
      console.log(`[DEBUG] llmClient.generateTextStream: Sending streaming API request`);
      // Start the streaming process
      await callBackgroundLLM('generateTextStream', [prompt, options]);
      console.log(`[DEBUG] llmClient.generateTextStream: Stream completed successfully, received ${receivedChunks} chunks`);
      
      if (receivedChunks === 0) {
        console.warn(`[WARN] llmClient.generateTextStream: No chunks were received during streaming`);
      } else {
        console.log(`[DEBUG] llmClient.generateTextStream: Full response length: ${fullResponse.length} characters`);
      }
      
      return fullResponse; // Return the concatenated response
    } catch (error) {
      console.error(`[ERROR] llmClient.generateTextStream: Failed with error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    } finally {
      // Clean up the listener when done
      console.log(`[DEBUG] llmClient.generateTextStream: Removing message listener`);
      chrome.runtime.onMessage.removeListener(messageListener);
    }
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
  }
};

export default llmClient; 