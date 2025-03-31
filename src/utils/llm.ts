/**
 * LLM API integration utility for ReadLite
 * Provides direct fetch implementation to work around Portkey compatibility issues in Service Workers
 */

import { DEFAULT_MODEL } from '../config/model';

// LLM configuration with fallbacks and defaults
const API_KEY = process.env.PORTKEY_API_KEY || '';
const VIRTUAL_KEY = process.env.PORTKEY_VIRTUAL_KEY || '';

// API endpoints - try different possible base URLs with user-provided endpoint first
const API_ENDPOINTS = [
  'https://api.portkey.ai/v1/chat/completions',
];

// Default configuration
const DEFAULT_MAX_TOKENS = 256;

/**
 * Interface for LLM request options
 */
export interface LLMRequestOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  stream?: boolean;
}

/**
 * Direct fetch implementation for LLM API
 * Bypasses Portkey library to avoid compatibility issues in Service Workers
 */
async function callLLMAPI(messages: any[], options: {
  model: string;
  maxTokens: number;
  temperature: number;
  stream?: boolean;
}): Promise<any> {
  console.log(`[DEBUG] llm-direct: Calling API with model ${options.model}`);
  
  // Format the request body exactly as in the curl command
  const requestBody = {
    model: options.model,
    max_tokens: options.maxTokens,  // use snake_case to match API
    temperature: options.temperature,
    messages: messages,
    stream: options.stream || false
  };
  
  console.log(`[DEBUG] llm-direct: Request body: ${JSON.stringify(requestBody)}`);
  
  // Try each endpoint until one works
  let lastError = null;
  
  for (const endpoint of API_ENDPOINTS) {
    try {
      console.log(`[DEBUG] llm-direct: Trying endpoint: ${endpoint}`);
      
      const headers = {
        'Content-Type': 'application/json',
        'x-portkey-api-key': API_KEY,
        'x-portkey-virtual-key': VIRTUAL_KEY
      };
      
      console.log(`[DEBUG] llm-direct: Request headers: ${JSON.stringify(headers)}`);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
      });
      
      console.log(`[DEBUG] llm-direct: Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[ERROR] llm-direct: API request failed for endpoint ${endpoint} with status ${response.status}: ${errorText}`);
        lastError = new Error(`API request failed with status ${response.status}: ${errorText}`);
        continue; // try next endpoint
      }
      
      // Handle streaming response
      if (options.stream) {
        return response; // Return the response object for streaming
      }
      
      // Handle regular JSON response
      const responseData = await response.json();
      console.log(`[DEBUG] llm-direct: API response success from ${endpoint}`);
      return responseData;
    } catch (error) {
      console.error(`[ERROR] llm-direct: API request failed for endpoint ${endpoint}:`, error);
      lastError = error;
      // Continue to next endpoint
    }
  }
  
  // If we get here, all endpoints failed
  throw lastError || new Error('All API endpoints failed');
}

/**
 * Send a message to LLM and get a response
 */
