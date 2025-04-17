/**
 * SessionManager utility for managing conversation context and token limits
 * Implements strategies for maintaining relevant context while respecting token limits
 */

import { LLMRequestOptions } from './llm';

// Default token limits
const DEFAULT_MAX_TOKENS = 4000;  // Reduced from 6000 to 4000
const TOKEN_RESERVE_BUFFER = 800; // Reduced from 1000

/**
 * Priority levels for different message types
 * Higher priority messages are less likely to be pruned
 */
export enum MessagePriority {
  SYSTEM_INSTRUCTION = 10,  // System instructions, highest priority
  CURRENT_QUESTION = 9,     // Current user question
  ARTICLE_METADATA = 8,     // Article title, URL, etc
  VISIBLE_CONTENT = 8,      // Currently visible content (same priority as metadata)
  ARTICLE_CONTENT = 7,      // Article content
  RECENT_EXCHANGE = 6,      // Recent conversation (last 1-2 exchanges)
  CODE_CONTEXT = 5,         // Code context or samples
  HISTORICAL_EXCHANGE = 3,  // Older conversation history
  PERIPHERAL_INFO = 1       // Supplementary information
}

/**
 * Message interface with additional metadata for context management
 */
export interface ContextMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  priority: MessagePriority;
  tokenCount?: number;      // Estimated token count
  timestamp: number;        // When the message was created
}

/**
 * SessionManager handles conversation context management, ensuring
 * that the most relevant information is retained when token limits
 * are reached.
 */
export class SessionManager {
  private messages: ContextMessage[] = [];
  private maxTokens: number;
  private articleContext: ContextMessage | null = null;
  
  /**
   * Creates a new session manager with specified token limits
   * @param maxTokens Maximum tokens for the entire context window
   */
  constructor(maxTokens: number = DEFAULT_MAX_TOKENS) {
    this.maxTokens = maxTokens;
  }
  
  /**
   * Adds a new message to the conversation history
   * @param message The message to add
   * @returns The updated array of messages
   */
  addMessage(message: ContextMessage): ContextMessage[] {
    // Estimate token count if not provided
    if (message.tokenCount === undefined) {
      message.tokenCount = this.estimateTokens(message.content);
    }
    
    this.messages.push(message);
    
    // Optimize context after adding new message
    this.optimizeContext();
    
    return [...this.messages];
  }
  
  /**
   * Sets or updates the article context information
   * @param articleTitle The article title
   * @param articleContent The article content
   * @param articleUrl The article URL
   * @param articleLanguage The article language code
   */
  setArticleContext(
    articleTitle: string, 
    articleContent: string,
    articleUrl?: string,
    articleLanguage?: string
  ): void {
    // Build article metadata string
    let metadata = `Article Title: ${articleTitle || 'Untitled'}\n`;
    if (articleUrl) metadata += `Article URL: ${articleUrl}\n`;
    if (articleLanguage) metadata += `Article Language: ${articleLanguage}\n\n`;
    
    // Clean article content (remove HTML tags)
    const cleanContent = articleContent
      ? articleContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
      : '';
    
    // If this is visible content, indicate that in the context
    const isVisibleContent = articleTitle === 'Current View' || 
                            articleTitle.includes('Visible') ||
                            articleTitle.includes('Screen');
    
    const content = metadata + (isVisibleContent 
      ? "VISIBLE CONTENT:\n" + cleanContent
      : cleanContent);
    
    // Create article context message with appropriate priority
    this.articleContext = {
      id: 'article-context',
      role: 'system',
      content,
      priority: isVisibleContent ? MessagePriority.VISIBLE_CONTENT : MessagePriority.ARTICLE_CONTENT,
      tokenCount: this.estimateTokens(content),
      timestamp: Date.now()
    };
    
    // Re-optimize context with new article information
    this.optimizeContext();
  }
  
  /**
   * Gets the current optimized conversation context within token limits
   * @returns Array of messages representing the optimized context
   */
  getOptimizedContext(): ContextMessage[] {
    // Return the current set of messages after optimization
    return [...this.messages];
  }
  
  /**
   * Checks if article context is available in the session
   * @returns Boolean indicating if article context exists
   */
  hasArticleContext(): boolean {
    return !!this.articleContext && 
           !!this.articleContext.content && 
           this.articleContext.content.length > 0;
  }
  
  /**
   * Gets information about the current article context
   * @returns Object with article context stats or null if not available
   */
  getArticleContextInfo(): {title: string, contentLength: number, tokenCount: number} | null {
    if (!this.articleContext) return null;
    
    return {
      title: this.articleContext.content.split('\n')[0].replace('Article Title: ', ''),
      contentLength: this.articleContext.content.length,
      tokenCount: this.articleContext.tokenCount || 0
    };
  }
  
