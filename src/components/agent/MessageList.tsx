import React, { useRef, useEffect, Fragment, useCallback } from 'react';
import { CommonProps, Message, ContextType } from './types';
import MessageBubble from './MessageBubble';
import ThinkingIndicator from './ThinkingIndicator';
import { useTheme } from '../../context/ThemeContext';

interface MessageListProps extends Pick<CommonProps, 't'> {
  messages: Message[];
  streamingResponse: string;
  isThinking: boolean;
  contextType: ContextType;
  error: string | null;
  getContextTypeLabel: (type: ContextType) => string;
  renderMarkdown: (text: string) => { __html: string };
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  retry: () => void;
  lastMessageRef?: React.RefObject<HTMLDivElement>;
}

const MessageList: React.FC<MessageListProps> = ({
  t,
  messages,
  streamingResponse,
  isThinking,
  contextType,
  error,
  getContextTypeLabel,
  renderMarkdown,
  isLoading,
  isError,
  errorMessage,
  retry,
  lastMessageRef
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { getAgentColors } = useTheme();
  const agentColors = getAgentColors();
  
  // Auto scroll to the bottom of the message list
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
  }, []);
  
  // Auto scroll when messages update or there is streaming response
  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingResponse, scrollToBottom]);
  
  // Smart grouping of messages for better visual continuity
  const getGroupedMessages = (messages: Message[]) => {
    const grouped: Message[][] = [];
    let currentGroup: Message[] = [];
    let currentSender = '';
    
    messages.forEach((message, index) => {
      // If it's a new sender or more than 5 minutes since the last message, create a new group
      if (message.sender !== currentSender || 
          (index > 0 && message.timestamp - messages[index-1].timestamp > 5 * 60 * 1000)) {
        if (currentGroup.length > 0) {
          grouped.push([...currentGroup]);
          currentGroup = [];
        }
        currentSender = message.sender;
      }
      
      currentGroup.push(message);
    });
    
    if (currentGroup.length > 0) {
      grouped.push(currentGroup);
    }
    
    return grouped;
  };
  
  // Get grouped messages
  const groupedMessages = getGroupedMessages(messages);

  return (
    <div 
      ref={containerRef}
      className="readlite-messages-container flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-thumb-[var(--readlite-scrollbar)] scrollbar-track-transparent scroll-pt-4"
      style={{ overscrollBehavior: 'contain' }}
    >
      {messages.length === 0 && !streamingResponse && !isThinking && !error && !isLoading && !isError ? (
        <div className="readlite-empty-state flex flex-col items-center justify-center h-full text-center p-6 font-[system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI','PingFang_SC','Hiragino_Sans_GB','Microsoft_YaHei',sans-serif]" style={{ WebkitFontSmoothing: "antialiased", MozOsxFontSmoothing: "grayscale" }}>
          <div className="readlite-empty-icon mb-4 text-[var(--readlite-text-secondary)]/30">
            <svg className="w-16 h-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div className="readlite-empty-title text-base font-medium text-[var(--readlite-text)]">
            {t('startConversation') || 'Start a new conversation'}
          </div>
          <p className="readlite-empty-description text-base text-[var(--readlite-text-secondary)] mt-2 max-w-xs" style={{ fontSize: "16px", lineHeight: "1.5" }}>
            {t('emptyStateDescription') || 'Select a context mode and ask any question to start the conversation.'}
          </p>
        </div>
      ) : (
        <div className="readlite-message-groups space-y-6">
          {/* Display message groups */}
          {groupedMessages.map((group, groupIndex) => (
            <div key={`group-${groupIndex}`} className="readlite-message-group space-y-1">
              {group.map((message, index) => (
                <div 
                  key={message.id || `${groupIndex}-${index}`} 
                  ref={index === group.length - 1 && groupIndex === groupedMessages.length - 1 && lastMessageRef ? lastMessageRef : null}
                >
                  <MessageBubble
                    t={t}
                    message={message}
                    getContextTypeLabel={getContextTypeLabel}
                    renderMarkdown={renderMarkdown}
                  />
                </div>
              ))}
            </div>
          ))}
          
          {/* Streaming response message */}
          {streamingResponse && (
            <div className="readlite-message-bubble readlite-agent-message flex flex-col items-start pl-0 pr-4 py-1.5 mb-1.5">
              {/* Context badge - modified to be smaller and integrated with the message */}
              <div className="readlite-message-content relative max-w-[92%] transition-all" 
                style={{
                  backgroundColor: agentColors.agentBubble,
                  color: agentColors.textAgent,
                  borderRadius: '16px 16px 16px 4px',
                  padding: '10px 14px',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                  border: `1px solid ${agentColors.border}`
                }}
              >
                <div className="readlite-context-badge text-[12px] text-[var(--readlite-text-secondary)] flex items-center mb-1">
                  <span>@</span>
                  <span className="ml-0.5">{getContextTypeLabel(contextType)}</span>
                </div>
                
                {/* Streaming response content */}
                <div
                  className="readlite-markdown-content prose prose-xs max-w-none text-[var(--readlite-text)] prose-headings:text-[var(--readlite-text)] prose-pre:bg-[var(--readlite-background)]/10 prose-pre:p-2 prose-pre:rounded-md prose-pre:text-xs prose-code:text-xs prose-code:bg-[var(--readlite-background)]/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded-sm prose-a:text-[var(--readlite-accent)] prose-a:no-underline hover:prose-a:underline text-base leading-relaxed font-[system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI','PingFang_SC','Hiragino_Sans_GB','Microsoft_YaHei',sans-serif]"
                  style={{ 
                    fontFeatureSettings: "'tnum' on, 'lnum' on",
                    textRendering: "optimizeLegibility",
                    WebkitFontSmoothing: "antialiased",
                    MozOsxFontSmoothing: "grayscale",
                    fontSize: "16px",
                    lineHeight: "1.5"
                  }}
                  dangerouslySetInnerHTML={renderMarkdown(streamingResponse)}
                />
                {isThinking && (
                  <span className="readlite-cursor-blink inline-block w-0.5 h-4 bg-[var(--readlite-text-secondary)]/50 ml-0.5 align-text-bottom animate-blink"></span>
                )}
              </div>
            </div>
          )}
          
          {/* Thinking indicator */}
          {isThinking && !streamingResponse && (
            <ThinkingIndicator t={t} />
          )}
          
          {/* Error message */}
          {isError && (
            <div className="readlite-error-message flex flex-col items-start px-2.5 py-1.5">
              <div className="readlite-error-container bg-[var(--readlite-background)] text-[var(--readlite-error)] px-4 py-3 rounded-2xl text-base max-w-[92%] shadow-sm ring-1 ring-[var(--readlite-error)]/20 backdrop-blur-[2px] font-[system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI','PingFang_SC','Hiragino_Sans_GB','Microsoft_YaHei',sans-serif]" style={{ WebkitFontSmoothing: "antialiased", MozOsxFontSmoothing: "grayscale", fontSize: "16px", lineHeight: "1.5" }}>
                <div className="readlite-error-title font-medium mb-2 flex items-center">
                  <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {t('errorOccurred') || 'An error occurred'}
                </div>
                <div className="readlite-error-description text-sm text-[var(--readlite-text-secondary)]" style={{ fontSize: "14px", lineHeight: "1.5" }}>
                  {errorMessage || (t('errorMessage') || 'Unable to complete the request. Please try again later.')}
                </div>
                <button 
                  onClick={retry}
                  className="readlite-retry-button mt-3 text-sm bg-[var(--readlite-accent)]/10 text-[var(--readlite-accent)] px-3 py-1 rounded-full hover:bg-[var(--readlite-accent)]/15 transition-colors font-medium"
                  style={{ fontSize: "14px" }}
                >
                  {t('retry') || 'Retry'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Reference element for auto-scrolling to bottom */}
      <div ref={messagesEndRef} className="h-px" />
    </div>
  );
};

export default MessageList; 