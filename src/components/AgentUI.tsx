import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useI18n } from '../hooks/useI18n';
import { marked } from 'marked';
import llmClient from '../utils/llmClient';

// Define component props
interface AgentUIProps {
  theme: 'light' | 'dark' | 'sepia' | 'paper';
  onClose?: () => void;
  isVisible: boolean;
  initialMessage?: string;
  article?: any; // Optional article context to use for the AI
}

// Message interface
interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: number;
  thinking?: boolean;
  error?: boolean;
}

/**
 * Modern AgentUI component combining ReadLite, Cursor, and Claude UX elements
 */
const AgentUI: React.FC<AgentUIProps> = ({ 
  theme, 
  onClose, 
  isVisible, 
  initialMessage = "How can I help you with this article?",
  article
}) => {
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState('');
  const [suggestionChips, setSuggestionChips] = useState<string[]>([
    'Summarize this article',
    'Key takeaways',
    'Explain like I\'m 5',
    'Generate quiz questions'
  ]);
  
  // Refs
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // Hooks
  const { t } = useI18n();
  
  // Set initial agent message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        sender: 'agent',
        text: initialMessage,
        timestamp: Date.now()
      }]);
    }
  }, [initialMessage]);
  
  // Auto scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingResponse]);
  
  // Auto focus input when component becomes visible
  useEffect(() => {
    if (isVisible && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [isVisible]);
  
  // Cleanup event listeners when component unmounts
  useEffect(() => {
    return () => {
      // Make sure to clean up all stream listeners when the component unmounts
      console.log('[DEBUG] AgentUI: Cleaning up stream listeners on unmount');
      llmClient.cleanupStreamListeners();
    };
  }, []);
  
  // Render markdown function
  const renderMarkdown = (text: string) => {
    try {
      // Use marked to convert markdown to HTML
      const htmlContent = marked.parse(text, { breaks: true }) as string;
      return { __html: htmlContent };
    } catch (error) {
      console.error("Error rendering markdown:", error);
      return { __html: text };
    }
  };
  
  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    
    // Auto resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(150, e.target.scrollHeight)}px`;
  };
  
  // Handle send message (both button click and Enter key)
  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim() || isLoading) return;
    
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: inputText.trim(),
      timestamp: Date.now()
    };
    
    // Add user message to conversation
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    
    // Reset height of textarea
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
    
    // Set loading state
    setIsLoading(true);
    setError(null);
    setIsThinking(true);
    setStreamingResponse('');
    
    // Use a local variable to accumulate the complete response
    // This avoids issues with React's asynchronous state updates
    let accumulatedResponse = '';
    
    try {
      // Build a better prompt with conversation history and article context
      const prompt = buildPrompt(userMessage.text);
      
      console.log("Sending request to LLM API with prompt:", prompt.substring(0, 100) + "...");
      
      // Use streaming API for more responsive experience
      await llmClient.generateTextStream(
        prompt,
        (chunk: string) => {
          console.log("Received chunk from LLM API:", chunk.substring(0, 20) + "...");
          // Update both the local accumulated response and the state
          // The state updates the UI, while the local variable ensures we have the complete text
          accumulatedResponse += chunk;
          setStreamingResponse(prev => prev + chunk);
        },
        // Optional options
        {
          temperature: 0.7, // More creative responses
          maxTokens: 1500  // Limit response length
        }
      );
      
      // Stream is complete - use the accumulated complete response instead of state
      console.log(`LLM stream completed. Total response length: ${accumulatedResponse.length} characters`);
      
      // Add agent response to conversation using the local accumulated response
      // This ensures we have the complete text, not relying on state which may not be updated yet
      setMessages(prev => [...prev, {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        text: accumulatedResponse || "I couldn't generate a response. Please try again.",
        timestamp: Date.now()
      }]);
      
      // Reset streaming response
      setStreamingResponse('');
      
      // Update suggestion chips based on context
      updateSuggestionChips(userMessage.text);
      
    } catch (err) {
      console.error("Error calling LLM API:", err);
      setError(err instanceof Error ? err.message : 'An error occurred while generating a response');
      
      // If we have partial response but encountered an error, still show it
      if (accumulatedResponse) {
        console.log("Adding partial response despite error");
        setMessages(prev => [...prev, {
          id: `agent-${Date.now()}`,
          sender: 'agent',
          text: accumulatedResponse + "\n\n_(Response may be incomplete due to an error)_",
          timestamp: Date.now(),
          error: true
        }]);
      }
    } finally {
      setIsLoading(false);
      setIsThinking(false);
    }
  }, [inputText, isLoading, article, messages]);
  
  // Build prompt with context
  const buildPrompt = (userInput: string): string => {
    // Create a conversation history for context
    const conversationHistory = messages
      .filter(msg => !msg.id.includes('welcome')) // Skip welcome message
      .map(msg => `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.text}`)
      .join('\n\n');
    
    // Add article context if available
    let articleContext = '';
    if (article) {
      articleContext = `
Article Title: ${article.title || 'Untitled'}
Article URL: ${article.url || 'Unknown'}
Article Language: ${article.language || 'English'}

Here is a brief extract from the beginning of the article:
${article.content ? article.content.substring(0, 500).replace(/<[^>]*>/g, '') + '...' : 'No content available'}
`;
    }
    
    // Build the full prompt
    return `${articleContext ? 'ARTICLE CONTEXT:\n' + articleContext + '\n\nCONVERSATION:\n' : ''}${conversationHistory ? conversationHistory + '\n\n' : ''}User: ${userInput}\n\nAssistant:`;
  };
  
  // Handle key press (Enter to send, Shift+Enter for new line)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // Handle suggestion chip click
  const handleSuggestionClick = (suggestion: string) => {
    setInputText(suggestion);
    if (inputRef.current) {
      inputRef.current.focus();
      setTimeout(() => {
        handleSendMessage();
      }, 100);
    }
  };
  
  // Update suggestion chips based on conversation context
  const updateSuggestionChips = (lastUserMessage: string) => {
    // In a real implementation, this would analyze the conversation and context
    // to generate relevant follow-up suggestions
    
    if (lastUserMessage.toLowerCase().includes('summarize')) {
      setSuggestionChips([
        'Make it simpler',
        'Give more details',
        'Bullet points only',
        'Compare with other sources'
      ]);
    } else if (lastUserMessage.toLowerCase().includes('explain')) {
      setSuggestionChips([
        'Explain more deeply',
        'Give examples',
        'Use analogies',
        'Why is this important?'
      ]);
    } else {
      setSuggestionChips([
        'Find related articles',
        'Ask a follow-up question',
        'Extract key facts',
        'Create a study guide'
      ]);
    }
  };
  
  // Determine colors based on theme
  const getThemeColors = () => {
    switch (theme) {
      case 'dark':
        return {
          background: '#1E1E1E',
          messageBg: '#252525',
          userBubble: '#2969c7',
          agentBubble: '#2D2D2D',
          inputBg: '#333333',
          text: '#E0E0E0',
          textSecondary: '#A0A0A0',
          accent: '#64B5F6',
          border: '#444444',
          error: '#FF5252',
          scrollbar: 'rgba(255, 255, 255, 0.1)',
          scrollbarHover: 'rgba(255, 255, 255, 0.2)',
          chipBg: 'rgba(255, 255, 255, 0.08)',
          chipHover: 'rgba(255, 255, 255, 0.12)',
          thinkingPulse: 'rgba(100, 181, 246, 0.3)'
        };
      case 'sepia':
        return {
          background: '#F2E8D7',
          messageBg: '#F7F0E3',
          userBubble: '#9D633C',
          agentBubble: '#EBE1CF',
          inputBg: '#FFF8ED',
          text: '#5A4A3F',
          textSecondary: '#8E7968',
          accent: '#9D633C',
          border: '#D8CCBB',
          error: '#D84315',
          scrollbar: 'rgba(90, 74, 63, 0.1)',
          scrollbarHover: 'rgba(90, 74, 63, 0.2)',
          chipBg: 'rgba(157, 99, 60, 0.1)',
          chipHover: 'rgba(157, 99, 60, 0.2)',
          thinkingPulse: 'rgba(157, 99, 60, 0.15)'
        };
      case 'paper':
        return {
          background: '#F7F7F7',
          messageBg: '#F0F0F0',
          userBubble: '#616161',
          agentBubble: '#E8E8E8',
          inputBg: '#FFFFFF',
          text: '#333333',
          textSecondary: '#666666',
          accent: '#505050',
          border: '#DDDDDD',
          error: '#D32F2F',
          scrollbar: 'rgba(0, 0, 0, 0.08)',
          scrollbarHover: 'rgba(0, 0, 0, 0.12)',
          chipBg: 'rgba(0, 0, 0, 0.06)',
          chipHover: 'rgba(0, 0, 0, 0.1)',
          thinkingPulse: 'rgba(0, 0, 0, 0.08)'
        };
      default: // light
        return {
          background: '#FFFFFF',
          messageBg: '#F5F8FA',
          userBubble: '#0077CC',
          agentBubble: '#F0F2F5',
          inputBg: '#FFFFFF',
          text: '#2C2C2E',
          textSecondary: '#6E6E73',
          accent: '#0077CC',
          border: '#E5E5EA',
          error: '#FF3B30',
          scrollbar: 'rgba(0, 0, 0, 0.05)',
          scrollbarHover: 'rgba(0, 0, 0, 0.1)',
          chipBg: 'rgba(0, 119, 204, 0.08)',
          chipHover: 'rgba(0, 119, 204, 0.12)',
          thinkingPulse: 'rgba(0, 119, 204, 0.15)'
        };
    }
  };
  
  const colors = getThemeColors();
  const isDark = theme === 'dark';
  
  // Create keyframes for animations
  const animationKeyframes = `
    @keyframes pulse {
      0% { opacity: 0.3; }
      50% { opacity: 0.7; }
      100% { opacity: 0.3; }
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes slideIn {
      from { transform: translateY(10px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    
    @keyframes thinking {
      0% { transform: scale(1); opacity: 0.6; }
      50% { transform: scale(1.1); opacity: 1; }
      100% { transform: scale(1); opacity: 0.6; }
    }
    
    .scrollbar::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    
    .scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    
    .scrollbar::-webkit-scrollbar-thumb {
      background: ${colors.scrollbar};
      border-radius: 3px;
    }
    
    .scrollbar::-webkit-scrollbar-thumb:hover {
      background: ${colors.scrollbarHover};
    }
    
    .message-bubble {
      animation: slideIn 0.2s ease-out;
    }
    
    .agent-typing-indicator {
      animation: pulse 1.5s infinite;
    }
    
    /* Markdown styling */
    .markdown-content {
      line-height: 1.5;
    }
    
    .markdown-content h1, 
    .markdown-content h2, 
    .markdown-content h3 {
      margin-top: 1em;
      margin-bottom: 0.5em;
      font-weight: 600;
    }
    
    .markdown-content h1 {
      font-size: 1.4em;
    }
    
    .markdown-content h2 {
      font-size: 1.2em;
    }
    
    .markdown-content h3 {
      font-size: 1.1em;
    }
    
    .markdown-content ul, 
    .markdown-content ol {
      padding-left: 1.5em;
      margin: 0.5em 0;
    }
    
    .markdown-content li {
      margin: 0.25em 0;
    }
    
    .markdown-content p {
      margin: 0.75em 0;
    }
    
    .markdown-content pre {
      background-color: ${isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.05)'};
      padding: 0.75em;
      border-radius: 6px;
      overflow-x: auto;
      margin: 0.75em 0;
    }
    
    .markdown-content code {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 0.9em;
      padding: 0.2em 0.4em;
      background-color: ${isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.05)'};
      border-radius: 3px;
    }
    
    .markdown-content pre code {
      padding: 0;
      background-color: transparent;
    }
    
    .markdown-content blockquote {
      border-left: 3px solid ${colors.accent};
      margin: 0.75em 0;
      padding-left: 1em;
      color: ${colors.textSecondary};
    }
    
    /* Blink cursor animation */
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }
    
    .cursor-blink {
      display: inline-block;
      width: 0.5em;
      height: 1em;
      background-color: ${colors.text};
      animation: blink 1s step-end infinite;
      margin-left: 0.2em;
      vertical-align: middle;
    }
  `;
  
  // Render the AgentUI component
  return (
    <div 
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: colors.background,
        color: colors.text,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
        position: 'relative',
        borderLeft: `1px solid ${colors.border}`
      }}
    >
      {/* Inject CSS */}
      <style dangerouslySetInnerHTML={{ __html: animationKeyframes }} />
      
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: `1px solid ${colors.border}`,
          backgroundColor: colors.messageBg,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {/* Agent Icon */}
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '16px',
              background: `linear-gradient(135deg, ${colors.accent}, ${colors.userBubble})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontWeight: 'bold',
              fontSize: '14px',
            }}
          >
            AI
          </div>
          
          <div
            style={{
              fontWeight: 600,
              fontSize: '15px',
            }}
          >
            {t('agent') || 'Agent'}
            {isThinking && (
              <span
                style={{
                  display: 'inline-block',
                  width: '36px',
                  marginLeft: '6px',
                }}
              >
                <span className="agent-typing-indicator">...</span>
              </span>
            )}
          </div>
        </div>
        
        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              border: 'none',
              background: 'none',
              color: colors.textSecondary,
              borderRadius: '16px',
              transition: 'background-color 0.2s, color 0.2s',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      
      {/* Messages Container */}
      <div 
        ref={messagesContainerRef}
        className="scrollbar"
        style={{
          flexGrow: 1,
          overflowY: 'auto',
          padding: '16px 0',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Message bubbles */}
        {messages.map((msg, index) => {
          const isUser = msg.sender === 'user';
          
          return (
            <div
              key={msg.id}
              className="message-bubble"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
                padding: '3px 16px',
                marginBottom: '12px',
              }}
            >
              <div
                style={{
                  maxWidth: '85%',
                  padding: '12px 16px',
                  backgroundColor: isUser ? colors.userBubble : colors.agentBubble,
                  color: isUser ? '#FFFFFF' : colors.text,
                  borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  fontSize: '15px',
                  lineHeight: '1.5',
                  boxShadow: `0 1px 2px ${isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.07)'}`,
                }}
              >
                {isUser ? (
                  <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                ) : (
                  <div
                    className="markdown-content"
                    dangerouslySetInnerHTML={renderMarkdown(msg.text)} 
                  />
                )}
              </div>
            </div>
          );
        })}
        
        {/* Streaming response bubble */}
        {streamingResponse && (
          <div
            className="message-bubble"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              padding: '3px 16px',
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                maxWidth: '85%',
                padding: '12px 16px',
                backgroundColor: colors.agentBubble,
                color: colors.text,
                borderRadius: '18px 18px 18px 4px',
                fontSize: '15px',
                lineHeight: '1.5',
                boxShadow: `0 1px 2px ${isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.07)'}`,
              }}
            >
              <div
                className="markdown-content"
                dangerouslySetInnerHTML={renderMarkdown(streamingResponse)}
              />
              {isThinking && (
                <span className="cursor-blink"></span>
              )}
            </div>
          </div>
        )}
        
        {/* Thinking indicator (shown only when not streaming) */}
        {isThinking && !streamingResponse && (
          <div
            style={{
              alignSelf: 'flex-start',
              margin: '0 16px',
              padding: '8px 16px',
              backgroundColor: 'transparent',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: colors.accent,
                    opacity: 0.6,
                    animation: `thinking 1.5s infinite ${i * 0.2}s`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Error message */}
        {error && (
          <div
            style={{
              alignSelf: 'center',
              maxWidth: '85%',
              margin: '8px 16px',
              padding: '8px 12px',
              color: colors.error,
              fontSize: '14px',
              backgroundColor: isDark ? 'rgba(255, 82, 82, 0.1)' : 'rgba(255, 59, 48, 0.05)',
              borderRadius: '8px',
              animation: 'fadeIn 0.3s',
            }}
          >
            {error}
          </div>
        )}
        
        {/* Anchor div for auto-scrolling */}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Suggestion Chips */}
      {suggestionChips.length > 0 && !isLoading && (
        <div
          style={{
            padding: '8px 16px',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            backgroundColor: colors.background,
            borderTop: `1px solid ${colors.border}`,
          }}
          className="scrollbar"
        >
          <div
            style={{
              display: 'flex',
              gap: '8px',
            }}
          >
            {suggestionChips.map((chip, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(chip)}
                style={{
                  background: colors.chipBg,
                  color: colors.accent,
                  border: 'none',
                  borderRadius: '18px',
                  padding: '8px 12px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  whiteSpace: 'nowrap',
                  boxShadow: `0 1px 2px ${isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)'}`,
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = colors.chipHover;
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = colors.chipBg;
                }}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Input Area */}
      <div
        style={{
          borderTop: `1px solid ${colors.border}`,
          backgroundColor: colors.messageBg,
          padding: '12px 16px',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            position: 'relative',
            backgroundColor: colors.inputBg,
            border: `1px solid ${colors.border}`,
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: `0 1px 3px ${isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)'}`
          }}
        >
          {/* Textarea for user input */}
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            placeholder={t('askQuestion') || "Ask something about this article..."}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              padding: '12px 16px',
              maxHeight: '150px',
              minHeight: '24px',
              resize: 'none',
              backgroundColor: 'transparent',
              color: colors.text,
              fontSize: '15px',
              fontFamily: 'inherit',
              lineHeight: '1.5',
            }}
            disabled={isLoading}
          />
          
          {/* Send button */}
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              border: 'none',
              background: 'none',
              color: colors.accent,
              cursor: inputText.trim() && !isLoading ? 'pointer' : 'default',
              marginRight: '4px',
              marginBottom: '4px',
              borderRadius: '50%',
              transition: 'background-color 0.2s, opacity 0.2s',
              opacity: inputText.trim() && !isLoading ? 1 : 0.5,
              transform: 'scale(1)',
            }}
            onMouseDown={(e) => {
              if (inputText.trim() && !isLoading) {
                e.currentTarget.style.transform = 'scale(0.95)';
              }
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onMouseOver={(e) => {
              if (inputText.trim() && !isLoading) {
                e.currentTarget.style.backgroundColor = colors.chipBg;
              }
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentUI; 