  /**
   * Builds a complete prompt for LLM from the optimized context
   * @param systemInstructions Optional special system instructions to prepend
   * @returns Formatted string prompt ready for LLM API
   */
  buildPrompt(systemInstructions?: string): string {
    let prompt = '';
    
    // Add special system instructions if provided
    if (systemInstructions) {
      prompt += `INSTRUCTIONS:\n${systemInstructions}\n\n`;
    }
    
    // Add article context if available
    if (this.articleContext) {
      prompt += `ARTICLE CONTEXT:\n${this.articleContext.content}\n\n`;
    }
    
    // Format messages for the conversation part
    const conversationText = this.messages
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');
    
    if (conversationText) {
      prompt += `CONVERSATION:\n${conversationText}\n\n`;
    }
    
    // Add final prompt marker for the assistant
    prompt += 'Assistant:';
    
    return prompt;
  }
  
  /**
   * Gets estimated token count for the current context
   * @returns The estimated token count
   */
  getEstimatedTokenCount(): number {
    let count = 0;
    
    // Include article context
    if (this.articleContext) {
      count += this.articleContext.tokenCount || 0;
    }
    
    // Include all messages
    this.messages.forEach(msg => {
      count += msg.tokenCount || 0;
    });
    
    return count;
  }
  
  /**
   * Estimates the number of tokens in a text string
   * @param text The text to analyze
   * @returns Estimated token count
   */
  private estimateTokens(text: string): number {
    // Simple estimation: assume 4 characters per token on average
    // This is a rough approximation, production systems should use more accurate tokenizers
    return Math.ceil(text.length / 4);
  }
  
  /**
   * Optimizes context by pruning when token limits are exceeded
   * Uses message priority and recency to make intelligent pruning decisions
   */
  private optimizeContext(): void {
    // Calculate the current token usage
    const currentTokenCount = this.getEstimatedTokenCount();
    
    // Check if we're within limits
    if (currentTokenCount <= this.maxTokens - TOKEN_RESERVE_BUFFER) {
      return; // No pruning needed
    }
    
    console.log(`[SessionManager] Token limit exceeded: ${currentTokenCount}/${this.maxTokens}. Pruning context...`);
    
    // First approach: Optimize article context if present
    if (this.articleContext && this.articleContext.tokenCount && 
        this.articleContext.tokenCount > this.maxTokens * 0.5) {
      this.optimizeArticleContext();
    }
    
    // Second approach: Prune conversation history if still needed
    this.pruneMessageHistory();
    
    console.log(`[SessionManager] After pruning: ${this.getEstimatedTokenCount()}/${this.maxTokens} tokens.`);
  }
  
  /**
   * Optimizes the article context to fit within token limits
   * by selecting the most relevant parts of the article
   */
  private optimizeArticleContext(): void {
    if (!this.articleContext || !this.articleContext.content) return;
    
    const content = this.articleContext.content;
    const tokenTarget = Math.floor(this.maxTokens * 0.25); // Reduced from 0.3 to 0.25
    
    // Extract metadata section (always keep this)
    const metadataEndIndex = content.indexOf('\n\n');
    let metadata = content.substring(0, metadataEndIndex + 2);
    
    // Get main content without metadata
    const mainContent = content.substring(metadataEndIndex + 2);
    
    // Check if we need to optimize
    if (this.estimateTokens(content) <= tokenTarget) return;
    
    let optimizedContent = '';
    
    // Check if this is visible content - handle differently
    const isVisibleContent = content.includes('VISIBLE CONTENT:');
    
    if (isVisibleContent) {
      // For visible content, we prioritize what's actually on screen
      // so we truncate if needed but try to keep all visible content
      const charTarget = tokenTarget * 4; // Rough character target
      const contentLength = mainContent.length;
      
      if (contentLength > charTarget) {
        // Simply truncate visible content if too long
        optimizedContent = `${metadata}${mainContent.substring(0, charTarget)}
        
[Note: Truncated from original visible content of ${contentLength} characters]`;
      } else {
        // No optimization needed
        return;
      }
    } else {
      // For longer articles, take beginning, middle and end portions
      const charTarget = tokenTarget * 4; // Rough character target
      const contentLength = mainContent.length;
      
      if (contentLength > charTarget * 1.5) {
        // Take smaller portions from beginning, middle, and end
        const portionSize = Math.floor(charTarget / 5); // Reduced from /4 to /5
        
        // Beginning section (prioritize)
        const beginning = mainContent.substring(0, portionSize * 2);
        
        // Middle section (smaller)
        const middleStart = Math.floor(contentLength / 2 - portionSize / 2);
        const middle = mainContent.substring(middleStart, middleStart + portionSize);
        
        // End section (smaller)
        const end = mainContent.substring(contentLength - portionSize);
        
        optimizedContent = `${metadata}
ARTICLE EXCERPT (key portions):

BEGINNING:
${beginning}

MIDDLE SECTION:
${middle}

ENDING:
${end}

[Note: The full article is ${contentLength} characters long. This is a partial extract.]`;
      } else {
        // For shorter content, truncate more aggressively
        const shorterTarget = Math.min(charTarget, contentLength);
        optimizedContent = `${metadata}${mainContent.substring(0, shorterTarget)}
        
[Note: Truncated from original length of ${contentLength} characters]`;
      }
    }
    
    // Update the article context
    this.articleContext.content = optimizedContent;
    this.articleContext.tokenCount = this.estimateTokens(optimizedContent);
    
    console.log(`[SessionManager] Optimized article context: ${this.articleContext.tokenCount} tokens.`);
  }
  
