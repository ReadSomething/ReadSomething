import React, { forwardRef } from 'react';
import { ChatMessage } from '../types/chat';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';

interface MessageListProps {
  messages: ChatMessage[];
  isTyping: boolean;
}

const MessageList = forwardRef<HTMLDivElement, MessageListProps>(
  ({ messages, isTyping }, ref) => {
    return (
      <div 
        ref={ref}
        style={{ 
          flex: 1, 
          overflow: 'auto', 
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        {/* Message bubbles */}
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        
        {/* Typing indicator */}
        {isTyping && <TypingIndicator />}
      </div>
    );
  }
);

MessageList.displayName = 'MessageList';

export default MessageList; 