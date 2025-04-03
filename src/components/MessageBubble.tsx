import React, { useRef, useEffect } from 'react';
import AIAvatar from './AIAvatar';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface MessageBubbleProps {
  message: string;
  direction: 'incoming' | 'outgoing';
  sender: 'ai' | 'user';
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, direction, sender }) => {
  const isIncoming = direction === 'incoming';
  const safeMessage = typeof message === 'string' ? message : '';
  const contentRef = useRef<HTMLDivElement>(null);
  
  const bubbleStyle = {
    backgroundColor: isIncoming ? 'white' : '#f0f7ff',
    color: '#333',
    padding: '8px 12px',
    borderRadius: '12px',
    maxWidth: '85%',
    wordBreak: 'break-word' as const,
    whiteSpace: 'normal' as const,
    overflowWrap: 'break-word' as const,
    border: isIncoming ? '1px solid #eee' : '1px solid #e1effe',
    boxShadow: isIncoming ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
  };

  const containerStyle = {
    display: 'flex',
    justifyContent: isIncoming ? 'flex-start' : 'flex-end',
    marginBottom: '10px',
    alignItems: 'flex-start',
  };

  // Use useEffect to render Markdown content
  useEffect(() => {
    if (!contentRef.current || !safeMessage) return;
    
    // Clear existing content before re-rendering
    contentRef.current.innerHTML = '';
    
    try {
      // Configure marked options
      marked.setOptions({
        gfm: true, // Use GitHub flavored Markdown
        breaks: true, // Convert line breaks to <br>
        pedantic: false, // Don't conform to Markdown.pl behavior
        silent: true, // Don't show errors
      });
      
      // Preprocess Markdown to ensure code blocks are properly closed
      let processedMarkdown = safeMessage;
      
      // Detect unclosed code blocks
      const codeBlockMatches = processedMarkdown.match(/```/g);
      const codeBlockCount = codeBlockMatches ? codeBlockMatches.length : 0;
      
      // Add closing tag if code block is unclosed
      if (codeBlockCount % 2 !== 0) {
        processedMarkdown += '\n```';
      }
      
      // Parse Markdown to HTML
      const rawHTML = marked.parse(processedMarkdown) as string;
      
      // Sanitize HTML to prevent XSS attacks
      const sanitizedHTML = DOMPurify.sanitize(rawHTML);
      
      // Set content
      if (contentRef.current) {
        contentRef.current.innerHTML = sanitizedHTML;
        
        // Add styles to code blocks
        const codeBlocks = contentRef.current.querySelectorAll('pre code');
        codeBlocks.forEach((block) => {
          if (block instanceof HTMLElement) {
            block.style.fontFamily = "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace";
            block.style.fontSize = '11px';
            block.style.display = 'block';
            block.style.overflow = 'auto';
            block.style.padding = '8px';
            block.style.backgroundColor = isIncoming ? '#f8f8f8' : '#f8f8f8';
            block.style.borderRadius = '3px';
            block.style.color = '#333';
            block.style.border = '1px solid #eee';
          }
        });
        
        // Add styles to inline code
        const inlineCodes = contentRef.current.querySelectorAll('code:not(pre code)');
        inlineCodes.forEach((inlineCode) => {
          if (inlineCode instanceof HTMLElement) {
            inlineCode.style.fontFamily = "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace";
            inlineCode.style.fontSize = '11px';
            inlineCode.style.padding = '1px 3px';
            inlineCode.style.borderRadius = '3px';
            inlineCode.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
            inlineCode.style.color = '#d14';
          }
        });
        
        // Add styles and security attributes to links
        const links = contentRef.current.querySelectorAll('a');
        links.forEach((link) => {
          if (link instanceof HTMLElement) {
            link.style.color = '#0366d6';
            link.style.textDecoration = 'underline';
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
          }
        });
      }
    } catch (err) {
      console.error("Error rendering markdown:", err);
      if (contentRef.current) {
        contentRef.current.textContent = safeMessage;
      }
    }
  }, [safeMessage, isIncoming]);

  return (
    <div style={containerStyle}>
      {isIncoming && <AIAvatar />}
      <div style={bubbleStyle}>
        <div className="message-content" ref={contentRef}>
          {/* Markdown content will be rendered here via useEffect */}
          {!safeMessage && <p></p>}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble; 