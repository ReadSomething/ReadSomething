import React, { useRef, useEffect, useState, KeyboardEvent } from 'react';
import { ContextType } from './types';
import { Model } from '../../types/api';

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

  return (
    <div className="readlite-input-area w-full pt-2 pb-2 px-4">
      <div className="readlite-input-container-wrapper relative">
        {/* Input box with flexible height for multi-line input */}
        <div 
          className={`readlite-input-container flex flex-col bg-[var(--readlite-surface)] border border-[var(--readlite-border)]/50 hover:border-[var(--readlite-border)] rounded-2xl transition-all duration-200 shadow-sm ${
            isFocused ? 'border-[var(--readlite-accent)]/50 shadow-[0_0_0_2px_var(--readlite-accent)]/10' : ''
          }`}
        >
          {/* Top line: Context and model selectors in compact form */}
          <div className="readlite-selectors-compact flex justify-between px-4 pt-2 pb-0 text-[9px] text-[var(--readlite-text-secondary)] h-[24px]">
            <div className="readlite-context-selector-compact relative">
              {isToolbarExpanded && (
                <button
                  className="readlite-context-button flex items-center gap-1 p-1 hover:bg-[var(--readlite-hover)] rounded transition-colors duration-150"
                  onClick={() => setShowContextMenu(!showContextMenu)}
                  aria-label="Select context"
                >
                  <span className="flex items-center">
                    <span className="text-[var(--readlite-text-secondary)]/10">@</span>
                    <span className="ml-0.5 opacity-90 text-[10px]">
                      {contextType ? getContextLabel() : (t('agentContext') || 'Context')}
                    </span>
                  </span>
                  <svg
                    width="8"
                    height="8"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className={`transition-transform duration-200 ${
                      showContextMenu ? 'rotate-180' : ''
                    }`}
                  >
                    <path
                      d="M6 9L12 15L18 9"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}
              {!isToolbarExpanded && (
                <button
                  className="p-1 rounded text-[var(--readlite-text-secondary)]/70 hover:text-[var(--readlite-accent)] hover:bg-[var(--readlite-accent)]/10 transition-colors"
                  onClick={() => setIsToolbarExpanded(true)}
                  title={t('expandToolbar') || "Expand toolbar"}
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6"></path>
                  </svg>
                </button>
              )}
              {showContextMenu && contextOptions && Array.isArray(contextOptions) && (
                <div className="readlite-context-menu absolute left-0 bottom-full mb-1 z-10 bg-[var(--readlite-surface)] shadow-lg rounded-lg border border-[var(--readlite-border)] py-1 min-w-[150px] overflow-hidden transform origin-bottom-left animate-fadeIn">
                  {contextOptions.map((option) => (
                    <div
                      key={option.value}
                      className={`readlite-context-item px-3 py-2 hover:bg-[var(--readlite-hover)] cursor-pointer transition-colors duration-150 text-xs ${
                        contextType === option.value ? 'bg-[var(--readlite-hover)]' : ''
                      }`}
                      onClick={() => handleSelectContext(option.value)}
                    >
                      {option.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="readlite-model-selector-compact relative flex items-center gap-2">
              {isToolbarExpanded && (
                <>
                  {/* Login button - only shown when not authenticated */}
                  {!isAuth && onLogin && (
                    <button
                      onClick={onLogin}
                      className="text-[9px] py-0.5 px-2 rounded-full bg-[var(--readlite-accent)]/10 text-[var(--readlite-accent)] hover:bg-[var(--readlite-accent)]/20 transition-colors text-[10px]"
                    >
                      {t('login') || "Login"}
                    </button>
                  )}
                  
                  <button
                    className="readlite-model-button flex items-center gap-1 p-1 hover:bg-[var(--readlite-hover)] rounded transition-colors duration-150"
                    onClick={() => setShowModelMenu(!showModelMenu)}
                    aria-label="Select model"
                  >
                    <span className="opacity-90 text-[10px] text-[9px]">
                      {selectedModel ? selectedModel.label : (t('agentDefaultModel') || 'Default')}
                    </span>
                    <svg
                      width="8"
                      height="8"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className={`transition-transform duration-200 ${
                        showModelMenu ? 'rotate-180' : ''
                      }`}
                    >
                      <path
                        d="M6 9L12 15L18 9"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </>
              )}
              
              {/* Toolbar collapse/expand button */}
              {isToolbarExpanded && (
                <button
                  className="p-1 rounded text-[var(--readlite-text-secondary)]/70 hover:text-[var(--readlite-text)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  onClick={() => setIsToolbarExpanded(false)}
                  title={t('collapseToolbar') || "Collapse toolbar"}
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6"></path>
                  </svg>
                </button>
              )}
              
              {/* Clear conversation button - only shown when authenticated */}
              {isAuth && onClearConversation && (
                <button
                  onClick={onClearConversation}
                  className="p-1 rounded text-[var(--readlite-text-secondary)]/70 hover:text-[var(--readlite-accent)] hover:bg-[var(--readlite-accent)]/10 transition-colors"
                  title={t('clearChat') || "Clear chat"}
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              )}
              
              {/* Close button - now integrated in toolbar */}
              {onClose && (
                <button 
                  onClick={onClose}
                  className="p-1 rounded text-[var(--readlite-text-secondary)]/70 hover:text-[var(--readlite-text)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  title={t('minimize') || "Close"}
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12"></path>
                  </svg>
                </button>
              )}
              
              {showModelMenu && availableModels && Array.isArray(availableModels) && (
                <div className="readlite-model-menu absolute right-0 bottom-full mb-1 z-10 bg-[var(--readlite-surface)] shadow-lg rounded-lg border border-[var(--readlite-border)] py-1 min-w-[150px] overflow-hidden transform origin-bottom-right animate-fadeIn">
                  {availableModels.map((model) => (
                    <div
                      key={model.value}
                      className={`readlite-model-item px-3 py-2 hover:bg-[var(--readlite-hover)] cursor-pointer transition-colors duration-150 text-xs ${
                        selectedModel?.value === model.value ? 'bg-[var(--readlite-hover)]' : ''
                      }`}
                      onClick={() => handleSelectModel(model)}
                    >
                      {model.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Middle and bottom lines*/}
          <div className="readlite-input-wrapper flex px-4 pt-0.5 pb-1 relative flex-grow">
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
              className="readlite-input w-full bg-transparent py-2.5 resize-none outline-none placeholder:text-[var(--readlite-text-secondary)]/50 text-sm pr-10 overflow-y-auto min-h-[60px]"
              style={{ lineHeight: '20px' }}
            />
            <button
              onClick={onSendMessage}
              disabled={disableSend || isLoading || inputText.trim() === ''}
              className={`readlite-send-button absolute bottom-2 right-4 p-1.5 rounded-lg text-xs text-[10px] transition-all duration-200 flex items-center gap-1 ${
                disableSend || isLoading || inputText.trim() === ''
                  ? 'opacity-50 cursor-not-allowed bg-[var(--readlite-border)]/30'
                  : 'bg-[var(--readlite-accent)] text-[var(--readlite-background)] hover:bg-[var(--readlite-accent)]/90 shadow-sm hover:shadow'
              }`}
              title={disableSend ? t('agentSendMessage') || 'Send message' : ''}
            >
              {isProcessing ? (
                <span className="flex items-center">
                  <span className="text-xs">{t('agentSending') || 'Sending...'}</span>
                </span>
              ) : (
                <>
                  {t('agentSend') || 'Send'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Additional context hint */}
      {!contextType && (
        <div className="text-[10px] text-[var(--readlite-text-secondary)]/60 mt-1.5 ml-3">
          {t('agentContextHint') || 'Pro tip: Select a context type for more relevant responses'}
        </div>
      )}
    </div>
  );
};

export default InputArea; 