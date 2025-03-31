import React from 'react';
import AIAvatar from './AIAvatar';

const TypingIndicator: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', marginTop: '8px' }}>
    <div style={{ marginRight: '8px' }}>
      <AIAvatar />
    </div>
    <div
      style={{
        backgroundColor: '#f9f9f9',
        padding: '8px 16px',
        borderRadius: '18px',
        color: '#666',
        fontSize: '14px'
      }}
    >
      AI is thinking...
    </div>
  </div>
);

export default TypingIndicator;
