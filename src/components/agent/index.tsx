import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useI18n } from '../../hooks/useI18n';
import { marked } from 'marked';
import llmClient from '../../utils/llmClient';
import SessionManager, { MessagePriority } from '../../utils/SessionManager';
import { Model } from '../../types/api';
import { isAuthenticated, openAuthPage } from '../../utils/auth';
import { Message, ContextType } from './types';
import { getAgentColors, applyThemeColors } from '../../config/theme';
import { StyleIsolator } from '../../content'; // Import StyleIsolator component
import { useTheme } from '../../context/ThemeContext';
import { createLogger } from '../../utils/logger';

// Create a logger instance for the agent component
const logger = createLogger('agent');

// Import components
import LoginPrompt from './LoginPrompt';
import MessageList from './MessageList';
import InputArea from './InputArea';

// Define component props
interface AgentUIProps {
  onClose?: () => void;
  isVisible: boolean;
  initialMessage?: string;
  article?: any; // Optional article context to use for the AI
  visibleContent?: string; // New prop for the content currently visible on screen
  baseFontSize: number; // New prop for base font size from reader
  baseFontFamily: string; // New prop for base font family from reader
  useStyleIsolation?: boolean; // New option to use Shadow DOM isolation
}

/**
 * Modern AgentUI component combining ReadLite, Cursor, and Claude UX elements
 * Optimized for token efficiency and mobile-friendly design
 */
