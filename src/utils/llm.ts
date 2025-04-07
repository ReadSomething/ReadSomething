/**
 * LLM API integration utility for ReadLite
 * Provides direct fetch implementation to interact with Portkey gateway.
 */

import { DEFAULT_MODEL } from '../config/model';

// --- Constants & Configuration ---

const LOG_PREFIX = "[LLMUtil]";

// LLM configuration - **CRITICAL: API keys should ONLY come from environment variables.**
const API_KEY = process.env.PORTKEY_API_KEY || 'Q7BUafUi1FOvFI5YanSmMcQWxUav';
const VIRTUAL_KEY = process.env.PORTKEY_VIRTUAL_KEY || 'anthropic-virtu-05b58f';

const API_ENDPOINT = 'https://api.portkey.ai/v1/chat/completions';
const DEFAULT_MAX_TOKENS = 256;
const API_TIMEOUT_MS = 120000; // 120 seconds

const IS_API_CONFIGURED = !!API_KEY && !!VIRTUAL_KEY;

if (!IS_API_CONFIGURED) {
  console.warn(`${LOG_PREFIX} Portkey API Key or Virtual Key is missing. LLM features will use fallback implementation.`);
}

// --- Types ---

/** Interface for LLM request options */
export interface LLMRequestOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  stream?: boolean;
  // Portkey specific options (if used directly)
  thinking?: {
    type: string;
    budget_tokens: number;
  };
}

// Standard chat message format (similar to OpenAI)
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// --- Fallback Implementation ---

/** Creates a fallback implementation that simulates LLM responses when API keys are missing. */
const createFallbackImplementation = () => {
  console.info(`${LOG_PREFIX} Creating fallback LLM implementation.`);
  const FALLBACK_DELAY = 500; // ms
  const streamChunkDelay = 50; // ms

  return {
    generateText: async (prompt: string, options?: LLMRequestOptions): Promise<string> => {
      console.warn(`${LOG_PREFIX} Using fallback: generateText`);
      await new Promise(resolve => setTimeout(resolve, FALLBACK_DELAY));
      return "[Fallback] LLM API not configured. This is simulated text.";
    },
    
    generateTextStream: async (prompt: string, onChunk: (chunk: string) => void, options?: LLMRequestOptions): Promise<void> => {
      console.warn(`${LOG_PREFIX} Using fallback: generateTextStream`);
      const fallbackResponse = "[Fallback] Simulated stream. LLM API not configured.";
      const words = fallbackResponse.split(' ');
      for (const word of words) {
        await new Promise(resolve => setTimeout(resolve, streamChunkDelay));
        onChunk(word + ' ');
      }
      // Ensure stream completion is signaled if necessary by the caller
    },
    
    summarizeText: async (text: string, maxLength?: number): Promise<string> => {
      console.warn(`${LOG_PREFIX} Using fallback: summarizeText`);
      await new Promise(resolve => setTimeout(resolve, FALLBACK_DELAY));
      return `[Fallback] Simulated summary of ${maxLength || 3} sentences. LLM API not configured.`;
    },
    
    extractKeyInfo: async (text: string): Promise<string> => {
      console.warn(`${LOG_PREFIX} Using fallback: extractKeyInfo`);
      await new Promise(resolve => setTimeout(resolve, FALLBACK_DELAY));
      return "* [Fallback] Simulated key point 1\n* [Fallback] Simulated key point 2\n* LLM API not configured.";
    },
    
    answerQuestion: async (question: string, context: string): Promise<string> => {
      console.warn(`${LOG_PREFIX} Using fallback: answerQuestion`);
      await new Promise(resolve => setTimeout(resolve, FALLBACK_DELAY));
      return `[Fallback] Cannot answer "${question.substring(0,30)}..." - LLM API not configured.`;
    },

    // Add processStream as a no-op or minimal implementation if it might be called directly
    processStream: async (streamResponse: Response, onChunk: (chunk: string) => void): Promise<void> => {
      console.warn(`${LOG_PREFIX} Using fallback: processStream (no-op)`);
      // Fallback doesn't produce real streams, so this does nothing.
      return Promise.resolve();
    }
  };
};