export const generateText = async (
  prompt: string,
  options: LLMRequestOptions = {}
) => {
  console.log(`[DEBUG] llm.generateText: Starting with prompt: "${prompt.substring(0, 30)}..."`);
  
  try {
    const messages = [];
    
    // Add system message if provided
    if (options.systemPrompt) {
      console.log(`[DEBUG] llm.generateText: Adding system prompt: "${options.systemPrompt.substring(0, 30)}..."`);
      messages.push({
        role: 'system',
        content: options.systemPrompt
      });
    }
    
    // Add user message
    console.log(`[DEBUG] llm.generateText: Adding user message`);
    messages.push({
      role: 'user',
      content: prompt
    });

    const model = options.model || DEFAULT_MODEL;
    const maxTokens = options.maxTokens || DEFAULT_MAX_TOKENS;
    const temperature = options.temperature || 0.7;
    const stream = options.stream || false;
    
    console.log(`[DEBUG] llm.generateText: Preparing API call with model: ${model}, maxTokens: ${maxTokens}, temperature: ${temperature}, stream: ${stream}`);
    
    // Use a timeout promise to handle potential hangs
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        console.error(`[ERROR] llm.generateText: API request timed out after 30 seconds`);
        reject(new Error('LLM API request timed out after 30 seconds'));
      }, 30000);
    });

    // Make the direct API call
    console.log(`[DEBUG] llm.generateText: Sending API request`);
    const apiCallPromise = callLLMAPI(messages, {
      model,
      maxTokens,
      temperature,
      stream
    });

    // Race the API call against the timeout
    console.log(`[DEBUG] llm.generateText: Waiting for API response or timeout`);
    const response = await Promise.race([apiCallPromise, timeoutPromise]);
    
    // Handle streaming response
    if (stream) {
      return response; // Return the response object for streaming
    }
    
    console.log(`[DEBUG] llm.generateText: Received API response`, response);
    
    // Extract content from response
    const content = response.choices?.[0]?.message?.content || '';
    console.log(`[DEBUG] llm.generateText: Extracted content: "${content.substring(0, 30)}..."`);
    
    return content;
  } catch (error: unknown) {
    console.error(`[ERROR] llm.generateText: ${error instanceof Error ? error.message : String(error)}`);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to generate text: ${errorMessage}`);
  }
};

/**
 * Process a streaming response
 */
export const processStream = async (
  streamResponse: Response,
  onChunk: (chunk: string) => void
) => {
  if (!streamResponse.body) {
    throw new Error('Response body is null');
  }

  const reader = streamResponse.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  // Track content blocks for Claude's multi-block messages
  const contentBlocks: {[index: number]: string} = {};
  
  // Variables to track multi-line SSE events
  let currentEventType = '';
  let currentEventData = '';
  
  try {
    console.log('[DEBUG] processStream: Starting to process stream');
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log('[DEBUG] processStream: Stream reading completed');
        break;
      }
      
      // Decode the chunk and add it to our buffer
      buffer += decoder.decode(value, { stream: true });
      console.log(`[DEBUG] processStream: Received raw buffer: ${buffer.substring(0, 50)}${buffer.length > 50 ? '...' : ''}`);
      
      // Process complete lines in the buffer
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep the last incomplete line in the buffer
      
      for (const line of lines) {
        if (line.trim() === '') {
          // Empty line marks the end of an event in SSE
          if (currentEventType && currentEventData) {
            processEvent(currentEventType, currentEventData, onChunk);
            currentEventType = '';
            currentEventData = '';
          }
          continue;
        }
        
        // Handle event type line
        if (line.startsWith('event:')) {
          // If we already have an event type and data, process the previous event
          if (currentEventType && currentEventData) {
            processEvent(currentEventType, currentEventData, onChunk);
            currentEventData = '';
          }
          currentEventType = line.slice(6).trim();
          continue;
        }
        
        // Handle data line
        if (line.startsWith('data:')) {
          const data = line.slice(5).trim();
          // Append to existing data (SSE can split data across multiple lines)
          currentEventData += data;
          continue;
        }
        
        // For non-SSE format data, try to parse as JSON or plain text
        if (line.trim().startsWith('{') || line.trim().startsWith('[')) {
          try {
            const json = JSON.parse(line.trim());
            let content = '';
            
            // Try to find content in various formats (multiple API compatibility)
            if (json.choices && json.choices[0]) {
              if (json.choices[0].delta && json.choices[0].delta.content) {
                content = json.choices[0].delta.content;
              } else if (json.choices[0].text) {
                content = json.choices[0].text;
              } else if (json.choices[0].message && json.choices[0].message.content) {
                content = json.choices[0].message.content;
              }
            } else if (json.content) {
              content = json.content;
            } else if (json.text) {
              content = json.text;
            }
            
            if (content) {
              console.log(`[DEBUG] processStream: Extracted content from raw JSON: "${content.substring(0, 20)}${content.length > 20 ? '...' : ''}"`);
              onChunk(content);
            }
          } catch (e) {
            console.error('Error parsing raw JSON:', e);
          }
        }
        // Plain text fallback
        else if (line.trim() && !line.startsWith('event:') && !line.startsWith('data:')) {
          console.log(`[DEBUG] processStream: Using plain text line: "${line.substring(0, 20)}${line.length > 20 ? '...' : ''}"`);
          onChunk(line.trim());
        }
      }
      
      // Process any remaining event at the end of the current chunk
      if (currentEventType && currentEventData) {
        processEvent(currentEventType, currentEventData, onChunk);
        currentEventType = '';
        currentEventData = '';
      }
    }
    
    // Process any remaining data
    if (buffer) {
      decoder.decode();
    }
    
    console.log('[DEBUG] processStream: Stream processing completed');
  } catch (error) {
    console.error('Error reading stream:', error);
    throw error;
  }
};

/**
 * Process an individual SSE event 
 */
function processEvent(eventType: string, eventData: string, onChunk: (chunk: string) => void) {
  try {
    console.log(`[DEBUG] processStream: Processing event type: ${eventType}`);
    
    // Handle [DONE] event
    if (eventData === '[DONE]') {
      console.log('[DEBUG] processStream: Received [DONE] signal');
      return;
    }
    
    // Try to parse the event data as JSON
    const data = JSON.parse(eventData);
    
    // Claude specific event handling
    if (eventType === 'content_block_delta' || (data.type === 'content_block_delta' && data.delta)) {
      // Handle Claude's content_block_delta events
      if (data.delta) {
        // Handle different types of deltas
        if (data.delta.type === 'text_delta' && data.delta.text) {
          console.log(`[DEBUG] processStream: Claude text delta: "${data.delta.text.substring(0, 30)}${data.delta.text.length > 30 ? '...' : ''}"`);
          // Send the text chunk to the callback
          onChunk(data.delta.text);
        } 
        // Handle thinking deltas
        else if (data.delta.type === 'thinking_delta' && data.delta.thinking) {
          console.log(`[DEBUG] processStream: Claude thinking delta: "${data.delta.thinking.substring(0, 30)}${data.delta.thinking.length > 30 ? '...' : ''}"`);
          // We could optionally handle thinking output if needed
          // For now, we don't send thinking content to the UI
        }
        // Handle tool use input deltas
        else if (data.delta.type === 'input_json_delta' && data.delta.partial_json) {
          console.log(`[DEBUG] processStream: Claude tool input delta: "${data.delta.partial_json.substring(0, 30)}${data.delta.partial_json.length > 30 ? '...' : ''}"`);
          // Tool input deltas are generally not displayed in the UI
        }
      }
    }
    // OpenAI style delta handling (for compatibility)
    else if (data.choices && data.choices.length > 0) {
      const choice = data.choices[0];
      
      if (choice.delta && choice.delta.content) {
        console.log(`[DEBUG] processStream: OpenAI delta content: "${choice.delta.content.substring(0, 30)}${choice.delta.content.length > 30 ? '...' : ''}"`);
        onChunk(choice.delta.content);
      }
    }
    // Try to find any text content in other formats
    else if (data.content && typeof data.content === 'string') {
      onChunk(data.content);
    }
    else if (data.text && typeof data.text === 'string') {
      onChunk(data.text);
    }
    else if (data.message && data.message.content && typeof data.message.content === 'string') {
      onChunk(data.message.content);
    }
  } catch (e) {
    console.error('Error processing SSE event:', e);
    console.log('Problem event:', { type: eventType, data: eventData });
    
    // If it's not valid JSON but looks like text, try to use it directly
    if (eventData && typeof eventData === 'string' && 
        !eventData.startsWith('{') && !eventData.startsWith('[')) {
      console.log(`[DEBUG] processStream: Using direct text: "${eventData.substring(0, 20)}${eventData.length > 20 ? '...' : ''}"`);
      onChunk(eventData);
    }
  }
}

/**
 * Generate text with streaming response
 */
export const generateTextStream = async (
  prompt: string,
  onChunk: (chunk: string) => void,
  options: LLMRequestOptions = {}
) => {
  const streamResponse = await generateText(prompt, {
    ...options,
    stream: true
  }) as Response;
  
  await processStream(streamResponse, onChunk);
};

/**
 * Summarize text using LLM
 */
export const summarizeText = async (
  text: string,
  maxLength: number = 3
) => {
  const systemPrompt = `You are a helpful assistant that summarizes text. 
  Create a concise summary of the provided text in about ${maxLength} sentences. 
  Focus on the key points and main ideas.`;
  
  return generateText(text, {
    systemPrompt,
    maxTokens: 150,
    temperature: 0.3
  });
};

/**
 * Extract key information from text
 */
export const extractKeyInfo = async (text: string) => {
  const systemPrompt = `You are a helpful assistant that extracts key information from text.
  Identify and list the most important facts, entities, dates, and concepts in the text.
  Format your response as bullet points.`;
  
  return generateText(text, {
    systemPrompt,
    maxTokens: 200,
    temperature: 0.2
  });
};

/**
 * Answer a question based on the provided context
 */
export const answerQuestion = async (
  question: string,
  context: string
) => {
  const systemPrompt = `You are a helpful assistant that answers questions based on the provided context.
  Only use information from the context to answer the question.
  If the answer cannot be determined from the context, say so clearly.`;
  
  const prompt = `Context: ${context}\n\nQuestion: ${question}`;
  
  return generateText(prompt, {
    systemPrompt,
    maxTokens: 200,
    temperature: 0.4
  });
};

/**
 * Create a fallback implementation that mimics the LLM API
 * This is used when the actual API is not available
 */
const createFallbackImplementation = () => {
  return {
    generateText: async (prompt: string, options: LLMRequestOptions = {}) => {
      // Wait a short time to simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      return "This is a fallback response. The actual LLM API could not be called. Please check your API configuration and network connection.";
    },
    
    generateTextStream: async (prompt: string, onChunk: (chunk: string) => void, options: LLMRequestOptions = {}) => {
      // Simulate a streaming response
      const fallbackResponse = "This is a fallback streaming response. The actual LLM API could not be called.";
      const chunks = fallbackResponse.split(' ');
      
      for (const chunk of chunks) {
        await new Promise(resolve => setTimeout(resolve, 200));
        onChunk(chunk + ' ');
      }
    },
    
    summarizeText: async (text: string) => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      return "This is a simulated summary. LLM API connection is not available.";
    },
    
    extractKeyInfo: async (text: string) => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      return "• Simulated key point 1\n• Simulated key point 2\n• API connection is not available";
    },
    
    answerQuestion: async (question: string, context: string) => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      return "I cannot provide a real answer since the LLM API connection is not available.";
    }
  };
};

// Export the real implementation, with fallback available if needed
export default {
  generateText,
  generateTextStream,
  processStream,
  summarizeText,
  extractKeyInfo,
  answerQuestion,
  __FALLBACK__: createFallbackImplementation()
}; 