const AgentUI: React.FC<AgentUIProps> = ({ 
  onClose, 
  isVisible, 
  initialMessage,
  article,
  visibleContent, // New prop for visible content
  baseFontSize, // Receive new prop
  baseFontFamily, // Receive new prop
  useStyleIsolation = true // Default to true for style isolation
}) => {
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState('');
  const [contextType, setContextType] = useState<ContextType>('screen'); // Default to screen context
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);

  // Authentication state
  const [isAuth, setIsAuth] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  // State to hold the dynamically loaded models
  const [modelsList, setModelsList] = useState<Model[]>([]);
  
  // Refs
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // Initialize session manager for context management
  const sessionManagerRef = useRef<SessionManager>(new SessionManager());
  
  // Hooks
  const { t } = useI18n();
  const { theme } = useTheme();
  
  // Define context options after t is declared
  const contextOptions = [
    { value: 'screen' as ContextType, label: t('contextTypeScreen') || 'Screen' },
    { value: 'article' as ContextType, label: t('contextTypeArticle') || 'Article' }
  ];
  
  // Apply theme colors to CSS variables for Tailwind
  useEffect(() => {
    logger.info("Theme changed:", theme);
    const colors = getAgentColors(theme);
    applyThemeColors(colors);
  }, [theme]);
  
  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsAuthLoading(true);
        const authenticated = await isAuthenticated();
        setIsAuth(authenticated);
      } catch (error) {
        logger.error("Error checking auth status:", error);
        setIsAuth(false);
      } finally {
        setIsAuthLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  // Request models from background script on mount and load selected model from localStorage
  useEffect(() => {
    // Try to load previously selected model from localStorage
    try {
      const savedModelId = localStorage.getItem('readlite_selected_model');
      if (savedModelId && modelsList.length > 0) {
        // Find model object that matches the saved model ID
        const matchedModel = modelsList.find(model => model.value === savedModelId);
        if (matchedModel) {
          logger.info(`Loaded saved model from localStorage: ${savedModelId}`);
          setSelectedModel(matchedModel);
        }
      }
    } catch (error) {
      logger.error('Error loading saved model:', error);
    }
    
    // Fetch available models list from background script
    const loadModels = (attempt = 1, maxAttempts = 3, delay = 2000) => {
      logger.info(`Loading models (attempt ${attempt}/${maxAttempts})`);
      
      chrome.runtime.sendMessage({ 
        type: 'GET_MODELS_REQUEST',
        // Force refresh on retry attempts
        forceRefresh: attempt > 1
      }, (response) => {
        if (chrome.runtime.lastError) {
          logger.error("Error requesting models:", chrome.runtime.lastError);
          retryIfNeeded(attempt, maxAttempts, delay);
          return;
        }
        
        if (response && response.success && Array.isArray(response.data)) {
          logger.info(`Received models list (${response.data.length} models, fromCache: ${response.fromCache}):`, response.data);
          
          // If we got an empty list and we're authenticated, retry
          if (response.data.length === 0 && isAuth && attempt < maxAttempts) {
            logger.info(`Empty models list while authenticated, will retry in ${delay}ms`);
            retryIfNeeded(attempt, maxAttempts, delay);
            return;
          }
          
          setModelsList(response.data);
          
          // Ensure selected model is available in the list, otherwise use default
          if (response.data.length > 0) {
            const currentDefault = response.data[0].value; // Only store ID
            const savedModelId = localStorage.getItem('readlite_selected_model');
            
            if (savedModelId && !response.data.some((m: Model) => m.value === savedModelId)) {
              logger.info(`Selected model ${savedModelId} not found in list, using default: ${currentDefault}`);
              const defaultModel = response.data[0];
              setSelectedModel(defaultModel);
              localStorage.setItem('readlite_selected_model', defaultModel.value); // Only store ID
            }
          } else {
            // Handle case when no models are available
            logger.warn('No models available from API');
            setSelectedModel(null);
          }
        } else {
          logger.error("Failed to get models from background or invalid format:", response);
          retryIfNeeded(attempt, maxAttempts, delay);
        }
      });
    };
    
    // Helper function to retry loading models if needed
    const retryIfNeeded = (attempt: number, maxAttempts: number, delay: number) => {
      if (attempt < maxAttempts) {
        logger.info(`Will retry loading models in ${delay}ms (attempt ${attempt}/${maxAttempts})`);
        setTimeout(() => {
          loadModels(attempt + 1, maxAttempts, delay);
        }, delay);
      }
    };
    
    loadModels();
  }, []);
  
  // Use useEffect to set default model when modelsList changes and selectedModel is null
  useEffect(() => {
    if (modelsList.length > 0 && selectedModel === null) {
      const savedModelId = localStorage.getItem('readlite_selected_model');
      
      if (savedModelId) {
        // Try to find the saved model in our list
        const matchedModel = modelsList.find(model => model.value === savedModelId);
        if (matchedModel) {
          logger.info(`Using saved model from localStorage: ${matchedModel.label}`);
          setSelectedModel(matchedModel);
          return;
        }
      }
      
      // If no saved model or saved model not found, use the first model as default
      logger.info(`Using default model: ${modelsList[0].label}`);
      setSelectedModel(modelsList[0]);
    }
  }, [modelsList, selectedModel]);
  
  // Set initial agent message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage = initialMessage || t('welcomeMessage') || "I'm here to help you understand what's currently visible on your screen.";
      setMessages([{
        id: 'welcome',
        sender: 'agent',
        text: welcomeMessage,
        timestamp: Date.now(),
        contextType: 'screen' // Default to screen context
      }]);
      
      // Add welcome message to session manager
      sessionManagerRef.current.addMessage({
        id: 'welcome',
        role: 'assistant',
        content: welcomeMessage,
        priority: MessagePriority.SYSTEM_INSTRUCTION,
        timestamp: Date.now()
      });
    }
  }, [initialMessage, t]);
  
  // Set article context when available - updated to use visible content
  useEffect(() => {
    if (sessionManagerRef.current) {
      if (visibleContent) {
        // Set visible content as context
        sessionManagerRef.current.setArticleContext(
          article?.title || 'Current View',
          visibleContent,
          article?.url,
          article?.language
        );
      } else if (article && article.content && article.content.length > 0) {
        // Fallback to full article if visible content not provided
        sessionManagerRef.current.setArticleContext(
          article.title || 'Untitled',
          article.content || '',
          article.url,
          article.language
        );
      }
    }
  }, [article, visibleContent]); // Update when either changes
  
  // Update context when visible content changes significantly
  useEffect(() => {
    // Skip if no visible content or not initialized
    if (!visibleContent || !sessionManagerRef.current) return;
    
    // Check if this is a significant content change
    const currentContext = sessionManagerRef.current.getArticleContextInfo();
    if (currentContext) {
      // Only update if the content is significantly different
      // This prevents unnecessary updates during small scroll changes
      const currentLength = currentContext.contentLength;
      const newLength = visibleContent.length;
      
      // Update if content length changed by more than 20%
      const changeThreshold = 0.2; // 20% change threshold
      const percentChange = Math.abs(currentLength - newLength) / Math.max(currentLength, 1);
      
      if (percentChange > changeThreshold) {
        sessionManagerRef.current.setArticleContext(
          article?.title || 'Current View',
          visibleContent,
          article?.url,
          article?.language
        );
      }
    }
  }, [visibleContent, article]);
  
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
      logger.error("Error rendering markdown:", error);
      return { __html: text };
    }
  };
  
  // Get context label
  const getContextTypeLabel = (type: ContextType): string => {
    switch(type) {
      case 'screen': return t('contextTypeScreen') || 'Screen';
      case 'article': return t('contextTypeArticle') || 'Article';
      case 'selection': return t('contextTypeSelection') || 'Selection';
      default: return t('contextTypeScreen') || 'Screen';
    }
  };
  
  // Add wrapper function to reconcile the type mismatch
  const handleSetContextType = (type: ContextType | null) => {
    if (type !== null) {
      setContextType(type);
    }
  };
  
  // Listen for model changes and save to localStorage
  useEffect(() => {
    if (selectedModel) {
      try {
        localStorage.setItem('readlite_selected_model', selectedModel.value);
        logger.info(`Saved selected model to localStorage: ${selectedModel.label}`);
      } catch (error) {
        logger.error('Error saving model to localStorage:', error);
      }
    }
  }, [selectedModel]);
  
  // Handle send message (both button click and Enter key)
  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim() || isLoading) return;
    
    // Check if user is authenticated
    if (!isAuth) {
      setError("Please log in to use the AI assistant feature.");
      return;
    }
    
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: inputText.trim(),
      timestamp: Date.now(),
      contextType // Store which context type was used
    };
    
    // Add user message to conversation UI
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    
    // Add user message to session manager with high priority
    sessionManagerRef.current.addMessage({
      id: userMessage.id,
      role: 'user', 
      content: userMessage.text,
      priority: MessagePriority.CURRENT_QUESTION,
      timestamp: userMessage.timestamp
    });
    
    // Reset height of textarea
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
    
    // Set loading state
    setIsLoading(true);
    setError(null);
    setIsThinking(true);
    setStreamingResponse('');
    
    // Ensure the right context is used
    if (contextType === 'screen' && visibleContent) {
      // Update context with latest visible content before generating response
      sessionManagerRef.current.setArticleContext(
        article?.title || 'Current View',
        visibleContent,
        article?.url,
        article?.language
      );
    } else if (contextType === 'article' && article?.content) {
      // Use the full article as context
      sessionManagerRef.current.setArticleContext(
        article.title || 'Untitled',
        article.content || '',
        article.url,
        article.language
      );
    }
    
    // Check if article context is available
    const hasArticleContext = sessionManagerRef.current.hasArticleContext();
    
    // If article context is missing, show an error
    if (!hasArticleContext) {
      let errorMessage = "No content available.";
      if (contextType === 'screen') {
        errorMessage = "No content visible on screen. Please scroll to view some content and try again.";
      } else if (contextType === 'article') {
        errorMessage = "No article content available. Please try a different article.";
      } else if (contextType === 'selection') {
        errorMessage = "No text selection available. Please select some text and try again.";
      }
      setError(errorMessage);
      setIsLoading(false);
      setIsThinking(false);
      return;
    }
    
    // Use a local variable to accumulate the complete response
    let accumulatedResponse = '';
    
    try {
      // Get optimized prompt from session manager
      const prompt = sessionManagerRef.current.buildPrompt(getSummaryInstructions());
      
      // Use appropriate model settings for API call
      const modelSettings = getModelSettings();
      
      // Use streaming API for more responsive experience
      await llmClient.generateTextStream(
        prompt,
        (chunk: string) => {
          accumulatedResponse += chunk;
          setStreamingResponse(prev => prev + chunk);
        },
        modelSettings
      );
      
      const agentMessage: Message = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        text: accumulatedResponse || "I couldn't generate a response. Please try again.",
        timestamp: Date.now(),
        contextType // Track which context was used
      };
      
      // Add agent response to conversation UI
      setMessages(prev => [...prev, agentMessage]);
      
      // Add agent response to session manager with appropriate priority
      sessionManagerRef.current.addMessage({
        id: agentMessage.id,
        role: 'assistant',
        content: agentMessage.text,
        priority: MessagePriority.RECENT_EXCHANGE,
        timestamp: agentMessage.timestamp
      });
      
      // Reset streaming response
      setStreamingResponse('');
      
    } catch (err) {
      logger.error("Error calling LLM API:", err);
      
      // Special handling for auth errors - suggest logging in again
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while generating a response';
      if (errorMessage.includes('401') || errorMessage.includes('auth') || errorMessage.includes('unauthorized')) {
        setError("Authentication error. Please log in again to continue using the AI assistant.");
        setIsAuth(false);
      } else {
        setError(errorMessage);
      }
      
      // If we have partial response but encountered an error, still show it
      if (accumulatedResponse) {
        const errorMessage: Message = {
          id: `agent-${Date.now()}`,
          sender: 'agent',
          text: accumulatedResponse + "\n\n_(Response may be incomplete due to an error)_",
          timestamp: Date.now(),
          error: true,
          contextType
        };
        
        setMessages(prev => [...prev, errorMessage]);
        
        // Also add to session manager but with lower priority
        sessionManagerRef.current.addMessage({
          id: errorMessage.id,
          role: 'assistant',
          content: errorMessage.text,
          priority: MessagePriority.HISTORICAL_EXCHANGE,
          timestamp: errorMessage.timestamp
        });
      }
    } finally {
      setIsLoading(false);
      setIsThinking(false);
    }
  }, [inputText, isLoading, article, visibleContent, contextType, isAuth, modelsList]);
  
  // Get summary instructions for the LLM
  const getSummaryInstructions = (): string => {
    return `You are an assistant that helps users understand content currently visible on their screen. Your responses should:

1. Focus primarily on the content that is currently visible in the user's viewport
2. Provide explanations, summaries, or answer questions about the visible text
3. Be clear and concise, with accurate information
4. Acknowledge when you don't have enough context (if the visible content is incomplete)
5. Adapt to the user's questions - they might ask about what they're currently reading

When responding to questions about what's visible:
- Prioritize the visible content over other context
- Be helpful even if only partial information is available
- If the user asks about something not in view, suggest they scroll to relevant sections

Respond directly to queries without meta-commentary like "Based on the visible content..."`;
  };

  
  // Clear conversation history
  const handleClearConversation = () => {
    // Clear UI messages but keep welcome message
    const welcomeMessage = messages.find(msg => msg.id === 'welcome');
    setMessages(welcomeMessage ? [welcomeMessage] : []);
    
    // Clear session manager conversation
    sessionManagerRef.current.clearConversation();
    
    // Re-add welcome message to session manager
    if (welcomeMessage) {
      sessionManagerRef.current.addMessage({
        id: welcomeMessage.id,
        role: 'assistant',
        content: welcomeMessage.text,
        priority: MessagePriority.SYSTEM_INSTRUCTION,
        timestamp: welcomeMessage.timestamp
      });
    }
  };
  
  // Trigger authentication flow
  const handleLogin = () => {
    setError(null); // Clear any previous errors
    openAuthPage();
  };
  
  // Monitor for authentication status changes via runtime messages
  useEffect(() => {
    const authChangeListener = (message: any) => {
      if (message.type === 'AUTH_STATUS_CHANGED' && message.isAuthenticated !== undefined) {
        logger.info('Authentication status changed:', message.isAuthenticated);
        setIsAuth(message.isAuthenticated);
        
        // When authentication status changes, refresh the models list with force refresh
        logger.info('Authentication status changed, refreshing models list');
        chrome.runtime.sendMessage({ 
          type: 'GET_MODELS_REQUEST',
          forceRefresh: true
        }, (response) => {
          if (chrome.runtime.lastError) {
            logger.error("Error requesting models after auth change:", chrome.runtime.lastError);
            return;
          }
          
          if (response && response.success && Array.isArray(response.data)) {
            logger.info(`Received refreshed models after auth change (${response.data.length} models):`, response.data);
            setModelsList(response.data);
            
            // Set default model if needed
            if (response.data.length > 0 && (!selectedModel || !response.data.some((m: Model) => m.value === selectedModel.value))) {
              logger.info(`Setting default model after auth change: ${response.data[0].label}`);
              setSelectedModel(response.data[0]);
              localStorage.setItem('readlite_selected_model', response.data[0].value);
            }
          }
        });
      }
    };
    
    // Add listener
    chrome.runtime.onMessage.addListener(authChangeListener);
    
    // Cleanup
    return () => {
      chrome.runtime.onMessage.removeListener(authChangeListener);
    };
  }, [selectedModel]);
  
  // Use appropriate model settings for API call
  const getModelSettings = () => {
    // If we have a selected model, use it
    if (selectedModel) {
      return {
        model: selectedModel.value,
        temperature: 0.7,
        maxTokens: 10000
      };
    }
    
    // If no selected model but we have models available, use the first one
    if (modelsList.length > 0) {
      return {
        model: modelsList[0].value,
        temperature: 0.7,
        maxTokens: 10000
      };
    }
    
    // Fallback - should rarely happen
    return {
      temperature: 0.7,
      maxTokens: 10000
    };
  };
  
  // Render the AgentUI component
  const agentContent = (
    <div className="readlite-agent-container readlite-scope flex flex-col w-full h-full bg-[var(--readlite-background)] text-[var(--readlite-text)] relative"
      style={{ 
        width: '100%',
        height: '100%',
        maxWidth: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontSize: `${baseFontSize}px`, 
        fontFamily: baseFontFamily || 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      {/* Remove the Header component since we've integrated its functionality into InputArea */}
      
      {/* Render login prompt if not authenticated */}
      {!isAuth && !isAuthLoading ? (
        <LoginPrompt onLogin={handleLogin} t={t} />
      ) : (
        <>
          {/* Main messages container */}
          <div 
            ref={messagesContainerRef}
            className="readlite-messages-container flex-grow overflow-y-auto pt-2 px-4 pb-4 bg-[var(--readlite-background)]"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: `var(--readlite-scrollbar-hover) var(--readlite-scrollbar)`
            }}
          >
            <MessageList 
              t={t}
              messages={messages} 
              isThinking={isThinking} 
              streamingResponse={streamingResponse}
              contextType={contextType}
              error={error}
              getContextTypeLabel={getContextTypeLabel}
              renderMarkdown={renderMarkdown}
              isLoading={isLoading}
              isError={!!error}
              errorMessage={error}
              retry={() => handleSendMessage()}
            />
          </div>
          
          {/* Input area - now includes close button and toolbar controls */}
          <InputArea
            t={t}
            inputText={inputText}
            setInputText={setInputText}
            isLoading={isLoading || isThinking}
            isProcessing={isProcessing}
            onSendMessage={handleSendMessage}
            disableSend={isLoading || inputText.trim() === ''}
            contextType={contextType}
            setContextType={handleSetContextType}
            contextOptions={contextOptions}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            availableModels={modelsList}
            isAuth={isAuth}
            onClearConversation={handleClearConversation}
            onLogin={handleLogin}
            onClose={onClose}
          />
        </>
      )}
    </div>
  );
  
  // Return the component, wrapped in StyleIsolator if requested
  return useStyleIsolation ? (
    <StyleIsolator fitContent={true}>{agentContent}</StyleIsolator>
  ) : agentContent;
};

export default AgentUI; 