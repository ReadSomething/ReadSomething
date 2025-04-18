import React, { useState } from 'react';
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
  const { getAgentColors } = useTheme();
  const agentColors = getAgentColors();
  
  // Get the message style using theme colors
  const getMessageStyle = () => {
    if (isUser) {
      return {
        backgroundColor: agentColors.userBubble,
        color: agentColors.textUser,
        borderRadius: '16px 16px 4px 16px',
        padding: '10px 14px',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
      };
    } else {
      // Agent message style
      return {
        backgroundColor: agentColors.agentBubble,
        color: agentColors.textAgent,
        borderRadius: '16px 16px 16px 4px',
        padding: '10px 14px',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
        border: `1px solid ${agentColors.border}`
      };
    }
  };
  
  return (
    <div 
      className={`readlite-message-bubble flex ${isUser ? 'justify-end' : 'justify-start'} ${isUser ? 'px-2.5' : 'pl-0 pr-4'} py-1.5`}
    >
      <div 
        className={`readlite-message-wrapper ${isUser ? 'items-end' : 'items-start'} flex flex-col ${isUser ? 'max-w-[85%]' : 'max-w-[92%]'}`}
      >
        {!isUser && message.contextType && (
          <div className="readlite-message-content" style={getMessageStyle()}>
            {/* Context badge integrated with message */}
            <div className="readlite-context-badge text-[12px] text-[var(--readlite-text-secondary)] flex items-center mb-1">
              <span>@</span>
              <span className="ml-0.5">{getContextTypeLabel(message.contextType)}</span>
            </div>
            
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
              dangerouslySetInnerHTML={renderMarkdown(message.text)}
            />
          </div>
        )}
        
        {!isUser && !message.contextType && (
          <div className="readlite-message-content" style={getMessageStyle()}>
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
              dangerouslySetInnerHTML={renderMarkdown(message.text)}
            />
          </div>
        )}
        
        {isUser && (
          <div 
            className="readlite-message-content text-[var(--readlite-text)] text-base font-[system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI','PingFang_SC','Hiragino_Sans_GB','Microsoft_YaHei',sans-serif]" 
            style={{ 
              ...getMessageStyle(),
              fontFeatureSettings: "'tnum' on, 'lnum' on",
              textRendering: "optimizeLegibility",
              WebkitFontSmoothing: "antialiased",
              MozOsxFontSmoothing: "grayscale",
              fontSize: "16px",
              lineHeight: "1.5"
            }}
          >
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble; 