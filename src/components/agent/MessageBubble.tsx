import React from 'react';
import { Message, ContextType } from './types';
import { useTheme } from '../../context/ThemeContext';

interface MessageBubbleProps {
  message: Message;
  t: (key: string) => string;
  getContextTypeLabel: (type: ContextType) => string;
  renderMarkdown: (text: string) => { __html: string };
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  t,
  getContextTypeLabel,
  renderMarkdown
}) => {
  const isUser = message.sender === 'user';
  
  // Common prose and text styling classes
  const markdownClasses = "readlite-agent-markdown-content prose prose-xs max-w-none text-text-primary " +
    "prose-headings:text-text-primary prose-pre:bg-bg-primary/10 prose-pre:p-2 " +
    "prose-pre:rounded-md prose-pre:text-xs prose-code:text-xs prose-code:bg-bg-primary/10 " +
    "prose-code:px-1 prose-code:py-0.5 prose-code:rounded-sm prose-a:text-accent " +
    "prose-a:no-underline hover:prose-a:underline text-base leading-relaxed " +
    "font-[system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI','PingFang_SC','Hiragino_Sans_GB','Microsoft_YaHei',sans-serif] antialiased";
  
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