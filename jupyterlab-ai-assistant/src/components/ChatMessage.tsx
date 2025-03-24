import React from 'react';
import ReactMarkdown from 'react-markdown';
import { IThemeManager } from '@jupyterlab/apputils';

interface MessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant' | 'system' | string;
    content: string;
    timestamp: Date;
  };
  themeManager?: IThemeManager;
}

export const ChatMessage: React.FC<MessageProps> = ({ message, themeManager }) => {
  // Determine if we're in dark theme
  const isDarkTheme = themeManager?.theme === 'JupyterLab Dark' || false;
  
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const messageClass = message.role === 'user' ? 'user-message' : 'assistant-message';
  const alignClass = message.role === 'user' ? 'align-self-end' : 'align-self-start';
  const textColorClass = message.role === 'user' ? 'text-white' : '';

  return (
    <div className={`message-wrapper mb-3 ${alignClass} ${messageClass}`}>
      <div className={`message-bubble p-3 rounded ${textColorClass}`}>
        <div className="message-header d-flex justify-content-between align-items-center mb-2">
          <span className="message-role fw-bold">
            {message.role === 'user' ? 'You' : 'AI Assistant'}
          </span>
          <span className="message-time small opacity-75">
            {formatTime(message.timestamp)}
          </span>
        </div>
        
        <div className="message-content">
          <ReactMarkdown
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <div className="code-block-wrapper my-2">
                    <pre className={`rounded p-3 ${isDarkTheme ? 'bg-dark' : 'bg-light'}`}>
                      <code className={`${className} d-block`} {...props}>
                        {String(children).replace(/\n$/, '')}
                      </code>
                    </pre>
                  </div>
                ) : (
                  <code className={`px-1 rounded ${isDarkTheme ? 'bg-dark' : 'bg-light'}`} {...props}>
                    {children}
                  </code>
                );
              }
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}; 