// --- Core API Interaction (Direct Fetch) ---

/**
 * Direct fetch implementation for Portkey Chat Completions API.
 * Necessary for Service Worker compatibility where some libraries might fail.
 */
async function callLLMAPI(
  messages: ChatMessage[], 
  options: {
    model: string;
    maxTokens: number;
    temperature: number;
    stream?: boolean;
  }
): Promise<any> { // Returns Response for stream, JSON object otherwise
  const FN_LOG_PREFIX = `${LOG_PREFIX}:callLLMAPI`;
  
  if (!IS_API_CONFIGURED) {
    // Should ideally not be called if fallback is active, but acts as a safeguard
    console.error(`${FN_LOG_PREFIX} Attempted to call API without configuration.`);
    throw new Error("LLM API is not configured. Check API_KEY and VIRTUAL_KEY.");
  }

  console.debug(`${FN_LOG_PREFIX} Calling API with model: ${options.model}, stream: ${!!options.stream}`);
  
  const requestBody = {
    model: options.model,
    max_tokens: options.maxTokens,
    temperature: options.temperature,
    messages: messages,
    stream: !!options.stream // Ensure boolean
  };
  
  try {
    const headers = {
      'Content-Type': 'application/json',
      'x-portkey-api-key': API_KEY!,
      'x-portkey-virtual-key': VIRTUAL_KEY!
    };
    
    console.debug(`${FN_LOG_PREFIX} Requesting ${API_ENDPOINT}`);
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });
    
    console.debug(`${FN_LOG_PREFIX} Response status: ${response.status}`);
    
    if (!response.ok) {
      let errorBody = 'Unknown error';
      try {
          errorBody = await response.text();
      } catch (e) { /* Ignore if reading body fails */ }
      console.error(`${FN_LOG_PREFIX} API request failed: ${response.status} ${response.statusText}. Body: ${errorBody}`);
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    // Return the raw Response for streaming, caller must handle body
    if (options.stream) {
      console.debug(`${FN_LOG_PREFIX} Returning raw Response object for stream.`);
      return response;
    }
    
    // Parse and return JSON for non-streaming requests
    const responseData = await response.json();
    console.debug(`${FN_LOG_PREFIX} API call successful (non-stream).`);
    return responseData;

  } catch (error) {
    console.error(`${FN_LOG_PREFIX} Network or fetch error:`, error);
    // Re-throw original error or a new standardized error
    throw error instanceof Error ? error : new Error('LLM API request failed.');
  }
}

// --- Stream Processing --- 

/**
 * Processes a streaming Fetch Response body.
 * Handles Server-Sent Events (SSE) with JSON data.
 * Expects data chunks in OpenAI or Anthropic/Portkey format.
 * 
 * @param streamResponse The raw Response object from a fetch call.
 * @param onChunk Callback function invoked with each extracted text chunk.
 */
