import React, { useState, useEffect } from 'react';
import { searchIcon, buildIcon, bugIcon, userIcon } from '@jupyterlab/ui-components';
import { Cell } from '@jupyterlab/cells';
import { ServerConnection } from '@jupyterlab/services';
import ReactMarkdown from 'react-markdown';

import { analyzeCell, CellAnalysisResult } from '../services/cell';
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
  const [estimatedTime, setEstimatedTime] = useState<string>('');
  const [isDataScienceQuery, setIsDataScienceQuery] = useState<boolean>(false);

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
    setIsLoading(true);
    setError('');
    setResult(null);
    setExecutionTime(null);
    setSelectedAction(question);
    
    // Determine if this is a data science query
    const isDSQuery = question.toLowerCase().includes('dataframe') || 
                    question.toLowerCase().includes('data') ||
                    question.toLowerCase().includes('plot') ||
                    question.toLowerCase().includes('visualize') ||
                    question.toLowerCase().includes('analyze');
    
    setIsDataScienceQuery(isDSQuery);
    
    // Only set estimated time for data science queries
    if (isDSQuery) {
      setEstimatedTime('30-60 seconds for data analysis');
    }
    
    try {
      const cellContent = getCellContent();
      const cellType = getCellType();
      
      // Use the new cell service
      const result = await analyzeCell(
        selectedModel,
        cellContent,
        question,
        cellType
      );
      
      if (result.error) {
        setError(result.error);
      } else if (result.message && result.message.content) {
        setResult(result.message.content);
      } else {
        setError('Received an empty response from the model');
      }
    } catch (error) {
      console.error('Error analyzing cell:', error);
      // Fallback to old service if needed
      try {
        if (error.toString().includes('404')) {
          console.log('Falling back to legacy cell analysis API');
          const cellContent = getCellContent();
          const cellType = getCellType();
          
          const result = await analyzeCellContent(
            selectedModel,
            cellContent,
            cellType,
            question
          );
          
          if (result && result.content) {
            setResult(result.content);
          } else {
            setError('Received an empty response from the model');
          }
        } else {
          setError(`Error: ${error.toString()}`);
        }
      } catch (fallbackError) {
        setError(`Error analyzing cell: ${error.toString()}\nFallback also failed: ${fallbackError.toString()}`);
      }
    } finally {
      setIsLoading(false);
      setEstimatedTime('');
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
    <div className={`cell-context-menu ${animationClass}`}>
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          {getDialogTitle()}
          <button type="button" className="btn-close" onClick={handleClose} />
        </div>
        <div className="card-body">
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
            <div className="alert alert-info mt-3 jp-AI-CellAnalysis-Loading">
              <div className="d-flex align-items-center">
                <div className="jp-AI-CellAnalysis-LoadingSpinner me-2"></div>
                <div className="jp-AI-CellAnalysis-LoadingText">
                  <strong>Analyzing...</strong>
                  {isDataScienceQuery && (
                    <div className="jp-AI-CellAnalysis-TimeRemaining mt-1">
                      <small>{estimatedTime}</small>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {error && (
            <div className="alert alert-danger mt-3">
              <strong>Error:</strong> {error}
            </div>
          )}
          
          {result && (
            <div className={`mt-3 jp-AI-CellAnalysis-Result ${isDataScienceQuery ? 'jp-AI-DataScience-Result' : ''}`}>
              <ReactMarkdown
                components={{
                  code: renderCodeBlock as React.ComponentType<any>,
                  table: ({node, ...props}) => (
                    <div className="jp-AI-DataScience-Table">
                      <table className="table table-striped table-hover" {...props} />
                    </div>
                  ),
                  img: ({node, ...props}) => (
                    <div className="jp-AI-DataScience-Visualization">
                      <img className="img-fluid" {...props} />
                    </div>
                  )
                }}
              >
                {result}
              </ReactMarkdown>
              
              {executionTime && (
                <div className="text-muted mt-2">
                  <small>Response time: {(executionTime / 1000).toFixed(1)}s</small>
                </div>
              )}
            </div>
          )}
        </div>
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