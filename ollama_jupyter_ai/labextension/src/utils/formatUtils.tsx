import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCode,
  faClipboard
} from '@fortawesome/free-solid-svg-icons';

/**
 * Applies syntax highlighting to code blocks
 */
export const applySyntaxHighlighting = (code: string, language: string): JSX.Element => {
  // Simple tokenization for basic syntax highlighting
  // For a production app, consider using a proper syntax highlighter like Prism or Highlight.js
  
  // Replace HTML special characters
  const escapedCode = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Simple regex-based tokenization
  let highlightedCode = escapedCode;
  
  // Highlight JavaScript/TypeScript/Python keywords
  const keywordRegex = /\b(const|let|var|function|return|if|else|for|while|class|import|from|export|async|await|def|import|from|None|True|False|class|try|except|finally)\b/g;
  highlightedCode = highlightedCode.replace(keywordRegex, '<span class="jp-AIAssistant-code-keyword">$1</span>');
  
  // Highlight strings
  const stringRegex = /(["'`])(.*?)\1/g;
  highlightedCode = highlightedCode.replace(stringRegex, '<span class="jp-AIAssistant-code-string">$1$2$1</span>');
  
  // Highlight comments
  const commentRegex = /(\/\/.*$|#.*$|\/\*[\s\S]*?\*\/)/gm;
  highlightedCode = highlightedCode.replace(commentRegex, '<span class="jp-AIAssistant-code-comment">$1</span>');
  
  // Highlight numbers
  const numberRegex = /\b(\d+)\b/g;
  highlightedCode = highlightedCode.replace(numberRegex, '<span class="jp-AIAssistant-code-number">$1</span>');
  
  // Highlight function names
  const functionRegex = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
  highlightedCode = highlightedCode.replace(functionRegex, '<span class="jp-AIAssistant-code-function">$1</span>(');
  
  return (
    <div className="jp-AIAssistant-code-block">
      <div className="jp-AIAssistant-code-header">
        <span className="jp-AIAssistant-code-language">{language}</span>
        <button
          className="jp-AIAssistant-message-control-button"
          onClick={() => navigator.clipboard.writeText(code)}
          title="Copy code to clipboard"
        >
          <FontAwesomeIcon icon={faClipboard} className="fa-icon-sm" />
        </button>
      </div>
      <pre className="jp-AIAssistant-code">
        <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
      </pre>
    </div>
  );
};

/**
 * Formats message content, handling code blocks with syntax highlighting
 */
export const formatMessageWithCodeBlocks = (content: string): JSX.Element => {
  // Split the message by code blocks
  const parts = content.split(/(```[a-z]*\n[\s\S]*?\n```)/g);
  
  return (
    <div className="jp-AIAssistant-formatted-content">
      {parts.map((part, index) => {
        // Check if this part is a code block
        const codeBlockMatch = part.match(/```([a-z]*)\n([\s\S]*?)\n```/);
        
        if (codeBlockMatch) {
          const language = codeBlockMatch[1] || 'text';
          const code = codeBlockMatch[2];
          return (
            <React.Fragment key={index}>
              {applySyntaxHighlighting(code, language)}
            </React.Fragment>
          );
        }
        
        // Handle normal text with paragraph breaks
        return (
          <React.Fragment key={index}>
            {formatText(part)}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/**
 * Formats text to preserve paragraph breaks while ensuring proper spacing
 */
export const formatText = (text: string): JSX.Element[] => {
  // Normalize line breaks and trim excess whitespace
  const normalizedText = text.replace(/\r\n/g, '\n').trim();
  
  // Split by paragraphs (treating double newlines as paragraph separators)
  const paragraphs = normalizedText.split(/\n\s*\n/);
  
  return paragraphs
    .filter(para => para.trim().length > 0) // Remove empty paragraphs
    .map((paragraph, i) => {
      // Handle internal line breaks within a paragraph
      const lines = paragraph.split('\n').map(line => line.trim());
      
      return (
        <p key={i}>
          {lines.map((line, j) => (
            <React.Fragment key={j}>
              {line}
              {j < lines.length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>
      );
    });
}; 