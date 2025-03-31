import React from 'react';
import { ModelOption } from '../config/model';
import ModelSelector from './ModelSelector';

interface ChatInputProps {
  inputMessage: string;
  selectedModel: ModelOption;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onSend: () => void;
  onModelChange: (model: ModelOption) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  inputMessage,
  selectedModel,
  onInputChange,
  onKeyPress,
  onSend,
  onModelChange,
}) => {
  return (
    <div style={{ 
      borderTop: '1px solid #eee',
      padding: '10px 12px',
      display: 'flex',
      alignItems: 'center',
      backgroundColor: '#fafafa'
    }}>
      {/* Model selector */}
      <div style={{ marginRight: '8px' }}>
        <ModelSelector selectedModel={selectedModel} onChange={onModelChange} />
      </div>
      
      {/* Input and send button */}
      <div style={{ 
        flex: 1,
        display: 'flex',
        backgroundColor: 'white',
        border: '1px solid #eee',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        <input 
          type="text"
          value={inputMessage}
          onChange={onInputChange}
          onKeyPress={onKeyPress}
          placeholder="Type a message..."
          style={{
            flex: 1,
            border: 'none',
            padding: '10px 12px',
            fontSize: '14px',
            outline: 'none'
          }}
        />
        
        <button
          onClick={onSend}
          disabled={!inputMessage.trim()}
          style={{
            background: inputMessage.trim() ? '#BB9CD8' : '#e0e0e0',
            border: 'none',
            padding: '0 15px',
            color: 'white',
            cursor: inputMessage.trim() ? 'pointer' : 'default',
            transition: 'background-color 0.2s'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ChatInput; 