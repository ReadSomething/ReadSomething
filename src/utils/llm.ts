/**
 * LLM API integration utility for ReadLite
 * Provides direct fetch implementation to interact with OpenRouter via ReadLite API.
 */

import { getAuthToken } from './auth';

import { createLogger } from "./logger";

// Create a logger for this module
const logger = createLogger('llm');

// --- Constants & Configuration ---

// Updated API endpoint
const API_ENDPOINT = 'https://api.readlite.app/api/openrouter/chat/completions';
const DEFAULT_MAX_TOKENS = 10000;
const API_TIMEOUT_MS = 120000; // 120 seconds
// Default model ID to use as fallback when none specified
const FALLBACK_MODEL_ID = 'deepseek/deepseek-chat-v3-0324:free';

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

/** Interface for chat messages */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// --- Core API Interaction (Direct Fetch) ---

/**
 * Direct fetch implementation for OpenRouter Chat Completions API.
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
  logger.debug(`Calling API with model: ${options.model}, stream: ${!!options.stream}`);
  
  const requestBody = {
    model: options.model,
    max_tokens: options.maxTokens,
    temperature: options.temperature,
    messages: messages,
    stream: !!options.stream // Ensure boolean
  };
  
  try {
    // Get auth token
    const token = await getAuthToken();
    
    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Add auth token if available
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    logger.debug(`Requesting ${API_ENDPOINT}`);
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });
    
    logger.debug(`Response status: ${response.status}`);
    
    if (!response.ok) {
      let errorBody = 'Unknown error';
      try {
          errorBody = await response.text();
      } catch (e) { /* Ignore if reading body fails */ }
      logger.error(`API request failed: ${response.status} ${response.statusText}. Body: ${errorBody}`);
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    // Return the raw Response for streaming, caller must handle body
    if (options.stream) {
      logger.debug(`Returning raw Response object for stream.`);
      return response;
    }
    
    // Parse and return JSON for non-streaming requests
    const responseData = await response.json();
    logger.debug(`API call successful (non-stream).`);
    return responseData;

  } catch (error) {
    logger.error(`Network or fetch error:`, error);
    // Re-throw original error or a new standardized error
    throw error instanceof Error ? error : new Error('LLM API request failed.');
  }
}

// --- Stream Handling --- 

/**
 * Process a stream response from the LLM API.
 * @param streamResponse The Response object from fetch with a readable stream.
 * @param onChunk Callback function to handle each chunk of text as it arrives.
 * @returns Promise resolving to the complete concatenated response.
 */
async function processStreamInternal(streamResponse: Response, onChunk: (text: string) => void): Promise<string> {
  if (!streamResponse.body) {
    throw new Error('No readable stream in the response');
  }

  const reader = streamResponse.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let completeResponse = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      
      if (done) {
        break;
      }
      
      // Decode the chunk
      const chunk = decoder.decode(value, { stream: true });
      
      // Process the chunk
      const dataLines = chunk
        .split('\n')
        .filter(line => line.trim().startsWith('data:'));
      
      for (const line of dataLines) {
        if (line.includes('[DONE]')) continue;
        
        try {
          // Get the data part after 'data:'
          const jsonStr = line.substring(line.indexOf('data:') + 5).trim();
          // Parse the JSON data
          const data = JSON.parse(jsonStr);
          // Extract text content
          const content = data?.choices?.[0]?.delta?.content || '';
          
          if (content) {
            onChunk(content);
            completeResponse += content;
          }
        } catch (e) {
          logger.warn("Error parsing stream chunk:", e, "Line:", line);
        }
      }
    }
    
    return completeResponse;
  } catch (error) {
    logger.error("Error processing stream:", error);
    throw error;
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
  logger.debug(`Request: "${prompt.substring(0, 50)}..."`, options);
  
  try {
    const messages: ChatMessage[] = [];
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const model = options.model || FALLBACK_MODEL_ID;
    const maxTokens = options.maxTokens || DEFAULT_MAX_TOKENS;
    const temperature = options.temperature ?? 0.7;

    // Use a timeout promise
    let timeoutId: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        logger.error(`API request timed out after ${API_TIMEOUT_MS}ms`);
        reject(new Error(`LLM API request timed out after ${API_TIMEOUT_MS / 1000} seconds`));
      }, API_TIMEOUT_MS);
    });

    // Make the direct API call (non-streaming)
    logger.debug(`Calling callLLMAPI (non-stream)`);
    const apiCallPromise = callLLMAPI(messages, { model, maxTokens, temperature, stream: false });

    const response = await Promise.race([apiCallPromise, timeoutPromise]) as any; // Result is JSON object
    if (timeoutId) clearTimeout(timeoutId);
    
    const content = response?.choices?.[0]?.message?.content || '';
    logger.debug(`Success. Response text: "${content.substring(0, 50)}..."`);
    return content;

  } catch (error: unknown) {
    logger.error(`Failed:`, error);
    throw error instanceof Error ? error : new Error('Failed to generate text.');
  }
}

