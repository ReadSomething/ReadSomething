import React from 'react';
import { 
  ChatBubbleLeftRightIcon, 
  ArrowDownTrayIcon, 
  Cog6ToothIcon, 
  XMarkIcon 
} from '@heroicons/react/24/outline';
import { ArrowsPointingInIcon, ArrowsPointingOutIcon } from '@heroicons/react/24/outline';

interface ReaderSettings {
  // Define specific settings properties here based on actual usage
  theme?: string;
  fontSize?: number;
  // Add other settings as needed
}

interface ReaderToolbarProps {
  showAgent: boolean;
  leftPanelWidth: number;
  toggleAgent: () => void;
  handleMarkdownDownload: () => void;
  toggleSettings: () => void;
  handleClose: () => void;
  toggleFullscreen: () => void;
  isFullscreen: boolean;
  settingsButtonRef: React.RefObject<HTMLButtonElement>;
  showSettings: boolean;
  isDragging?: boolean;
  t: (key: string) => string;
}

/**
 * Toolbar component with control buttons for the reader
 */
const ReaderToolbar: React.FC<ReaderToolbarProps> = ({
  showAgent,
  leftPanelWidth,
  toggleAgent,
  handleMarkdownDownload,
  toggleSettings,
  handleClose,
  toggleFullscreen,
  isFullscreen,
  settingsButtonRef,
  showSettings,
  isDragging = false,
  t,
}) => {
  // Calculate right position based on panel width
  const rightPosition = showAgent ? `calc(${100 - leftPanelWidth}% + 20px)` : '20px';
  
  return (
    <div
      className={`fixed top-5 flex gap-2 p-2 border z-[2000] bg-primary/80 rounded-md shadow-lg backdrop-blur-md
        ${isDragging ? '' : 'transition-all duration-300 ease-in-out'}`}
      style={{ right: rightPosition }}
    >

      {/* Agent Button */}
      <ToolbarButton 
        onClick={toggleAgent}
        title={t('agent')}
        isActive={showAgent}
      >
        <ChatBubbleLeftRightIcon className="w-5 h-5" />
      </ToolbarButton>
      
      {/* Save as Markdown Button */}
      <ToolbarButton
        onClick={handleMarkdownDownload}
        title={t('download')}
      >
        <ArrowDownTrayIcon className="w-5 h-5" />
      </ToolbarButton>
      
      {/* Fullscreen Button */}
      <ToolbarButton
        onClick={toggleFullscreen}
        title={t('fullscreen')}
        isActive={isFullscreen}
      >
        {isFullscreen ? (
          <ArrowsPointingInIcon className="w-5 h-5" />
        ) : (
          <ArrowsPointingOutIcon className="w-5 h-5" />
        )}
      </ToolbarButton>
      
      {/* Settings Button */}
      <ToolbarButton
        buttonRef={settingsButtonRef}
        onClick={toggleSettings}
        title={t('settings')}
        isActive={showSettings}
      >
        <Cog6ToothIcon className="w-5 h-5" />
      </ToolbarButton>
      
      {/* Close Reader Button */}
      <ToolbarButton
        onClick={handleClose}
        title={t('close')}
      >
        <XMarkIcon className="w-5 h-5" />
      </ToolbarButton>
    </div>
  );
};

// Toolbar Button Component to reduce redundancy
interface ToolbarButtonProps {
  onClick: () => void;
  title: string;
  isActive?: boolean;
  children: React.ReactNode;
  buttonRef?: React.RefObject<HTMLButtonElement>;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ 
  onClick, 
  title, 
  isActive = false, 
  children,
  buttonRef 
}) => {
  return (
    <button
      ref={buttonRef}
      className={`w-8 h-8 flex items-center justify-center cursor-pointer border-none rounded-md transition-all duration-150 ease-in-out
        ${isActive 
          ? 'bg-accent/10 text-accent shadow-sm' 
          : 'bg-transparent text-primary/70 hover:bg-primary/5 hover:text-primary'
        }`}
      onClick={onClick}
      title={title}
    >
      <div className="w-5 h-5 flex items-center justify-center">
        {children}
      </div>
    </button>
  );
};

export default ReaderToolbar; 