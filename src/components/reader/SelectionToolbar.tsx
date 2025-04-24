import React, { useState, useRef, useEffect } from 'react';
import { HighlightColor } from '../../hooks/useTextSelection';
import { useTheme } from '../../context/ThemeContext';
import { useI18n } from '../../context/I18nContext';
import { PencilIcon, DocumentTextIcon, SparklesIcon, XMarkIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';

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
  value: string; // The actual color value
}

const SelectionToolbar: React.FC<TextSelectionToolbarProps> = ({
  isVisible,
  selectionRect,
  onHighlight,
  onClose
}) => {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  
  const { theme } = useTheme();
  const { t } = useI18n(); // Get translation function

  // Enhanced highlight color scheme with sophisticated colors
  const highlightColors: HighlightColorOption[] = [
    {
      color: 'beige',
      name: 'beige',
      description: 'Warm and soft, suitable for long-term reading, comfortable on the eyes, not easy to fatigue.',
      value: 'rgb(255, 245, 230)'
    },
    {
      color: 'cyan',
      name: 'cyan',
      description: 'Clear and easy to distinguish, suitable for marking concepts and definitions.',
      value: 'rgb(181, 228, 255)'
    },
    {
      color: 'lavender',
      name: 'lavender',
      description: 'Elegant and conspicuous, suitable for important points.',
      value: 'rgb(220, 198, 255)'
    },
    {
      color: 'olive',
      name: 'olive',
      description: 'Natural and peaceful, suitable for auxiliary information.',
      value: 'rgb(222, 234, 181)'
    },
    {
      color: 'peach',
      name: 'peach',
      description: 'Warm and lively, suitable for personal insights.',
      value: 'rgb(255, 204, 153)'
    },
  ];

  // If toolbar is not visible to user, don't render
  if (!isVisible || !selectionRect) {
    return null;
  }

  // Calculate toolbar position, prioritize showing below the selection, ensure it's within viewport
  const calculatePosition = () => {
    if (!selectionRect) return { top: 0, left: 0 };

    const toolbarWidth = 280; // Increased to accommodate wider buttons with text
    const toolbarHeight = 80; // Increased to accommodate taller buttons with text
    const spacing = 12;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Make sure the rectangle values are valid numbers
    const rect = {
      left: isFinite(selectionRect.left) ? selectionRect.left : 0,
      top: isFinite(selectionRect.top) ? selectionRect.top : 0,
      right: isFinite(selectionRect.right) ? selectionRect.right : 0,
      bottom: isFinite(selectionRect.bottom) ? selectionRect.bottom : 0,
      width: isFinite(selectionRect.width) ? selectionRect.width : 0,
      height: isFinite(selectionRect.height) ? selectionRect.height : 0
    };

    // Center the toolbar horizontally relative to the selection
    let left = rect.left + (rect.width / 2) - (toolbarWidth / 2);
    
    // Position default: below the selection
    let top = rect.bottom + spacing;
    
    // If not enough space below, place above
    if (top + toolbarHeight > viewportHeight - 10) {
      top = rect.top - toolbarHeight - spacing;
    }

    // Ensure toolbar remains within viewport bounds
    if (left + toolbarWidth > viewportWidth - 10) {
      left = viewportWidth - toolbarWidth - 10;
    }
    
    if (left < 10) {
      left = 10;
    }
    
    // Ensure top is never negative
    if (top < 10) {
      top = 10;
    }

    console.log('Selection rect:', rect);
    console.log('Toolbar position:', { top, left });
    
    return { top, left };
  };

  const position = calculatePosition();

  // Debug log when component renders
  useEffect(() => {
    console.log('TextSelectionToolbar rendered, showColorPicker:', showColorPicker);
  });

  // Handle clicking outside to close toolbar
  useEffect(() => {
    if (!toolbarRef.current) return;
    
    const doc = toolbarRef.current.ownerDocument || document;
    
    const handleClickOutside = (event: MouseEvent) => {
      // Check if the click is outside the toolbar and not on selected text
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        // Don't close the toolbar if user is clicking on selected text
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed) {
          // Get the range and check if the click was inside it
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          
          // Check if click is within selection area
          if (event.clientX >= rect.left && event.clientX <= rect.right &&
              event.clientY >= rect.top && event.clientY <= rect.bottom) {
            return;
          }
        }
        
        // Otherwise, close the toolbar
        setShowColorPicker(false);
        onClose();
      }
    };

    doc.addEventListener('mousedown', handleClickOutside);
    return () => {
      doc.removeEventListener('mousedown', handleClickOutside);
    };
  }, [toolbarRef.current, onClose]);

  // Add listener for selection changes to close toolbar when selection is lost
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (selection && selection.isCollapsed) {
        // Selection is collapsed (no text selected), close the toolbar
        onClose();
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [onClose]);

  // Handle direct highlight button click to show color picker
  const handleHighlightClick = (e: React.MouseEvent) => {
    // Use preventDefault to avoid losing selection in iframe
    e.preventDefault();
    e.stopPropagation();
    console.log('Highlight button clicked');
    setShowColorPicker(prev => !prev);
  };

  const handleApplyHighlight = (color: HighlightColor, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log(`Applying highlight color: ${color}`);
    
    // Don't close the toolbar after highlighting
    onHighlight(color);
    setShowColorPicker(false);
  };

  // Handle copy button click
  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    let textToCopy = '';
    let selection: Selection | null = null;
    
    try {
      // Try to get selection from iframe first
      const iframe = document.querySelector('iframe');
      if (iframe && iframe.contentWindow) {
        selection = iframe.contentWindow.getSelection();
      } else {
        selection = window.getSelection();
      }
      
      if (selection && !selection.isCollapsed) {
        textToCopy = selection.toString();
        
        await navigator.clipboard.writeText(textToCopy);
        setIsCopied(true);
        
        // Reset copy success indicator after 2 seconds
        setTimeout(() => {
          setIsCopied(false);
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <div 
      ref={toolbarRef}
      className="fixed z-[2147483647] select-none readlite-selection-toolbar"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: 'auto',
        maxWidth: '100vw',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
        backdropFilter: 'blur(10px)',
        background: theme === 'dark' ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.9)',
        border: `1px solid ${theme === 'dark' ? 'rgba(60,60,60,0.8)' : 'rgba(220,220,220,0.8)'}`,
        overflow: 'visible',
        position: 'fixed',
        transform: 'translateZ(0)',
        willChange: 'transform',
        pointerEvents: 'auto',
      }}
      onClick={(e) => {
        // Prevent clicks on the toolbar from bubbling up and losing selection
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      {/* Main Toolbar */}
      <div className="flex items-center px-4 py-2 gap-1">
        {/* Highlight Button and Color Picker */}
        <div className="relative group">
          {/* Highlight Button */}
          <button
            onMouseDown={handleHighlightClick}
            className={`flex flex-col items-center justify-center cursor-pointer border-none rounded-lg transition-all duration-200 ease-in-out px-2 py-1
                      ${showColorPicker 
                        ? 'bg-accent/15 text-accent shadow-sm ring-1 ring-accent/30' 
                        : 'bg-transparent text-primary/70 hover:bg-primary/10 hover:text-primary hover:scale-105 hover:shadow-sm active:scale-95'}`}
            title={t('highlight')}
          >
            <div className="w-8 h-8 flex items-center justify-center">
              <PencilIcon className="w-5 h-5" />
            </div>
            <span className="text-xs mt-1 font-medium">{t('highlight')}</span>
          </button>
          
          {/* If color picker is open, show circular color menu above button */}
          {showColorPicker && (
            <div 
              className="absolute z-[2147483647] animate-in fade-in zoom-in-90 duration-150"
              style={{
                top: '58px',  // Adjusted to account for taller button with text
                left: '50%',
                transform: 'translateX(-50%)',
                background: theme === 'dark' ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.98)',
                backdropFilter: 'blur(12px)',
                borderRadius: '9999px',
                padding: '10px',
                boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
                border: `1px solid ${theme === 'dark' ? 'rgba(80,80,80,0.8)' : 'rgba(220,220,220,0.8)'}`,
              }}
            >
              <div className="flex gap-2 items-center">
                {highlightColors.map((item) => (
                  <button
                    key={item.color}
                    onMouseDown={(e) => handleApplyHighlight(item.color, e)}
                    className="w-8 h-8 rounded-full cursor-pointer hover:scale-110 active:scale-90 transition-all duration-150 hover:shadow-md group relative"
                    style={{
                      backgroundColor: item.value,
                      border: '1px solid rgba(0,0,0,0.1)',
                    }}
                    title={item.description}
                  >
                  </button>
                ))}
              </div>
              
              {/* Small triangle indicator */}
              <div 
                className="absolute w-3 h-3 transform rotate-45"
                style={{
                  top: '-6px',
                  left: '50%',
                  marginLeft: '-6px',
                  background: theme === 'dark' ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.98)',
                  borderLeft: `1px solid ${theme === 'dark' ? 'rgba(80,80,80,0.8)' : 'rgba(220,220,220,0.8)'}`,
                  borderTop: `1px solid ${theme === 'dark' ? 'rgba(80,80,80,0.8)' : 'rgba(220,220,220,0.8)'}`,
                }}
              />
            </div>
          )}
        </div>

        {/* Note Button */}
        <div className="group">
          <button
            onClick={() => {
              alert(t('comingSoon'));
            }}
            className="flex flex-col items-center justify-center cursor-pointer border-none rounded-lg transition-all duration-200 ease-in-out px-2 py-1
                      bg-transparent text-primary/70 hover:bg-primary/10 hover:text-primary hover:scale-105 hover:shadow-sm active:scale-95"
            title={t('note')}
          >
            <div className="w-8 h-8 flex items-center justify-center">
              <DocumentTextIcon className="w-5 h-5 group-hover:animate-pulse" />
            </div>
            <span className="text-xs mt-1 font-medium">{t('note')}</span>
          </button>
        </div>
        
        {/* Copy Button */}
        <div className="group">
          <button
            onMouseDown={handleCopy}
            className={`flex flex-col items-center justify-center cursor-pointer border-none rounded-lg transition-all duration-200 ease-in-out px-2 py-1
                      ${isCopied
                        ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-transparent text-primary/70 hover:bg-primary/10 hover:text-primary hover:scale-105 hover:shadow-sm active:scale-95'}`}
            title={t('copy')}
          >
            <div className="w-8 h-8 flex items-center justify-center">
              {isCopied ? (
                <CheckIcon className="w-5 h-5 text-green-500 animate-in zoom-in-50 duration-200" />
              ) : (
                <ClipboardDocumentIcon className="w-5 h-5 group-hover:animate-pulse" />
              )}
            </div>
            <span className={`text-xs mt-1 font-medium ${isCopied ? 'text-green-600 dark:text-green-400' : ''}`}>
              {isCopied ? t('copied') : t('copy')}
            </span>
          </button>
        </div>
        
        {/* AI Assistant Button */}
        <div className="group">
          <button
            onClick={() => {
              alert(t('comingSoon'));
            }}
            className="flex flex-col items-center justify-center cursor-pointer border-none rounded-lg transition-all duration-200 ease-in-out px-2 py-1
                      bg-transparent text-primary/70 hover:bg-accent/10 hover:text-accent hover:scale-105 hover:shadow-sm active:scale-95"
            title={t('aiAssistant')}
          >
            <div className="w-8 h-8 flex items-center justify-center">
              <SparklesIcon className="w-5 h-5 group-hover:animate-pulse" />
            </div>
            <span className="text-xs mt-1 font-medium">{t('ai')}</span>
          </button>
        </div>
        
        {/* Close Button */}
        <div className="group">
          <button
            onClick={onClose}
            className="flex flex-col items-center justify-center cursor-pointer border-none rounded-lg transition-all duration-200 ease-in-out px-2 py-1
                      bg-transparent text-primary/70 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 hover:scale-105 hover:shadow-sm active:scale-95"
            title={t('close')}
          >
            <div className="w-8 h-8 flex items-center justify-center">
              <XMarkIcon className="w-5 h-5 group-hover:animate-pulse" />
            </div>
            <span className="text-xs mt-1 font-medium">{t('close')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectionToolbar; 