async function processStreamInternal(
  streamResponse: Response,
  onChunk: (chunk: string) => void
): Promise<void> { 
  const FN_LOG_PREFIX = `${LOG_PREFIX}:processStream`;

  if (!streamResponse.body) {
    console.error(`${FN_LOG_PREFIX} Response body is null or undefined.`);
    throw new Error('Cannot process stream: Response body is missing.');
  }

  const reader = streamResponse.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  console.debug(`${FN_LOG_PREFIX} Starting stream processing...`);
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.debug(`${FN_LOG_PREFIX} Stream finished.`);
        break;
      }
      
      buffer += decoder.decode(value, { stream: true });
      let endOfLineIndex;

      // Process buffer line by line (SSE format uses \n\n or \r\n\r\n)
      // More robustly handles different line endings
      while ((endOfLineIndex = buffer.indexOf('\n')) >= 0) {
        const line = buffer.substring(0, endOfLineIndex).trim();
        buffer = buffer.substring(endOfLineIndex + 1);

        if (line.startsWith('data:')) {
          const jsonData = line.substring(5).trim();
          if (jsonData === '[DONE]') {
            console.debug(`${FN_LOG_PREFIX} Received [DONE] signal.`);
            continue; // OpenAI DONE signal
          }
          if (jsonData.startsWith('{')) {
            try {
              const json = JSON.parse(jsonData);
              let text = '';
              // Standard OpenAI/Portkey format
              if (json.choices && json.choices[0]?.delta?.content) {
                text = json.choices[0].delta.content;
              } 
              // Anthropic format (via Portkey potentially)
              else if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta') {
                 text = json.delta.text;
              } 
              // Fallback for potential non-delta messages in stream?
              else if (json.choices && json.choices[0]?.message?.content) {
                 text = json.choices[0].message.content; 
                 console.warn(`${FN_LOG_PREFIX} Received full message content in stream, not delta.`);
              }

              if (text) {
                onChunk(text);
              }
            } catch (e) {
              console.error(`${FN_LOG_PREFIX} Error parsing JSON data line: "${jsonData}"`, e);
            }
          }
        } else if (line.startsWith('{')) { 
           // Handle plain JSON lines (if Portkey sends them outside 'data:')
           try {
             const json = JSON.parse(line);
             // Check similar locations as above
             let text = json.choices?.[0]?.delta?.content || json.choices?.[0]?.message?.content || '';
             if (text) {
               onChunk(text);
             }
           } catch (e) {
             console.error(`${FN_LOG_PREFIX} Error parsing plain JSON line: "${line}"`, e);
           }
        }
      }
    }

    // Process any remaining data in buffer (should be empty in SSE)
    if (buffer.trim()) {
      console.warn(`${FN_LOG_PREFIX} Unexpected data remaining in buffer after stream end: "${buffer}"`);
    }

  } catch (error) {
    console.error(`${FN_LOG_PREFIX} Error reading stream:`, error);
    throw error instanceof Error ? error : new Error('Stream processing failed.');
  } finally {
      console.debug(`${FN_LOG_PREFIX} Stream processing finished.`);
      // Ensure reader cancellation/release if necessary, though exiting the loop should suffice
  }
}

// --- Public API Functions --- 

/**
 * Generates text using the LLM. Handles non-streaming requests.
 * @param prompt The user's prompt.
 * @param options Configuration options for the LLM request.
 * @returns A Promise resolving to the generated text string.
 */
async function generateTextInternal(prompt: string, options: LLMRequestOptions = {}): Promise<string> {
  const FN_LOG_PREFIX = `${LOG_PREFIX}:generateText`;
  console.debug(`${FN_LOG_PREFIX} Request: "${prompt.substring(0, 50)}..."`, options);
  
  try {
    const messages: ChatMessage[] = [];
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const model = options.model || DEFAULT_MODEL;
    const maxTokens = options.maxTokens || DEFAULT_MAX_TOKENS;
    const temperature = options.temperature ?? 0.7;

    // Use a timeout promise
    let timeoutId: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        console.error(`${FN_LOG_PREFIX} API request timed out after ${API_TIMEOUT_MS}ms`);
        reject(new Error(`LLM API request timed out after ${API_TIMEOUT_MS / 1000} seconds`));
      }, API_TIMEOUT_MS);
    });

    // Make the direct API call (non-streaming)
    console.debug(`${FN_LOG_PREFIX} Calling callLLMAPI (non-stream)`);
    const apiCallPromise = callLLMAPI(messages, { model, maxTokens, temperature, stream: false });

    const response = await Promise.race([apiCallPromise, timeoutPromise]) as any; // Result is JSON object
    if (timeoutId) clearTimeout(timeoutId);
    
    const content = response?.choices?.[0]?.message?.content || '';
    console.debug(`${FN_LOG_PREFIX} Success. Response text: "${content.substring(0, 50)}..."`);
    return content;

  } catch (error: unknown) {
    console.error(`${FN_LOG_PREFIX} Failed:`, error);
    throw error instanceof Error ? error : new Error('Failed to generate text.');
  }
}

