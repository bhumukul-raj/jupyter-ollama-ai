import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCopy,
  faCheck,
  faUndo,
  faRedo,
  faCode
} from '@fortawesome/free-solid-svg-icons';

interface CodePreviewProps {
  code: string;
  language?: string;
  originalCode?: string;
  onApply?: (code: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  hasHistory?: boolean;
}

interface HighlightRule {
  pattern: RegExp;
  className: string;
}

const languageRules: Record<string, HighlightRule[]> = {
  python: [
    { pattern: /(^|\s)(def|class|import|from|return|if|else|for|while|try|except|with)(\s|$)/g, className: 'keyword' },
    { pattern: /(["'])(.*?)\1/g, className: 'string' },
    { pattern: /#.*/g, className: 'comment' },
    { pattern: /\b\d+\b/g, className: 'number' },
    { pattern: /\b[A-Z][A-Za-z0-9_]*\b/g, className: 'class' }
  ],
  javascript: [
    { pattern: /(^|\s)(const|let|var|function|return|if|else|for|while|try|catch|class|import|export)(\s|$)/g, className: 'keyword' },
    { pattern: /(["'`])(.*?)\1/g, className: 'string' },
    { pattern: /\/\/.*/g, className: 'comment' },
    { pattern: /\/\*[\s\S]*?\*\//g, className: 'comment' },
    { pattern: /\b\d+\b/g, className: 'number' },
    { pattern: /\b[A-Z][A-Za-z0-9_]*\b/g, className: 'class' }
  ]
};

export const CodePreview: React.FC<CodePreviewProps> = ({
  code,
  language = 'python',
  originalCode,
  onApply,
  onUndo,
  onRedo,
  hasHistory = false
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [highlightedCode, setHighlightedCode] = useState<JSX.Element[]>([]);
  const [diffView, setDiffView] = useState(false);
  
  useEffect(() => {
    highlightCode();
  }, [code, language, diffView]);
  
  const highlightCode = () => {
    let processedCode = code;
    const rules = languageRules[language] || [];
    const elements: JSX.Element[] = [];
    let lastIndex = 0;
    
    // If in diff view and we have original code, show the differences
    if (diffView && originalCode) {
      const diff = computeDiff(originalCode, code);
      elements.push(...diff);
    } else {
      // Apply syntax highlighting rules
      rules.forEach(({ pattern, className }) => {
        processedCode = processedCode.replace(pattern, (match) => 
          `<span class="jp-AIAssistant-code-${className}">${match}</span>`
        );
      });
      
      // Split by lines and create elements
      const lines = processedCode.split('\n');
      lines.forEach((line, index) => {
        elements.push(
          <div key={index} className="jp-AIAssistant-code-line">
            <span className="jp-AIAssistant-code-line-number">{index + 1}</span>
            <span 
              className="jp-AIAssistant-code-line-content"
              dangerouslySetInnerHTML={{ __html: line || ' ' }}
            />
          </div>
        );
      });
    }
    
    setHighlightedCode(elements);
  };
  
  const computeDiff = (oldCode: string, newCode: string): JSX.Element[] => {
    const oldLines = oldCode.split('\n');
    const newLines = newCode.split('\n');
    const elements: JSX.Element[] = [];
    
    let i = 0, j = 0;
    while (i < oldLines.length || j < newLines.length) {
      if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
        // Unchanged line
        elements.push(
          <div key={`${i}-${j}`} className="jp-AIAssistant-code-line">
            <span className="jp-AIAssistant-code-line-number">{j + 1}</span>
            <span className="jp-AIAssistant-code-line-content">{newLines[j]}</span>
          </div>
        );
        i++;
        j++;
      } else {
        // Line was changed
        if (i < oldLines.length) {
          elements.push(
            <div key={`removed-${i}`} className="jp-AIAssistant-code-line removed">
              <span className="jp-AIAssistant-code-line-number">-</span>
              <span className="jp-AIAssistant-code-line-content">{oldLines[i]}</span>
            </div>
          );
          i++;
        }
        if (j < newLines.length) {
          elements.push(
            <div key={`added-${j}`} className="jp-AIAssistant-code-line added">
              <span className="jp-AIAssistant-code-line-number">+</span>
              <span className="jp-AIAssistant-code-line-content">{newLines[j]}</span>
            </div>
          );
          j++;
        }
      }
    }
    
    return elements;
  };
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };
  
  return (
    <div className="jp-AIAssistant-code-preview">
      <div className="jp-AIAssistant-code-preview-header">
        <div className="jp-AIAssistant-code-preview-title">
          <FontAwesomeIcon icon={faCode} className="fa-icon-sm" />
          <span>{language.toUpperCase()}</span>
        </div>
        
        <div className="jp-AIAssistant-code-preview-actions">
          {originalCode && (
            <button
              className="jp-AIAssistant-code-preview-button"
              onClick={() => setDiffView(!diffView)}
              title={diffView ? 'Show normal view' : 'Show differences'}
            >
              {diffView ? 'Normal' : 'Diff'}
            </button>
          )}
          
          {hasHistory && (
            <>
              <button
                className="jp-AIAssistant-code-preview-button"
                onClick={onUndo}
                title="Undo"
              >
                <FontAwesomeIcon icon={faUndo} />
              </button>
              <button
                className="jp-AIAssistant-code-preview-button"
                onClick={onRedo}
                title="Redo"
              >
                <FontAwesomeIcon icon={faRedo} />
              </button>
            </>
          )}
          
          <button
            className="jp-AIAssistant-code-preview-button"
            onClick={handleCopy}
            title="Copy code"
          >
            <FontAwesomeIcon icon={isCopied ? faCheck : faCopy} />
          </button>
        </div>
      </div>
      
      <div className="jp-AIAssistant-code-preview-content">
        {highlightedCode}
      </div>
      
      {onApply && (
        <div className="jp-AIAssistant-code-preview-footer">
          <button
            className="jp-AIAssistant-code-preview-button primary"
            onClick={() => onApply(code)}
          >
            Apply Changes
          </button>
        </div>
      )}
    </div>
  );
}; 