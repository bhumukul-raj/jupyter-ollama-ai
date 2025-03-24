import React, { useState, useEffect, useRef } from 'react';
import { Cell } from '@jupyterlab/cells';
import ReactMarkdown from 'react-markdown';
import { analyzeCell, CellAnalysisResult } from '../services/cell';
import { analyzeCellContent } from '../services/ollama';

/**
 * Props for the CellContextMenu component
 */
export interface CellContextMenuProps {
  cell: Cell;
  onClose: () => void;
  selectedModel: string;
  initialAction?: string;
}

/**
 * A component that renders a context menu for analyzing cell content
 */
export const CellContextMenu: React.FC<CellContextMenuProps> = ({
  cell,
  onClose,
  selectedModel,
  initialAction
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<string | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [animationClass, setAnimationClass] = useState<string>('animate-in');
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<string>('');
  const [isDataScienceQuery, setIsDataScienceQuery] = useState<boolean>(false);
  
  const resultRef = useRef<HTMLDivElement>(null);

  // If an initial action is provided, execute it automatically
  useEffect(() => {
    if (initialAction) {
      handleQuestionSelect(initialAction);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll to results when they are available
  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [result]);

  /**
   * Get the content of the cell
   */
  const getCellContent = (): string => {
    const model = cell.model;
    if (!model) {
      return '';
    }
    return model.sharedModel?.getSource() || '';
  };

  /**
   * Get the type of the cell (code or markdown)
   */
  const getCellType = (): string => {
    return cell.model?.type || 'code';
  };

  /**
   * Handle selecting a question to ask about the cell
   */
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
    
    const startTime = Date.now();
    
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
      
      const endTime = Date.now();
      setExecutionTime(endTime - startTime);
      
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
          
          const fallbackStartTime = Date.now();
          const result = await analyzeCellContent(
            selectedModel,
            cellContent,
            cellType,
            question
          );
          
          const fallbackEndTime = Date.now();
          setExecutionTime(fallbackEndTime - fallbackStartTime);
          
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

  /**
   * Render a code block in the markdown
   */
  const renderCodeBlock = (props: any) => {
    const { children, className, node, ...rest } = props;
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : '';
    
    return (
      <pre className={`bg-light p-3 rounded border ${className}`}>
        <code {...rest}>{children}</code>
      </pre>
    );
  };

  /**
   * Handle closing the dialog
   */
  const handleClose = () => {
    setAnimationClass('animate-out');
    // Wait for animation to complete before calling onClose
    setTimeout(() => {
      onClose();
    }, 200);
  };

  /**
   * Get the title for the dialog based on the selected action
   */
  const getDialogTitle = () => {
    if (selectedAction) {
      return <span>{selectedAction}</span>;
    }
    return <span>AI Cell Analysis</span>;
  };

  // List of common questions to ask
  const questions = [
    'Explain this code',
    'Check for errors',
    'Optimize this code',
    'Complete this code',
    'Generate tests',
    'Document this code',
    'Analyze DataFrame',
    'Suggest visualizations'
  ];

  // For data science cells
  const dataScienceQuestions = [
    'Analyze DataFrame',
    'Suggest visualizations',
    'Improve data cleaning',
    'Optimize data operations',
    'Explain ML model'
  ];

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
              Cell Content <span className="badge bg-secondary ms-2">{getCellType()}</span>
            </h6>
            <pre className="bg-light p-3 border rounded code-preview">
              <code>{getCellContent().slice(0, 500)}{getCellContent().length > 500 ? '...' : ''}</code>
            </pre>
          </div>
          
          <div className="actions mb-4">
            <h6 className="mb-3 fw-bold border-bottom pb-2">What would you like to do?</h6>
            <div className="d-flex flex-wrap gap-2">
              {(getCellType() === 'code' && getCellContent().toLowerCase().includes('import pandas') || 
                getCellContent().toLowerCase().includes('pd.') || 
                getCellContent().toLowerCase().includes('dataframe') ||
                getCellContent().toLowerCase().includes('numpy') ||
                getCellContent().toLowerCase().includes('plt.') ||
                getCellContent().toLowerCase().includes('matplotlib')
              ) ? 
                dataScienceQuestions.map(q => (
                  <button
                    key={q}
                    className={`btn btn-action ${selectedAction === q ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => handleQuestionSelect(q)}
                    disabled={isLoading}
                  >
                    {q}
                  </button>
                )) :
                questions.map(q => (
                  <button
                    key={q}
                    className={`btn btn-action ${selectedAction === q ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => handleQuestionSelect(q)}
                    disabled={isLoading}
                  >
                    {q}
                  </button>
                ))
              }
            </div>
          </div>
          
          {/* Loading indicator with progress and estimated time */}
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
          
          {/* Error message */}
          {error && (
            <div className="alert alert-danger mt-3">
              <strong>Error:</strong> {error}
            </div>
          )}
          
          {/* Result presentation with special handling for data science content */}
          {result && (
            <div 
              ref={resultRef}
              className={`mt-3 jp-AI-CellAnalysis-Result ${isDataScienceQuery ? 'jp-AI-DataScience-Result' : ''}`}
            >
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
                      <img className="img-fluid" {...props} alt="" />
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