/**
 * Generates text with streaming response.
 * @param prompt The user's prompt.
 * @param onChunk Callback invoked for each received text chunk.
 * @param options Configuration options for the LLM request.
 * @returns A Promise that resolves when the stream is complete, or rejects on error.
 */
async function generateTextStreamInternal(
  prompt: string,
  onChunk: (chunk: string) => void,
  options: LLMRequestOptions = {}
): Promise<void> {
  const FN_LOG_PREFIX = `${LOG_PREFIX}:generateTextStream`;
  console.debug(`${FN_LOG_PREFIX} Request: "${prompt.substring(0, 50)}..."`, options);

  try {
    const messages: ChatMessage[] = [];
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const model = options.model || DEFAULT_MODEL;
    const maxTokens = options.maxTokens || DEFAULT_MAX_TOKENS;
    const temperature = options.temperature ?? 0.7;
    
    // Use a timeout promise (applies to establishing the connection and starting the stream)
    let timeoutId: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<Response>((_, reject) => { // Type changed
      timeoutId = setTimeout(() => {
        console.error(`${FN_LOG_PREFIX} API stream request timed out after ${API_TIMEOUT_MS}ms`);
        reject(new Error(`LLM API stream request timed out after ${API_TIMEOUT_MS / 1000} seconds`));
      }, API_TIMEOUT_MS);
    });

    console.debug(`${FN_LOG_PREFIX} Calling callLLMAPI (stream)`);
    const apiCallPromise = callLLMAPI(messages, { model, maxTokens, temperature, stream: true });
    
    // Race for the initial Response object
    const streamResponse = await Promise.race([apiCallPromise, timeoutPromise]) as Response;
    if (timeoutId) clearTimeout(timeoutId); // Clear timeout once we have the Response

    console.debug(`${FN_LOG_PREFIX} Received stream Response object. Starting processing...`);
    // Process the stream body
    await processStreamInternal(streamResponse, onChunk);
    console.debug(`${FN_LOG_PREFIX} Stream processing finished.`);

  } catch (error) {
    console.error(`${FN_LOG_PREFIX} Failed:`, error);
    throw error instanceof Error ? error : new Error('Failed to generate text stream.');
  }
}

/** Summarizes text using the LLM. */
async function summarizeTextInternal(text: string, maxLength: number = 3): Promise<string> {
  const systemPrompt = `Summarize the following text concisely in ${maxLength} sentences or fewer, focusing on the key points. Output only the summary.`;
  return generateTextInternal(text, { systemPrompt, maxTokens: 150, temperature: 0.3 });
}

/** Extracts key information (facts, entities) from text using the LLM. */
async function extractKeyInfoInternal(text: string): Promise<string> {
  const systemPrompt = `Extract the most important facts, entities, names, dates, and concepts from the text. Format as a bulleted list. Output only the list.`;
  return generateTextInternal(text, { systemPrompt, maxTokens: 200, temperature: 0.2 });
}

/** Answers a question based *only* on the provided context using the LLM. */
async function answerQuestionInternal(question: string, context: string): Promise<string> {
  const systemPrompt = `Answer the following question based *only* on the provided context. If the answer is not found in the context, state that clearly. Context: """${context}"""`;
  return generateTextInternal(question, { systemPrompt, maxTokens: 200, temperature: 0.4 });
}

// --- Exported Module --- 

// Determine which implementation to export based on API key configuration
const llmImplementation = IS_API_CONFIGURED 
  ? {
      generateText: generateTextInternal,
      generateTextStream: generateTextStreamInternal,
      processStream: processStreamInternal, // Export internal stream processor if needed externally
      summarizeText: summarizeTextInternal,
      extractKeyInfo: extractKeyInfoInternal,
      answerQuestion: answerQuestionInternal,
    }
  : createFallbackImplementation();

// Export the chosen implementation
export default llmImplementation; 