import React from 'react';

const AIAvatar: React.FC = () => (
  <div style={{ 
    width: '36px', 
    height: '36px', 
    borderRadius: '50%', 
    backgroundColor: '#BB9CD8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
);

export default AIAvatar; 