/**
 * Generates text using the LLM with streaming response, handled through callbacks.
 * @param prompt The user's prompt.
 * @param onChunk Callback function that receives each chunk of text as it arrives.
 * @param options Configuration options for the LLM request.
 * @returns A Promise resolving to the complete generated text as a string.
 */
async function generateTextStreamInternal(
  prompt: string,
  onChunk: (text: string) => void,
  options: LLMRequestOptions = {}
): Promise<string> {
  logger.debug(`Stream request: "${prompt.substring(0, 50)}..."`, options);
  
  try {
    const messages: ChatMessage[] = [];
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const model = options.model || FALLBACK_MODEL_ID;
    const maxTokens = options.maxTokens || DEFAULT_MAX_TOKENS;
    const temperature = options.temperature ?? 0.7;

    // Make the direct API call (streaming)
    logger.debug(`Calling callLLMAPI (stream)`);
    const streamResponse = await callLLMAPI(messages, { model, maxTokens, temperature, stream: true });

    // Process the stream
    const fullText = await processStreamInternal(streamResponse, onChunk);
    logger.debug(`Stream completed. Full text length: ${fullText.length}`);
    return fullText;

  } catch (error: unknown) {
    logger.error(`Stream failed:`, error);
    throw error instanceof Error ? error : new Error('Failed to generate streaming text.');
  }
}

/**
 * Creates summarization messages to insert before the prompt.
 */
function createSummarizationMessages(maxLength: number = 3): ChatMessage[] {
  const messages: ChatMessage[] = [];
  
  // Add system prompt for summarization
  messages.push({
    role: 'system',
    content: `Summarize the provided text concisely. Aim for around ${maxLength} sentences. Focus on key points, main ideas, and conclusions. Avoid unnecessary details. Return ONLY the summary without additional commentary or notes.`
  });
  
  return messages;
}

/**
 * Summarizes a text using the LLM.
 * @param text The text to summarize.
 * @param maxLength Approximate maximum summary length (in sentences).
 * @returns A Promise resolving to the summary string.
 */
async function summarizeTextInternal(text: string, maxLength: number = 3): Promise<string> {
  logger.debug(`Called with text length: ${text.length}, max length: ${maxLength}`);
  
  try {
    // Prepare summary-specific instructions
    const messages = createSummarizationMessages(maxLength);
    messages.push({ role: 'user', content: text });
    
    // Configure options
    const model = FALLBACK_MODEL_ID;
    const maxTokens = 150; // Keep summary concise
    const temperature = 0.5; // Less creative
    
    // Call the API directly
    logger.debug(`Calling API`);
    const response = await callLLMAPI(messages, { model, maxTokens, temperature, stream: false });
    
    const summary = response?.choices?.[0]?.message?.content || '';
    logger.debug(`Generated summary: "${summary.substring(0, 50)}${summary.length > 50 ? '...' : ''}"`);
    return summary;
    
  } catch (error) {
    logger.error(`Error generating summary:`, error);
    throw error instanceof Error ? error : new Error('Failed to generate summary.');
  }
}

