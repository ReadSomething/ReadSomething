import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AIAvatar from './AIAvatar';

interface MessageBubbleProps {
  message: string;
  direction: 'incoming' | 'outgoing';
  sender: 'ai' | 'user';
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, direction, sender }) => {
  const isIncoming = direction === 'incoming';
  const bubbleStyle = {
    backgroundColor: isIncoming ? '#f0f0f0' : '#007AFF',
    color: isIncoming ? '#000' : '#fff',
    padding: '10px 15px',
    borderRadius: '15px',
    maxWidth: '80%',
    wordBreak: 'break-word' as const,
    whiteSpace: 'pre-wrap' as const,
    overflowWrap: 'break-word' as const,
  };

  const containerStyle = {
    display: 'flex',
    justifyContent: isIncoming ? 'flex-start' : 'flex-end',
    marginBottom: '10px',
    alignItems: 'flex-start',
  };

  return (
    <div style={containerStyle}>
      {isIncoming && <AIAvatar />}
      <div style={bubbleStyle}>
        <div className="message-content">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              code: ({ className, children, ...props }) => {
                const match = /language-(\w+)/.exec(className || '');
                return match ? (
                  <pre className="code-block">
                    <code className={className} {...props}>
                      {children}
                    </code>
                  </pre>
                ) : (
                  <code className="inline-code" {...props}>
                    {children}
                  </code>
                );
              },
              a: ({ children, href, ...props }) => (
                <a 
                  href={href}
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ 
                    color: isIncoming ? '#007AFF' : '#fff',
                    textDecoration: 'underline'
                  }}
                  {...props}
                >
                  {children}
                </a>
              ),
              ul: ({ children, ...props }) => (
                <ul 
                  style={{ 
                    margin: '8px 0',
                    paddingLeft: '20px'
                  }}
                  {...props}
                >
                  {children}
                </ul>
              ),
              table: ({ children, ...props }) => (
                <div style={{ overflowX: 'auto' }}>
                  <table 
                    style={{ 
                      borderCollapse: 'collapse',
                      width: '100%',
                      margin: '8px 0'
                    }}
                    {...props}
                  >
                    {children}
                  </table>
                </div>
              ),
              th: ({ children, ...props }) => (
                <th 
                  style={{ 
                    border: '1px solid #ddd',
                    padding: '8px',
                    backgroundColor: isIncoming ? '#f8f8f8' : '#e6e6e6'
                  }}
                  {...props}
                >
                  {children}
                </th>
              ),
              td: ({ children, ...props }) => (
                <td 
                  style={{ 
                    border: '1px solid #ddd',
                    padding: '8px'
                  }}
                  {...props}
                >
                  {children}
                </td>
              )
            }}
          >
            {message}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble; 