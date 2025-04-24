import React, { useRef, useEffect, useState, KeyboardEvent } from 'react';
import { ContextType } from './types';
import { Model } from '../../types/api';
import { 
  ChevronDownIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  TrashIcon, 
  XMarkIcon 
} from '@heroicons/react/24/outline';

interface InputAreaProps {
  inputText: string;
  setInputText: (text: string) => void;
  isLoading: boolean;
  isProcessing: boolean;
  onSendMessage: () => void;
  disableSend: boolean;
  contextType: ContextType | null;
  setContextType: (type: ContextType | null) => void;
  contextOptions: { value: ContextType; label: string }[];
  selectedModel: Model | null;
  setSelectedModel: (model: Model | null) => void;
  availableModels: Model[];
  t: (key: string) => string;
  isAuth?: boolean;
  onClearConversation?: () => void;
  onLogin?: () => void;
  onClose?: () => void;
}

const InputArea: React.FC<InputAreaProps> = ({
  inputText,
  setInputText,
  isLoading,
  isProcessing,
  onSendMessage,
  disableSend,
  contextType,
  setContextType,
  contextOptions = [],
  selectedModel,
  setSelectedModel,
  availableModels = [],
  t,
  isAuth = false,
  onClearConversation,
  onLogin,
  onClose,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isToolbarExpanded, setIsToolbarExpanded] = useState(true);

  useEffect(() => {
    // Focus the textarea when the component mounts
    textareaRef.current?.focus();
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disableSend && !isLoading && inputText.trim() !== '') {
        onSendMessage();
      }
    }
  };

  // Set minimum height to 3 lines and maximum height to 8 lines
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get accurate scrollHeight
      textarea.style.height = 'auto';
      
      // Get line height (approx 20px per line)
      const lineHeight = 20;
      const minHeight = lineHeight * 3; // 3 lines minimum
      const maxHeight = lineHeight * 8; // 8 lines maximum
      
      // Set height based on content but within min/max constraints
      textarea.style.height = `${Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight))}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputText]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
  };

  const handleSelectContext = (type: ContextType | null) => {
    setContextType(type);
    setShowContextMenu(false);
    textareaRef.current?.focus();
  };

  const handleSelectModel = (model: Model) => {
    setSelectedModel(model);
    setShowModelMenu(false);
    textareaRef.current?.focus();
  };

  const getContextLabel = () => {
    if (!contextType || !contextOptions || !Array.isArray(contextOptions)) return '';
    const option = contextOptions.find(opt => opt?.value === contextType);
    return option?.label || '';
  };

  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);

  // Common classes for menu items
  const menuItemClass = "px-3 py-2 hover:bg-bg-tertiary cursor-pointer transition-colors duration-150 text-xs";
  
  // Common classes for toolbar buttons
  const toolbarButtonClass = "p-1 rounded text-text-secondary/70 hover:text-accent hover:bg-accent/10 transition-colors";

  return (
    <div className="w-full pt-2 pb-2 px-4">
      <div className="relative">
        {/* Input container with focus state styling */}
        <div 
          className={`flex flex-col bg-bg-secondary hover:border-border rounded-2xl 
                      transition-all duration-200 shadow-sm ${
                        isFocused ? 'border-accent/50 shadow-[0_0_0_2px_var(--readlite-accent)]/10' : ''
                      }`}
        >
          {/* Top toolbar with context and model selectors */}
          <div className="flex justify-between px-4 pt-2 pb-0 text-[9px] text-text-secondary h-[24px]">
            <div className="relative">
              {isToolbarExpanded ? (
                <button
                  className="flex items-center gap-1 p-1 hover:bg-bg-tertiary rounded transition-colors duration-150"
                  onClick={() => setShowContextMenu(!showContextMenu)}
                  aria-label="Select context"
                >
                  <span className="flex items-center">
                    <span className="text-text-secondary/10">@</span>
                    <span className="ml-0.5 opacity-90 text-[10px]">
                      {contextType ? getContextLabel() : (t('agentContext') || 'Context')}
                    </span>
                  </span>
                  <ChevronDownIcon
                    className={`w-4 h-4 transition-transform duration-200 ${showContextMenu ? 'rotate-180' : ''}`}
                  />
                </button>
              ) : (
                <button
                  className={toolbarButtonClass}
                  onClick={() => setIsToolbarExpanded(true)}
                  title={t('expandToolbar') || "Expand toolbar"}
                >
                  <ChevronRightIcon className="w-3 h-3" />
                </button>
              )}
              
              {/* Context menu dropdown */}
              {showContextMenu && contextOptions && Array.isArray(contextOptions) && (
                <div className="absolute left-0 bottom-full mb-1 z-10 bg-bg-secondary shadow-lg rounded-lg 
                               border border-border py-1 min-w-[150px] overflow-hidden animate-fadeIn">
                  {contextOptions.map((option) => (
                    <div
                      key={option.value}
                      className={`${menuItemClass} ${contextType === option.value ? 'bg-bg-tertiary' : ''}`}
                      onClick={() => handleSelectContext(option.value)}
                    >
                      {option.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="relative flex items-center gap-2">
              {isToolbarExpanded && (
                <>
                  {/* Login button - only shown when not authenticated */}
                  {!isAuth && onLogin && (
                    <button
                      onClick={onLogin}
                      className="text-[10px] py-0.5 px-2 rounded-full bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                    >
                      {t('login') || "Login"}
                    </button>
                  )}
                  
                  {/* Model selector */}
                  <button
                    className="flex items-center gap-1 p-1 hover:bg-bg-tertiary rounded transition-colors duration-150"
                    onClick={() => setShowModelMenu(!showModelMenu)}
                    aria-label="Select model"
                  >
                    <span className="opacity-90 text-[10px]">
                      {selectedModel ? selectedModel.label : (t('agentDefaultModel') || 'Default')}
                    </span>
                    <ChevronDownIcon
                      className={`w-4 h-4 transition-transform duration-200 ${showModelMenu ? 'rotate-180' : ''}`}
                    />
                  </button>
                </>
              )}
              
              {/* Toolbar collapse button */}
              {isToolbarExpanded && (
                <button
                  className={toolbarButtonClass}
                  onClick={() => setIsToolbarExpanded(false)}
                  title={t('collapseToolbar') || "Collapse toolbar"}
                >
                  <ChevronLeftIcon className="w-3 h-3" />
                </button>
              )}
              
              {/* Clear conversation button - only shown when authenticated */}
              {isAuth && onClearConversation && (
                <button
                  onClick={onClearConversation}
                  className={toolbarButtonClass}
                  title={t('clearChat') || "Clear chat"}
                >
                  <TrashIcon className="w-3 h-3" />
                </button>
              )}
              
              {/* Close button */}
              {onClose && (
                <button 
                  onClick={onClose}
                  className={toolbarButtonClass}
                  title={t('minimize') || "Close"}
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              )}
              
              {/* Model selection menu */}
              {showModelMenu && availableModels && Array.isArray(availableModels) && (
                <div className="absolute right-0 bottom-full mb-1 z-10 bg-bg-secondary shadow-lg rounded-lg 
                               border border-border py-1 min-w-[150px] overflow-hidden animate-fadeIn">
                  {availableModels.map((model) => (
                    <div
                      key={model.value}
                      className={`${menuItemClass} ${selectedModel?.value === model.value ? 'bg-bg-tertiary' : ''}`}
                      onClick={() => handleSelectModel(model)}
                    >
                      {model.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Text input area */}
          <div className="flex px-4 pt-0.5 pb-1 relative flex-grow">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={t('agentInputPlaceholder') || 'Type your message...'}
              disabled={isLoading}
              rows={3}
              className="w-full bg-transparent py-2.5 resize-none outline-none 
                        placeholder:text-text-secondary/50 text-sm pr-10 overflow-y-auto 
                        min-h-[60px] leading-5"
            />
            
            {/* Send button */}
            <button
              onClick={onSendMessage}
              disabled={disableSend || isLoading || inputText.trim() === ''}
              className={`absolute bottom-2 right-4 p-1.5 rounded-lg text-[10px] transition-all duration-200 
                          flex items-center gap-1 ${
                            disableSend || isLoading || inputText.trim() === ''
                              ? 'opacity-50 cursor-not-allowed bg-border/30'
                              : 'bg-accent text-bg-primary hover:bg-accent/90 shadow-sm hover:shadow'
                          }`}
              title={disableSend ? t('agentSendMessage') || 'Send message' : ''}
            >
              {isProcessing ? (
                <span className="flex items-center">
                  <span className="text-xs">{t('agentSending') || 'Sending...'}</span>
                </span>
              ) : (
                t('agentSend') || 'Send'
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Context selection hint */}
      {!contextType && (
        <div className="text-[10px] text-text-secondary/60 mt-1.5 ml-3">
          {t('agentContextHint') || 'Pro tip: Select a context type for more relevant responses'}
        </div>
      )}
    </div>
  );
};

export default InputArea; 