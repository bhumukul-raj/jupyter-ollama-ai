import React, { useState, useEffect } from 'react';
import { searchIcon, buildIcon, bugIcon, userIcon } from '@jupyterlab/ui-components';
import { Cell } from '@jupyterlab/cells';
import { ServerConnection } from '@jupyterlab/services';
import ReactMarkdown from 'react-markdown';

import { analyzeCellContent } from '../services/ollama';

interface CellContextMenuProps {
  cell: Cell;
  onClose: () => void;
  selectedModel: string;
  initialAction?: string;
}

const CellContextMenu: React.FC<CellContextMenuProps> = ({
  cell,
  onClose,
  selectedModel,
  initialAction
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [animationClass, setAnimationClass] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  // Auto-scroll to results when they are available
  useEffect(() => {
    if (result) {
      const resultContainer = document.querySelector('.result-container');
      if (resultContainer) {
        resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [result]);

  // Handle animation on component mount
  useEffect(() => {
    // Small delay to ensure DOM is ready for animation
    setTimeout(() => {
      setAnimationClass('animate-in');
    }, 50);
  }, []);

  // Auto-trigger the specified action when component mounts
  useEffect(() => {
    if (initialAction) {
      const actionMap = {
        'explain': 'Explain this code',
        'optimize': 'Optimize this code',
        'debug': 'Find bugs',
        'chat': 'Chat about code'
      };
      
      const question = actionMap[initialAction];
      if (question) {
        handleQuestionSelect(question);
      }
    }
  }, [initialAction]);

  const getCellContent = (): string => {
    try {
      const content = cell.model.sharedModel.getSource();
      console.log(`[DEBUG] Retrieved cell content (${content.length} chars)`);
      return content;
    } catch (error) {
      console.error('[DEBUG] Error getting cell content:', error);
      setError('Failed to retrieve cell content.');
      return '';
    }
  };

  const getCellType = (): string => {
    try {
      return cell.model.type === 'code' ? 'code' : 'markdown';
    } catch (error) {
      console.error('[DEBUG] Error getting cell type:', error);
      return 'unknown';
    }
  };

  const handleQuestionSelect = async (question: string) => {
    try {
      setSelectedAction(question);
      setIsLoading(true);
      setResult(null);
      setError(null);
      setExecutionTime(null);

      const cellContent = getCellContent();
      const cellType = getCellType();

      if (!cellContent) {
        setError('Cell content is empty.');
        setIsLoading(false);
        return;
      }

      console.log(`[DEBUG] Analyzing cell with question: "${question}"`);
      console.log(`[DEBUG] Cell type: ${cellType}, model: ${selectedModel}`);

      const startTime = Date.now();
      const response = await analyzeCellContent(
        selectedModel,
        cellContent,
        cellType,
        question
      );

      const endTime = Date.now();
      setExecutionTime(endTime - startTime);

      if (response.error) {
        console.error('[DEBUG] Error from API:', response.error);
        setError(response.error);
        setIsLoading(false);
        return;
      }

      // Extract content from response
      let responseContent = '';
      if (response.message?.content) {
        responseContent = response.message.content;
      } else if (response.response) {
        responseContent = response.response;
      } else {
        responseContent = 'The AI provided no response.';
      }

      console.log(`[DEBUG] Received response (${responseContent.length} chars)`);
      setResult(responseContent);
    } catch (error) {
      console.error('[DEBUG] Error processing analysis:', error);
      setError(`Error: ${error.message || 'Unknown error occurred'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderCodeBlock = (code: string, language = '') => {
    return (
      <div className="code-block-wrapper mb-3">
        <pre className="p-3 rounded border bg-light code-block">
          <code className={language ? `language-${language}` : ''}>
            {code}
          </code>
        </pre>
      </div>
    );
  };

  const handleClose = () => {
    // Animate out before fully closing
    setAnimationClass('animate-out');
    setTimeout(() => {
      onClose();
    }, 300); // Match the CSS animation duration
  };

  // Define the actions, even though we don't show buttons now
  const actions = [
    {
      label: 'Explain this code',
      icon: searchIcon,
      description: 'Get an explanation of what this code does',
      buttonClass: 'btn-primary',
      handler: () => handleQuestionSelect('Explain this code')
    },
    {
      label: 'Optimize this code',
      icon: buildIcon,
      description: 'Get suggestions to improve this code',
      buttonClass: 'btn-success',
      handler: () => handleQuestionSelect('Optimize this code')
    },
    {
      label: 'Find bugs',
      icon: bugIcon,
      description: 'Identify potential issues in this code',
      buttonClass: 'btn-warning',
      handler: () => handleQuestionSelect('Find bugs')
    },
    {
      label: 'Chat about code',
      icon: userIcon,
      description: 'Have a conversation about this code',
      buttonClass: 'btn-info',
      handler: () => handleQuestionSelect('Chat about code')
    }
  ];

  // Function to generate a title based on the selected action
  const getDialogTitle = () => {
    if (!selectedAction) return 'AI Assistant';
    
    const actionTitles = {
      'Explain this code': 'AI Code Explanation',
      'Optimize this code': 'AI Code Optimization',
      'Find bugs': 'AI Code Analysis',
      'Chat about code': 'AI Chat about Code'
    };
    
    return actionTitles[selectedAction] || 'AI Assistant';
  };

  const cellContent = getCellContent();
  const cellType = getCellType();

  return (
    <div className={`cell-context-menu card shadow-lg ${animationClass} w-100 max-w-800px mx-auto`}>
      <div className="card-header d-flex justify-content-between align-items-center py-3 px-4 border-bottom">
        <div>
          <h5 className="m-0 d-flex align-items-center fw-bold">
            {getDialogTitle()}
            <span className="badge bg-primary ms-2">{selectedModel}</span>
          </h5>
        </div>
        <button 
          className="btn-close" 
          onClick={handleClose}
          aria-label="Close"
        />
      </div>
      
      <div className="card-body p-4">
        <div className="code-section mb-4">
          <h6 className="mb-3 fw-bold border-bottom pb-2">
            <i className="fa fa-code me-2"></i>
            Cell content ({cellType}):
          </h6>
          <div className="bg-light rounded border p-3 mb-2 overflow-auto">
            {renderCodeBlock(cellContent, cellType === 'code' ? 'python' : 'markdown')}
          </div>
          <div className="d-flex justify-content-end">
            <small className="text-muted">
              {cellContent.split('\n').length} lines • {cellContent.length} characters
            </small>
          </div>
        </div>
        
        {isLoading && (
          <div className="alert alert-info d-flex align-items-center shadow-sm mb-4">
            <div className="spinner-border spinner-border-sm me-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <div>
              <strong>Processing with {selectedModel}...</strong>
              <div className="text-muted small mt-1">This may take a few moments depending on the model and query.</div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="alert alert-danger shadow-sm mb-4">
            <h6 className="fw-bold alert-heading mb-2">Error encountered:</h6>
            <p className="mb-0">{error}</p>
          </div>
        )}
        
        {result && (
          <div className="result-container">
            <div className="card result-card border-0 shadow-sm">
              <div className="card-header bg-transparent py-3 px-4 border-bottom">
                <div className="d-flex justify-content-between align-items-center">
                  <h6 className="m-0 fw-bold">
                    <i className="fa fa-robot me-2"></i>
                    AI Response
                  </h6>
                  {executionTime && (
                    <span className="badge bg-light text-dark">
                      Execution time: {(executionTime / 1000).toFixed(2)}s
                    </span>
                  )}
                </div>
              </div>
              <div className="card-body response-content px-4 py-3">
                <ReactMarkdown components={{
                  code({node, inline, className, children, ...props}) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <div className="code-block-wrapper my-3">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <small className="text-muted">{match[1]}</small>
                        </div>
                        <pre className="bg-light p-3 rounded border shadow-sm overflow-auto">
                          <code className={className} {...props}>
                            {String(children).replace(/\n$/, '')}
                          </code>
                        </pre>
                      </div>
                    ) : (
                      <code className="bg-light px-2 py-1 rounded" {...props}>
                        {children}
                      </code>
                    );
                  },
                  h1: ({node, ...props}) => <h1 className="border-bottom pb-2 mt-4 mb-3 fs-4" {...props} />,
                  h2: ({node, ...props}) => <h2 className="border-bottom pb-2 mt-4 mb-3 fs-5" {...props} />,
                  h3: ({node, ...props}) => <h3 className="mt-4 mb-3 fs-6" {...props} />,
                  table: ({node, ...props}) => <div className="table-responsive my-3"><table className="table table-bordered table-sm" {...props} /></div>,
                  li: ({node, ...props}) => <li className="mb-1" {...props} />,
                  blockquote: ({node, ...props}) => <blockquote className="blockquote border-start border-3 ps-3 my-3 text-muted" {...props} />
                }}>
                  {result}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Use an interface definition instead of class
export interface CellToolbarButtonOptions {
  className: string;
  onClick: () => void;
  tooltip: string;
  icon: any;
  label: string;
  cell: Cell;
}

export function createCellToolbarButton(cell: Cell): CellToolbarButtonOptions {
  return {
    className: 'jp-AI-CellToolbarButton',
    onClick: () => {
      // This will be overridden by the notebook extension
      console.log('Cell toolbar button clicked');
    },
    tooltip: 'Ask AI about this cell',
    icon: searchIcon,
    label: 'Ask',
    cell
  };
}

export { CellContextMenu }; 