  /**
   * Prunes conversation message history based on priority and recency
   * to fit within token limits - more aggressive pruning
   */
  private pruneMessageHistory(): void {
    // Skip if no messages
    if (this.messages.length === 0) return;
    
    // More aggressive pruning for longer conversations
    if (this.messages.length > 3) { // Reduced from 4 to 3
      // Separate system instructions (highest priority) from other messages
      const systemMessages = this.messages.filter(m => 
        m.priority >= MessagePriority.SYSTEM_INSTRUCTION);
      
      // Only keep the most recent user question and exchanges
      const recentMessages = this.messages
        .filter(m => m.priority === MessagePriority.CURRENT_QUESTION)
        .slice(-1) // Just the most recent question
        .concat(this.messages
          .filter(m => 
            m.priority < MessagePriority.CURRENT_QUESTION && 
            m.priority >= MessagePriority.RECENT_EXCHANGE)
            .slice(-2) // Reduced from -4 to -2 (fewer recent exchanges)
          );
      
      // Update messages list with pruned selection
      this.messages = [...systemMessages, ...recentMessages];
      
      // Re-sort messages by timestamp
      this.messages.sort((a, b) => a.timestamp - b.timestamp);
      
      // If we're still over the limit, fall through to the standard pruning
    }
    
    // Calculate current token usage
    const currentTokenCount = this.getEstimatedTokenCount();
    const targetTokenCount = this.maxTokens - TOKEN_RESERVE_BUFFER;
    
    // Check if we're already within limits
    if (currentTokenCount <= targetTokenCount) return;
    
    // Continue with standard pruning algorithm if still needed
    // Sort messages by priority (descending) and then by timestamp (descending)
    const sortedMessages = [...this.messages].sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority first
      }
      return b.timestamp - a.timestamp; // More recent first
    });
    
    // Calculate token allocation for conversation
    const targetConversationTokens = targetTokenCount - (this.articleContext?.tokenCount || 0);
    
    // Select messages to keep within token limit - more aggressive
    const keptMessages: ContextMessage[] = [];
    let keptTokens = 0;
    
    // Always keep system instructions and current question
    const criticalMessages = sortedMessages.filter(
      msg => msg.priority >= MessagePriority.CURRENT_QUESTION
    );
    
    for (const msg of criticalMessages) {
      keptMessages.push(msg);
      keptTokens += msg.tokenCount || 0;
    }
    
    // Add remaining messages if they fit
    const remainingMessages = sortedMessages.filter(
      msg => msg.priority < MessagePriority.CURRENT_QUESTION
    );
    
    for (const message of remainingMessages) {
      const msgTokens = message.tokenCount || 0;
      
      // Only add if it doesn't exceed our budget
      if (keptTokens + msgTokens <= targetConversationTokens) {
        keptMessages.push(message);
        keptTokens += msgTokens;
      }
    }
    
    // Re-sort messages by timestamp to maintain conversation flow
    keptMessages.sort((a, b) => a.timestamp - b.timestamp);
    
    // Update the message list
    this.messages = keptMessages;
    
    console.log(`[SessionManager] Pruned message history: Kept ${keptMessages.length} messages with ${keptTokens} tokens.`);
  }
  
  /**
   * Clears all conversation history while preserving article context
   */
  clearConversation(): void {
    this.messages = [];
    console.log(`[SessionManager] Conversation history cleared.`);
  }
  
  /**
   * Resets the entire session including article context
   */
  resetSession(): void {
    this.messages = [];
    this.articleContext = null;
    console.log(`[SessionManager] Session fully reset.`);
  }
}

export default SessionManager; 