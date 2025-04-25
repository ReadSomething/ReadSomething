import React, { useState } from 'react';
import { Message, ContextType } from './types';
import { useTheme } from '../../context/ThemeContext';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface MessageBubbleProps {
  message: Message;
  t: (key: string) => string;
  getContextTypeLabel: (type: ContextType) => string;
  renderMarkdown: (text: string) => { __html: string };
}

// Import or create QuoteIcon if not available
const QuoteIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M7.5 7h3.75m-3.75 3h3.75m3-6H18m-3.75 3H18m-3.75 3H18M4.5 19.5h15a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5h-15A1.5 1.5 0 0 0 3 6v12a1.5 1.5 0 0 0 1.5 1.5Z" />
  </svg>
);

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  t,
  getContextTypeLabel,
  renderMarkdown
}) => {
  const isUser = message.sender === 'user';
  const [isReferenceExpanded, setIsReferenceExpanded] = useState(true);
  
  // Toggle reference visibility
  const toggleReference = () => {
    setIsReferenceExpanded(!isReferenceExpanded);
  };
  
  // Common prose and text styling classes
  const markdownClasses = "readlite-agent-markdown-content prose prose-xs max-w-none text-text-primary " +
    "prose-headings:text-text-primary prose-pre:bg-bg-primary/10 prose-pre:p-2 " +
    "prose-pre:rounded-md prose-pre:text-xs prose-code:text-xs prose-code:bg-bg-primary/10 " +
    "prose-code:px-1 prose-code:py-0.5 prose-code:rounded-sm prose-a:text-accent " +
    "prose-a:no-underline hover:prose-a:underline text-base leading-relaxed " +
    "font-[system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI','PingFang_SC','Hiragino_Sans_GB','Microsoft_YaHei',sans-serif] antialiased";
  
  // Should show reference block
  const shouldShowReference = 
    !isUser && 
    message.contextType === 'selection' && 
    message.reference && 
    message.reference.trim().length > 0;
  
  return (
    <div className={`flex py-1.5 ${isUser ? 'justify-end px-2.5' : 'justify-start pl-0 pr-4'}`}>
      <div className={`flex flex-col ${isUser ? 'items-end max-w-[85%]' : 'items-start max-w-[92%]'}`}>
        {!isUser && message.contextType ? (
          <div className={`readlite-agent-message-content shadow-sm rounded-[16px_16px_16px_4px] p-[10px_14px] 
                           bg-bg-agent text-text-agent border border-border`}>
            {/* Context badge integrated with message */}
            <div className="text-xs text-text-secondary flex items-center mb-1">
              <span>@</span>
              <span className="ml-0.5">{getContextTypeLabel(message.contextType)}</span>
            </div>
            
            {/* Reference block for selections */}
            {shouldShowReference && (
              <div className="mb-2">
                <div 
                  className="flex items-center text-xs text-text-secondary mb-1 cursor-pointer hover:text-accent"
                  onClick={toggleReference}
                >
                  <QuoteIcon className="w-3.5 h-3.5 mr-1" />
                  <span>{t('selectedText') || 'Selected Text'}</span>
                  {isReferenceExpanded ? 
                    <ChevronUpIcon className="w-3.5 h-3.5 ml-1" /> : 
                    <ChevronDownIcon className="w-3.5 h-3.5 ml-1" />
                  }
                </div>
                
                {isReferenceExpanded && (
                  <div className="pl-2 border-l-2 border-accent/30 py-1 pr-2 text-sm bg-bg-primary/5 rounded-r-md italic text-text-secondary/50 my-1">
                    {message.reference}
                  </div>
                )}
              </div>
            )}
            
            <div 
              className={markdownClasses}
              dangerouslySetInnerHTML={renderMarkdown(message.text)}
            />
          </div>
        ) : !isUser ? (
          <div className="readlite-agent-message-content shadow-sm rounded-[16px_16px_16px_4px] p-[10px_14px] 
                          bg-bg-agent text-text-agent border border-border">
            <div 
              className={markdownClasses}
              dangerouslySetInnerHTML={renderMarkdown(message.text)}
            />
          </div>
        ) : (
          <div className={`readlite-agent-message-content shadow-sm rounded-[16px_16px_4px_16px] p-[10px_14px] 
                           bg-bg-user text-text-user ${markdownClasses}`}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble; 