/**
 * Creates extraction messages to insert before the prompt.
 */
function createExtractionMessages(question: string): ChatMessage[] {
  const messages: ChatMessage[] = [];
  
  // Add system prompt for information extraction
  messages.push({
    role: 'system',
    content: `Extract key information from the provided text to answer the following question: "${question}". 
    Focus only on directly relevant information. Be concise but thorough. If the answer cannot be found in the text, state that clearly.`
  });
  
  return messages;
}

/**
 * Extracts key information from text to answer a specific question
 * @param text The text to analyze
 * @param question The question to answer
 * @returns A Promise resolving to extracted information
 */
async function extractKeyInfoInternal(text: string, question: string): Promise<string> {
  logger.debug(`Called with question: "${question}", text length: ${text.length}`);
  
  try {
    // Prepare extraction-specific instructions
    const messages = createExtractionMessages(question);
    messages.push({ role: 'user', content: text });
    
    // Configure options
    const model = FALLBACK_MODEL_ID;
    const maxTokens = 200; // Keep extraction reasonably sized
    const temperature = 0.3; // More factual
    
    // Call the API directly
    logger.debug(`Calling API`);
    const response = await callLLMAPI(messages, { model, maxTokens, temperature, stream: false });
    
    const extraction = response?.choices?.[0]?.message?.content || '';
    logger.debug(`Extracted info: "${extraction.substring(0, 50)}${extraction.length > 50 ? '...' : ''}"`);
    return extraction;
    
  } catch (error) {
    logger.error(`Error extracting information:`, error);
    throw error instanceof Error ? error : new Error('Failed to extract information.');
  }
}

/**
 * Creates Q&A messages to insert before the prompt.
 */
function createQAMessages(question: string): ChatMessage[] {
  const messages: ChatMessage[] = [];
  
  // Add system prompt for Q&A
  messages.push({
    role: 'system',
    content: `Answer the user's question based solely on the provided content. If you cannot find the answer in the content, say so clearly. Be concise but thorough. The question is: "${question}"`
  });
  
  return messages;
}

/**
 * Answers a specific question about provided text
 * @param text The text containing information to answer the question
 * @param question The question to answer
 * @returns A Promise resolving to the answer
 */
async function answerQuestionInternal(text: string, question: string): Promise<string> {
  logger.debug(`Called with question: "${question}", text length: ${text.length}`);
  
  try {
    // Prepare Q&A-specific instructions
    const messages = createQAMessages(question);
    messages.push({ role: 'user', content: text });
    
    // Configure options
    const model = FALLBACK_MODEL_ID;
    const maxTokens = 200; // Keep answer reasonably sized
    const temperature = 0.3; // More factual
    
    // Call the API directly
    logger.debug(`Calling API`);
    const response = await callLLMAPI(messages, { model, maxTokens, temperature, stream: false });
    
    const answer = response?.choices?.[0]?.message?.content || '';
    logger.debug(`Answer: "${answer.substring(0, 50)}${answer.length > 50 ? '...' : ''}"`);
    return answer;
    
  } catch (error) {
    logger.error(`Error answering question:`, error);
    throw error instanceof Error ? error : new Error('Failed to answer question.');
  }
}

// --- Exported Module --- 

const llmImplementation = {
  generateText: generateTextInternal,
  generateTextStream: generateTextStreamInternal,
  processStream: processStreamInternal, // Export internal stream processor if needed externally
  summarizeText: summarizeTextInternal,
  extractKeyInfo: extractKeyInfoInternal,
  answerQuestion: answerQuestionInternal,
};

// Export the chosen implementation
export default llmImplementation; 