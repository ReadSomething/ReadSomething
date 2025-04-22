import React, { useState, useRef, useEffect } from 'react';
import { HighlightColor } from '../../hooks/useTextSelection';
import { useTheme } from '../../context/ThemeContext';
import { themeTokens } from '../../config/theme';

interface TextSelectionToolbarProps {
  isVisible: boolean;
  selectionRect: DOMRect | null;
  onHighlight: (color: HighlightColor) => void;
  onClose: () => void;
}

// Define a more extensive type for highlight colors with proper names
interface HighlightColorOption {
  color: HighlightColor; 
  name: string;
  description: string;
}

const TextSelectionToolbar: React.FC<TextSelectionToolbarProps> = ({
  isVisible,
  selectionRect,
  onHighlight,
  onClose
}) => {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark' | 'eyecare' | 'custom'>('light');
  
  const { theme } = useTheme();

  // Check for dark mode on mount and when theme changes
  useEffect(() => {
    const checkDarkMode = () => {
      const html = document.documentElement;
      const isDark = html.getAttribute('data-theme') === 'dark';
      setIsDarkMode(isDark);
    };
    
    checkDarkMode();
    
    // Listen for theme changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
    
    return () => observer.disconnect();
  }, []);

  // Update current theme when it changes
  useEffect(() => {
    const updateTheme = () => {
      const theme = document.documentElement.getAttribute('data-theme') as 'light' | 'dark' | 'eyecare' | 'custom';
      if (theme) {
        setCurrentTheme(theme);
      }
    };
    
    updateTheme();
    
    // Listen for theme changes
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
    
    return () => observer.disconnect();
  }, []);

  // Enhanced highlight color scheme with sophisticated colors
  const highlightColors: HighlightColorOption[] = [
    { 
      color: 'beige', 
      name: 'beige', 
      description: 'warm and soft, suitable for long-term reading, comfortable on the eyes, not easy to fatigue',
    },
    { 
      color: 'cyan', 
      name: 'cyan', 
      description: 'clear and easy to distinguish, suitable for marking concepts and definitions',
    },
    { 
      color: 'lavender', 
      name: 'lavender', 
      description: 'elegant and conspicuous, suitable for important points',
    },
    { 
      color: 'olive', 
      name: 'olive', 
      description: 'natural and peaceful, suitable for auxiliary information',
    },
    { 
      color: 'peach', 
      name: 'peach', 
      description: 'warm and lively, suitable for personal insights',
    }
  ];

  // If toolbar is not visible to user, don't render
  if (!isVisible || !selectionRect) {
    return null;
  }

  // Calculate toolbar position, prioritize showing below and to the left of the selection, ensure it's within viewport
  const calculatePosition = () => {
    if (!selectionRect) return { top: 0, left: 0 };

    const toolbarWidth = 300; // Increased width for text labels
    const toolbarHeight = 48; // Increased height for buttons with text
    const spacing = 8; // Increased spacing for better visual separation

    // Get viewport width and height
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Center the toolbar horizontally relative to the selection
    let left = selectionRect.left + (selectionRect.width / 2) - (toolbarWidth / 2);
    let top = selectionRect.bottom + spacing;

    // Boundary checks
    // 1. Check bottom boundary
    if (top + toolbarHeight > viewportHeight - spacing) {
      // If bottom space is insufficient, try placing above selection
      top = selectionRect.top - toolbarHeight - spacing;

      // Check top boundary
      if (top < spacing) {
        // Fallback: place at top of viewport with minimum spacing
        top = spacing;
      }
    }

    // 2. Check horizontal boundaries
    if (left + toolbarWidth > viewportWidth - spacing) {
      // Right overflow: align right edge with viewport
      left = viewportWidth - toolbarWidth - spacing;
    }

    if (left < spacing) {
      // Left overflow: align left edge with viewport
      left = spacing;
    }

    return { top, left };
  };

  const position = calculatePosition();

  // Handle clicking outside to close toolbar
  useEffect(() => {
    if (!toolbarRef.current) return;
    
    const doc = toolbarRef.current.ownerDocument || document;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
    };

    doc.addEventListener('mousedown', handleClickOutside);
    return () => {
      doc.removeEventListener('mousedown', handleClickOutside);
    };
  }, [toolbarRef.current]);

  return (
    <div
      ref={toolbarRef}
      className={`readlite-selection-toolbar fixed z-[10000] flex items-center p-[6px_8px] rounded-lg shadow-lg 
                  bg-primary/95 border-border border backdrop-blur-md pointer-events-auto max-w-[95%] 
                  animate-toolbarFadeIn`}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      {/* Highlight button with text */}
      <div className="relative">
        <ToolbarButton
          onClick={() => setShowColorPicker(!showColorPicker)}
          title="Highlight text"
          label="高亮"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary">
            <path d="M8 18L2 12L8 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M22 18H10C7.79086 18 6 16.2091 6 14V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </ToolbarButton>

        {/* Enhanced color picker shown above */}
        {showColorPicker && (
          <div 
            className="absolute top-[-58px] left-1/2 transform -translate-x-1/2 flex p-2 rounded-lg 
                      bg-primary/95 border-border border shadow-lg z-[1001] animate-colorPickerFadeIn"
          >
            {highlightColors.map((item) => {
              // 直接使用themeTokens中的颜色
              const highlightColor = themeTokens[theme].highlight[item.color as keyof typeof themeTokens[typeof theme]['highlight']];
              
              // 添加边框以增加可见性
              let borderColor = 'rgba(0,0,0,0.1)';
              if (theme === 'dark') {
                borderColor = 'rgba(255,255,255,0.2)';
              }
              
              return (
                <button
                  key={item.color}
                  onClick={() => {
                    onHighlight(item.color);
                    setShowColorPicker(false);
                  }}
                  className="w-7 h-7 border border-solid rounded-full mx-1 cursor-pointer
                             transition-all duration-150 hover:scale-110 hover:shadow-md"
                  style={{
                    backgroundColor: highlightColor,
                    borderColor
                  }}
                  title={`${item.name}: ${item.description}`}
                  aria-label={`Highlight with ${item.name}: ${item.description}`}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Copy button with text */}
      <ToolbarButton
        onClick={() => {
          const selection = window.getSelection();
          if (selection) {
            navigator.clipboard.writeText(selection.toString());
            alert('Copied to clipboard');
          }
        }}
        title="Copy text"
        label="复制"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary">
          <path d="M8 4V16C8 16.5304 8.21071 17.0391 8.58579 17.4142C8.96086 17.7893 9.46957 18 10 18H18C18.5304 18 19.0391 17.7893 19.4142 17.4142C19.7893 17.0391 20 16.5304 20 16V7.242C20 6.97556 19.9467 6.71181 19.8433 6.46624C19.7399 6.22068 19.5885 5.99824 19.398 5.812L16.188 2.602C16.0018 2.41146 15.7793 2.26006 15.5338 2.15665C15.2882 2.05324 15.0244 2.00001 14.758 2H10C9.46957 2 8.96086 2.21071 8.58579 2.58579C8.21071 2.96086 8 3.46957 8 4V4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M16 18V20C16 20.5304 15.7893 21.0391 15.4142 21.4142C15.0391 21.7893 14.5304 22 14 22H6C5.46957 22 4.96086 21.7893 4.58579 21.4142C4.21071 21.0391 4 20.5304 4 20V8C4 7.46957 4.21071 6.96086 4.58579 6.58579C4.96086 6.21071 5.46957 6 6 6H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </ToolbarButton>

      {/* Remove highlight button with text */}
      <ToolbarButton
        onClick={() => {
          // TODO: Implement remove highlight functionality
          alert('Remove highlight functionality coming soon!');
        }}
        title="Remove highlight"
        label="删除"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary">
          <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </ToolbarButton>

      {/* Note button with text */}
      <ToolbarButton
        onClick={() => {
          // TODO: Implement note functionality
          alert('Note functionality coming soon!');
        }}
        title="Add note"
        label="笔记"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary">
          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="currentColor"/>
          <path d="M13 7H11V13H17V11H13V7Z" fill="currentColor"/>
        </svg>
      </ToolbarButton>

      {/* AI assistant button with text */}
      <ToolbarButton
        onClick={() => {
          // TODO: Implement AI functionality
          alert('AI functionality coming soon!');
        }}
        title="AI assistant"
        label="AI助手"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary">
          <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.258 9.77251 19.9887C9.5799 19.7194 9.31074 19.5143 9 19.4C8.69838 19.2669 8.36381 19.2272 8.03941 19.286C7.71502 19.3448 7.41568 19.4995 7.18 19.73L7.12 19.79C6.93425 19.976 6.71368 20.1235 6.47088 20.2241C6.22808 20.3248 5.96783 20.3766 5.705 20.3766C5.44217 20.3766 5.18192 20.3248 4.93912 20.2241C4.69632 20.1235 4.47575 19.976 4.29 19.79C4.10405 19.6043 3.95653 19.3837 3.85588 19.1409C3.75523 18.8981 3.70343 18.6378 3.70343 18.375C3.70343 18.1122 3.75523 17.8519 3.85588 17.6091C3.95653 17.3663 4.10405 17.1457 4.29 16.96L4.35 16.9C4.58054 16.6643 4.73519 16.365 4.794 16.0406C4.85282 15.7162 4.81312 15.3816 4.68 15.08C4.55324 14.7842 4.34276 14.532 4.07447 14.3543C3.80618 14.1766 3.49179 14.0813 3.17 14.08H3C2.46957 14.08 1.96086 13.8693 1.58579 13.4942C1.21071 13.1191 1 12.6104 1 12.08C1 11.5496 1.21071 11.0409 1.58579 10.6658C1.96086 10.2907 2.46957 10.08 3 10.08H3.09C3.42099 10.0723 3.742 9.96512 4.0113 9.77251C4.28059 9.5799 4.48572 9.31074 4.6 9C4.73312 8.69838 4.77282 8.36381 4.714 8.03941C4.65519 7.71502 4.50054 7.41568 4.27 7.18L4.21 7.12C4.02405 6.93425 3.87653 6.71368 3.77588 6.47088C3.67523 6.22808 3.62343 5.96783 3.62343 5.705C3.62343 5.44217 3.67523 5.18192 3.77588 4.93912C3.87653 4.69632 4.02405 4.47575 4.21 4.29C4.39575 4.10405 4.61632 3.95653 4.85912 3.85588C5.10192 3.75523 5.36217 3.70343 5.625 3.70343C5.88783 3.70343 6.14808 3.75523 6.39088 3.85588C6.63368 3.95653 6.85425 4.10405 7.04 4.29L7.1 4.35C7.33568 4.58054 7.63502 4.73519 7.95941 4.794C8.28381 4.85282 8.61838 4.81312 8.92 4.68H9C9.29577 4.55324 9.54802 4.34276 9.72569 4.07447C9.90337 3.80618 9.99872 3.49179 10 3.17V3C10 2.46957 10.2107 1.96086 10.5858 1.58579C10.9609 1.21071 11.4696 1 12 1C12.5304 1 13.0391 1.21071 13.4142 1.58579C13.7893 1.96086 14 2.46957 14 3V3.09C14.0013 3.41179 14.0966 3.72618 14.2743 3.99447C14.452 4.26276 14.7042 4.47324 15 4.6C15.3016 4.73312 15.6362 4.77282 15.9606 4.714C16.285 4.65519 16.5843 4.50054 16.82 4.27L16.88 4.21C17.0657 4.02405 17.2863 3.87653 17.5291 3.77588C17.7719 3.67523 18.0322 3.62343 18.295 3.62343C18.5578 3.62343 18.8181 3.67523 19.0609 3.77588C19.3037 3.87653 19.5243 4.02405 19.71 4.21C19.896 4.39575 20.0435 4.61632 20.1441 4.85912C20.2448 5.10192 20.2966 5.36217 20.2966 5.625C20.2966 5.88783 20.2448 6.14808 20.1441 6.39088C20.0435 6.63368 19.896 6.85425 19.71 7.04L19.65 7.1C19.4195 7.33568 19.2648 7.63502 19.206 7.95941C19.1472 8.28381 19.1869 8.61838 19.32 8.92V9C19.4468 9.29577 19.6572 9.54802 19.9255 9.72569C20.1938 9.90337 20.5082 9.99872 20.83 10H21C21.5304 10 22.0391 10.2107 22.4142 10.5858C22.7893 10.9609 23 11.4696 23 12C23 12.5304 22.7893 13.0391 22.4142 13.4142C22.0391 13.7893 21.5304 14 21 14H20.91C20.5882 14.0013 20.2738 14.0966 20.0055 14.2743C19.7372 14.452 19.5268 14.7042 19.4 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </ToolbarButton>
    </div>
  );
};

// Reusable toolbar button component
interface ToolbarButtonProps {
  onClick: () => void;
  title: string;
  label: string;
  children: React.ReactNode;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ onClick, title, label, children }) => {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center bg-transparent border-none rounded-md p-[6px_4px] m-0 mx-1 cursor-pointer 
                transition-colors duration-150 min-w-[52px] text-primary/75 hover:bg-primary/10"
      title={title}
    >
      {children}
      <span className="text-[11px] mt-1 font-medium text-center">{label}</span>
    </button>
  );
};

export default TextSelectionToolbar; 