import React from 'react';
import { createRoot } from 'react-dom/client';
import ChatInterface from './components/ChatInterface';
import './sidepanel.css';

// Main entry point for the side panel
const SidePanel: React.FC = () => {
  return (
    <div className="sidepanel-container" style={{
      width: '100%',
      height: '100vh',
      overflow: 'hidden'
    }}>
      <ChatInterface />
    </div>
  );
};

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const appContainer = document.getElementById('app');
  
  if (appContainer) {
    // Clear any existing content first
    appContainer.innerHTML = '';
    
    const root = createRoot(appContainer);
    root.render(<SidePanel />);
  } else {
    console.error('App container not found');
  }
});

export default SidePanel; 