import React, { useState, useEffect, useRef } from 'react';
import { INotebookTracker } from '@jupyterlab/notebook';
import { OllamaService } from '../services/OllamaService';
// Other imports as needed throughout the file

interface Message {
  role: 'user' | 'assistant';
  content: string;
  status?: 'loading' | 'error' | 'complete';
  timestamp?: {
    start?: number;
    end?: number;
  };
  fromCache?: boolean;
  requestId?: string;
}

interface AIAssistantPanelProps {
  notebooks: INotebookTracker;
}

// Create a singleton instance of OllamaService to be shared across all components
const ollamaServiceInstance = new OllamaService();

// Enum for different tabs
type TabType = 'chat' | 'analyze' | 'improve';

// Function to format timestamp difference in a human-readable way
const formatTimeDiff = (start?: number, end?: number): string => {
  if (!start || !end) return '';
  
  const diffMs = end - start;
  if (diffMs < 1000) {
    return `${diffMs}ms`;
  } else if (diffMs < 60000) {
    return `${(diffMs / 1000).toFixed(1)}s`;
  } else {
    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
};

// Function to format absolute timestamp
const formatTimestamp = (timestamp?: number): string => {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

// Simple syntax highlighting function for code
const applySyntaxHighlighting = (code: string, language: string): JSX.Element => {
  if (!code) return <></>;
  
  // Different patterns for different languages
  if (language === 'python') {
    // Python syntax highlighting patterns
    const keywords = /\b(and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield)\b/g;
    const builtins = /\b(True|False|None|self|print|len|range|dict|list|set|int|str|float|bool|type|object)\b/g;
    const strings = /(\".*?\"|\'.*?\')/g;
    const comments = /(#.*$)/gm;
    const numbers = /\b(\d+(\.\d+)?)\b/g;
    const functions = /\b([a-zA-Z_][a-zA-Z0-9_]*(?=\s*\())\b/g;
    
    // Apply highlighting by wrapping with spans with CSS classes
    let highlighted = code
      .replace(keywords, '<span class="jp-AIAssistant-code-keyword">$&</span>')
      .replace(builtins, '<span class="jp-AIAssistant-code-builtin">$&</span>')
      .replace(strings, '<span class="jp-AIAssistant-code-string">$&</span>')
      .replace(comments, '<span class="jp-AIAssistant-code-comment">$&</span>')
      .replace(numbers, '<span class="jp-AIAssistant-code-number">$&</span>')
      .replace(functions, '<span class="jp-AIAssistant-code-function">$&</span>');
      
    return <code dangerouslySetInnerHTML={{ __html: highlighted }} />;
  } 
  else if (language === 'javascript' || language === 'js' || language === 'typescript' || language === 'ts') {
    // JavaScript/TypeScript syntax highlighting patterns
    const keywords = /\b(break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|finally|for|function|if|import|in|instanceof|new|return|super|switch|this|throw|try|typeof|var|void|while|with|yield|let|static|enum|await|async)\b/g;
    const builtins = /\b(document|window|Array|String|Object|Number|Boolean|Function|RegExp|Math|Date|null|undefined|NaN|Infinity)\b/g;
    const strings = /(\".*?\"|\'.*?\'|`.*?`)/g;
    const comments = /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm;
    const numbers = /\b(\d+(\.\d+)?)\b/g;
    const functions = /\b([a-zA-Z_][a-zA-Z0-9_]*(?=\s*\())\b/g;
    
    let highlighted = code
      .replace(keywords, '<span class="jp-AIAssistant-code-keyword">$&</span>')
      .replace(builtins, '<span class="jp-AIAssistant-code-builtin">$&</span>')
      .replace(strings, '<span class="jp-AIAssistant-code-string">$&</span>')
      .replace(comments, '<span class="jp-AIAssistant-code-comment">$&</span>')
      .replace(numbers, '<span class="jp-AIAssistant-code-number">$&</span>')
      .replace(functions, '<span class="jp-AIAssistant-code-function">$&</span>');
      
    return <code dangerouslySetInnerHTML={{ __html: highlighted }} />;
  }
  else {
    // Generic highlighting for other languages
    const keywords = /\b(if|else|for|while|return|function|class|import|export|try|catch|switch|case|break|continue|default|public|private|protected|static|void|const|let|var)\b/g;
    const strings = /(\".*?\"|\'.*?\'|`.*?`)/g;
    const comments = /(\/\/.*$|\/\*[\s\S]*?\*\/|#.*$)/gm;
    const numbers = /\b(\d+(\.\d+)?)\b/g;
    
    let highlighted = code
      .replace(keywords, '<span class="jp-AIAssistant-code-keyword">$&</span>')
      .replace(strings, '<span class="jp-AIAssistant-code-string">$&</span>')
      .replace(comments, '<span class="jp-AIAssistant-code-comment">$&</span>')
      .replace(numbers, '<span class="jp-AIAssistant-code-number">$&</span>');
      
    return <code dangerouslySetInnerHTML={{ __html: highlighted }} />;
  }
};

// Helper to format code blocks in assistant messages
const formatMessageWithCodeBlocks = (content: string): JSX.Element => {
  // Regular expression to find code blocks with optional language
  const codeBlockRegex = /```([a-zA-Z]*)\n([\s\S]*?)```/g;
  const parts: JSX.Element[] = [];
  let lastIndex = 0;
  let match;
  
  // Process each code block match
  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before the code block
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`} className="jp-AIAssistant-text">
          {formatText(content.substring(lastIndex, match.index))}
        </span>
      );
    }
    
    // Extract language and code
    const language = match[1] || 'plaintext';
    const code = match[2];
    
    // Add formatted code block with syntax highlighting
    parts.push(
      <div key={`code-${match.index}`} className="jp-AIAssistant-code-block">
        <div className="jp-AIAssistant-code-header">
          <span className="jp-AIAssistant-code-language">{language}</span>
        </div>
        <pre className="jp-AIAssistant-code">
          {applySyntaxHighlighting(code, language)}
        </pre>
      </div>
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text after the last code block
  if (lastIndex < content.length) {
    parts.push(
      <span key={`text-${lastIndex}`} className="jp-AIAssistant-text">
        {formatText(content.substring(lastIndex))}
      </span>
    );
  }
  
  // If no code blocks found, format the entire content as text
  if (parts.length === 0) {
    return <span className="jp-AIAssistant-text">{formatText(content)}</span>;
  }
  
  return <div className="jp-AIAssistant-formatted-content">{parts}</div>;
};

// Helper to handle line breaks in text
const formatText = (text: string): JSX.Element[] => {
  return text.split('\n').map((line, i) => (
    <React.Fragment key={i}>
      {line}
      {i < text.split('\n').length - 1 && <br />}
    </React.Fragment>
  ));
};

export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({ notebooks }) => {
  // Common state
  const [selectedModel, setSelectedModel] = useState<string>('llama3:latest');
  const [models, setModels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [modelError, setModelError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [autoScroll, setAutoScroll] = useState(true);
  
  // Chat-specific state
  const [chatMessages, setChatMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: 'Hello! I\'m your AI assistant. How can I help you today?', 
      status: 'complete',
      timestamp: {
        start: Date.now(),
        end: Date.now()
      }
    }
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  
  // Analyze-specific state
  const [analyzeMessages, setAnalyzeMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: 'I can analyze your code for errors and issues. Select a cell and click "Analyze Code".', 
      status: 'complete',
      timestamp: {
        start: Date.now(),
        end: Date.now()
      }
    }
  ]);
  
  // Improve-specific state
  const [improveMessages, setImproveMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: 'I can suggest improvements for your code. Select a cell and click "Improve Code".', 
      status: 'complete',
      timestamp: {
        start: Date.now(),
        end: Date.now()
      }
    }
  ]);
  
  // Create refs for conversation containers
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const analyzeContainerRef = useRef<HTMLDivElement>(null);
  const improveContainerRef = useRef<HTMLDivElement>(null);

  // Generate a unique ID for requests
  const generateRequestId = () => {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  };

  // Get the active container ref based on the active tab
  const getActiveContainerRef = () => {
    switch (activeTab) {
      case 'chat':
        return chatContainerRef;
      case 'analyze':
        return analyzeContainerRef;
      case 'improve':
        return improveContainerRef;
      default:
        return chatContainerRef;
    }
  };

  // Handle auto scrolling if enabled
  const handleAutoScroll = () => {
    if (autoScroll) {
      const containerRef = getActiveContainerRef();
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    }
  };

  // Effect to handle scrolling when messages change
  useEffect(() => {
    handleAutoScroll();
  }, [chatMessages, analyzeMessages, improveMessages, activeTab]);

  useEffect(() => {
    // Fetch available models when the component mounts
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const availableModels = await ollamaServiceInstance.getAvailableModels();
      if (availableModels.length > 0) {
        setModels(availableModels);
        
        // Set the default model to the first one in the list
        if (!availableModels.includes(selectedModel)) {
          setSelectedModel(availableModels[0]);
        }
      } else {
        setModelError('No models found. Make sure Ollama is running with "ollama serve" and has models installed.');
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      setModelError('Error fetching models. Make sure Ollama is running with "ollama serve".');
    }
  };

  const handleChatInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setChatInput(e.target.value);
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedModel(e.target.value);
  };

  const getNotebookContent = (): string => {
    let content = '';
    try {
      console.debug('Attempting to get notebook content...');
      if (notebooks.currentWidget) {
        console.debug('Notebook widget found');
        const notebook = notebooks.currentWidget.content;
        const model = notebook.model;
        
        if (model) {
          console.debug('Notebook model found, cell count:', model.cells.length);
          
          // Get active cell information
          const activeCellIndex = notebook.activeCellIndex;
          console.debug('Active cell index:', activeCellIndex);
          
          const cells = model.cells;
          // Convert to a structured format with cell types and indices
          const cellContents = [];
          
          for (let i = 0; i < cells.length; i++) {
            const cellModel = cells.get(i);
            const cellType = cellModel.type;
            // Get the cell content as a string - Fix for [object Object] issue
            let cellContent = '';
            try {
              // Access the cell content using the cellModel toString method properly
              cellContent = cellModel.toString();
              // If toString returns [object Object], try to get raw content
              if (cellContent === '[object Object]') {
                // Try to get the value as a string directly from model
                cellContent = cellModel.sharedModel?.source || '';
              }
            } catch (e) {
              cellContent = '// Unable to extract cell content';
              console.error('Error extracting cell content:', e);
            }
            
            // Add more context about the cell
            const isActive = (i === activeCellIndex);
            cellContents.push(
              `--- Cell ${i+1}/${cells.length} [${cellType}]${isActive ? ' (ACTIVE)' : ''} ---\n${cellContent}`
            );
          }
          
          content = cellContents.join('\n\n');
          console.debug('Total notebook content length:', content.length);
        }
      }
    } catch (error) {
      console.error('Error getting notebook content:', error);
    }
    return content;
  };

  const getActiveCellContent = (): { content: string, cellType: string } | null => {
    try {
      if (notebooks.currentWidget) {
        const notebook = notebooks.currentWidget.content;
        const model = notebook.model;
        
        if (model) {
          const activeCellIndex = notebook.activeCellIndex;
          const activeCell = model.cells.get(activeCellIndex);
          
          if (activeCell) {
            // Fix for [object Object] issue
            let content = '';
            try {
              // Access the cell content using the cellModel toString method properly
              content = activeCell.toString();
              // If toString returns [object Object], try to get raw content
              if (content === '[object Object]') {
                // Try to get the value as a string directly from model
                content = activeCell.sharedModel?.source || '';
              }
            } catch (e) {
              content = '// Unable to extract cell content';
              console.error('Error extracting active cell content:', e);
            }
            
            console.debug(`Active cell content (${activeCell.type}):`, 
              content.length > 20 ? content.substring(0, 20) + '...' : content);
              
            return {
              content: content,
              cellType: activeCell.type
            };
          }
        }
      }
    } catch (error) {
      console.error('Error getting active cell content:', error);
    }
    return null;
  };

  // Function to analyze the code in the current cell
  const analyzeCurrentCell = async () => {
    // Get the content of the active cell
    const activeCellData = getActiveCellContent();
    if (!activeCellData) {
      setAnalyzeMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'No active cell found. Please select a cell and try again.',
          status: 'error',
          timestamp: {
            start: Date.now(),
            end: Date.now()
          }
        }
      ]);
      return;
    }

    console.debug('Active cell content (code):', activeCellData.content);

    // Create user message
    const userMessage: Message = {
      role: 'user',
      content: `Analyze this code: \n\`\`\`\n${activeCellData.content}\n\`\`\``,
      status: 'complete',
      timestamp: {
        start: Date.now(),
        end: Date.now()
      }
    };

    // Create loading message
    const requestStartTime = Date.now();
    const requestId = generateRequestId();
    const thinkingMessage: Message = {
      role: 'assistant',
      content: 'Analyzing code...',
      status: 'loading',
      timestamp: {
        start: requestStartTime
      },
      requestId
    };

    setAnalyzeMessages(prev => [...prev, userMessage, thinkingMessage]);
    setIsLoading(true);

    try {
      // Use streaming response for better user experience
      let responseComplete = false;
      
      ollamaServiceInstance.analyzeCode(
        activeCellData.content, 
        selectedModel,
        (partialResponse, done, fromCache) => {
          // Update the message with each partial response
          setAnalyzeMessages(prev => {
            const updatedMessages = [...prev];
            const lastMessage = updatedMessages[updatedMessages.length - 1];
            
            if (lastMessage && lastMessage.status === 'loading') {
              lastMessage.content = partialResponse;
              lastMessage.fromCache = fromCache;
              
              // When the response is complete, update the status and timestamp
              if (done && !responseComplete) {
                lastMessage.status = 'complete';
                lastMessage.timestamp = {
                  ...lastMessage.timestamp,
                  end: Date.now()
                };
                responseComplete = true;
                setIsLoading(false);
              }
            }
            
            return updatedMessages;
          });
        },
        requestId
      );
    } catch (error) {
      setAnalyzeMessages(prev => {
        const updatedMessages = [...prev];
        if (updatedMessages.length > 0) {
          const lastMessage = updatedMessages[updatedMessages.length - 1];
          if (lastMessage.status === 'loading') {
            lastMessage.content = 'Error: Failed to analyze code. Please try again.';
            lastMessage.status = 'error';
            lastMessage.timestamp = {
              ...lastMessage.timestamp,
              end: Date.now()
            };
          }
        }
        return updatedMessages;
      });
      setIsLoading(false);
    }
  };
  
  // Function to get suggestions for improving the current cell
  const improveCurrentCell = async () => {
    // Get the content of the active cell
    const activeCellData = getActiveCellContent();
    if (!activeCellData) {
      setImproveMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'No active cell found. Please select a cell and try again.',
          status: 'error',
          timestamp: {
            start: Date.now(),
            end: Date.now()
          }
        }
      ]);
      return;
    }

    console.debug('Active cell content (code):', activeCellData.content);

    // Create user message
    const userMessage: Message = {
      role: 'user',
      content: `Improve this code: \n\`\`\`\n${activeCellData.content}\n\`\`\``,
      status: 'complete',
      timestamp: {
        start: Date.now(),
        end: Date.now()
      }
    };

    // Create loading message
    const requestStartTime = Date.now();
    const requestId = generateRequestId();
    const thinkingMessage: Message = {
      role: 'assistant',
      content: 'Finding improvements...',
      status: 'loading',
      timestamp: {
        start: requestStartTime
      },
      requestId
    };

    setImproveMessages(prev => [...prev, userMessage, thinkingMessage]);
    setIsLoading(true);

    try {
      // Use streaming response for better user experience
      let responseComplete = false;
      
      ollamaServiceInstance.suggestCodeImprovements(
        activeCellData.content, 
        selectedModel,
        (partialResponse, done, fromCache) => {
          // Update the message with each partial response
          setImproveMessages(prev => {
            const updatedMessages = [...prev];
            const lastMessage = updatedMessages[updatedMessages.length - 1];
            
            if (lastMessage && lastMessage.status === 'loading') {
              lastMessage.content = partialResponse;
              lastMessage.fromCache = fromCache;
              
              // When the response is complete, update the status and timestamp
              if (done && !responseComplete) {
                lastMessage.status = 'complete';
                lastMessage.timestamp = {
                  ...lastMessage.timestamp,
                  end: Date.now()
                };
                responseComplete = true;
                setIsLoading(false);
              }
            }
            
            return updatedMessages;
          });
        },
        requestId
      );
    } catch (error) {
      setImproveMessages(prev => {
        const updatedMessages = [...prev];
        if (updatedMessages.length > 0) {
          const lastMessage = updatedMessages[updatedMessages.length - 1];
          if (lastMessage.status === 'loading') {
            lastMessage.content = 'Error: Failed to improve code. Please try again.';
            lastMessage.status = 'error';
            lastMessage.timestamp = {
              ...lastMessage.timestamp,
              end: Date.now()
            };
          }
        }
        return updatedMessages;
      });
      setIsLoading(false);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: chatInput,
      status: 'complete',
      timestamp: {
        start: Date.now(),
        end: Date.now()
      }
    };

    const requestStartTime = Date.now();
    const requestId = generateRequestId();
    const thinkingMessage: Message = {
      role: 'assistant',
      content: 'Thinking...',
      status: 'loading',
      timestamp: {
        start: requestStartTime
      },
      requestId
    };

    setChatMessages(prev => [...prev, userMessage, thinkingMessage]);
    setChatInput('');
    setIsLoading(true);

    try {
      // Use streaming for better user experience
      let responseComplete = false;
      
      // Start the streaming response
      ollamaServiceInstance.generateResponse(
        chatInput, 
        selectedModel, 
        undefined, 
        (partialResponse, done, fromCache) => {
          // Update the message with each partial response
          setChatMessages(prev => {
            const updatedMessages = [...prev];
            const lastMessage = updatedMessages[updatedMessages.length - 1];
            
            if (lastMessage && lastMessage.status === 'loading') {
              lastMessage.content = partialResponse;
              lastMessage.fromCache = fromCache;
              
              // When the response is complete, update the status and timestamp
              if (done && !responseComplete) {
                lastMessage.status = 'complete';
                lastMessage.timestamp = {
                  ...lastMessage.timestamp,
                  end: Date.now()
                };
                responseComplete = true;
                setIsLoading(false);
              }
            }
            
            return updatedMessages;
          });
        },
        requestId
      );
    } catch (error) {
      setChatMessages(prev => {
        const updatedMessages = [...prev];
        if (updatedMessages.length > 0) {
          const lastMessage = updatedMessages[updatedMessages.length - 1];
          if (lastMessage.status === 'loading') {
            lastMessage.content = 'Error: Failed to get response from Ollama. Please try again.';
            lastMessage.status = 'error';
            lastMessage.timestamp = {
              ...lastMessage.timestamp,
              end: Date.now()
            };
          }
        }
        return updatedMessages;
      });
      setIsLoading(false);
    }
  };

  const retryChatMessage = async () => {
    // Get the last user message
    let lastUserMessage: Message | undefined;
    for (let i = chatMessages.length - 1; i >= 0; i--) {
      if (chatMessages[i].role === 'user') {
        lastUserMessage = chatMessages[i];
        break;
      }
    }
    
    if (!lastUserMessage || isLoading) {
      return;
    }
    
    // Filter out the error message
    const filteredMessages = chatMessages.filter(msg => msg.status !== 'error');
    
    // Add a new thinking message
    const thinkingMessage: Message = { 
      role: 'assistant', 
      content: 'Thinking...', 
      status: 'loading',
      timestamp: {
        start: Date.now()
      }
    };
    
    setChatMessages([...filteredMessages, thinkingMessage]);
    setIsLoading(true);
    
    try {
      // Get notebook content for context
      const notebookContent = getNotebookContent();
      
      // Call Ollama API
      const response = await ollamaServiceInstance.generateResponse(
        lastUserMessage.content,
        selectedModel,
        notebookContent
      );
      
      // Replace the thinking message with the actual response
      setChatMessages(prev => {
        const updatedMessages = [...prev];
        if (updatedMessages.length > 0 && updatedMessages[updatedMessages.length - 1].status === 'loading') {
          updatedMessages[updatedMessages.length - 1] = {
            role: 'assistant',
            content: response,
            status: 'complete',
            timestamp: {
              start: Date.now()
            }
          };
        }
        return updatedMessages;
      });
    } catch (error) {
      console.error('Error retrying response:', error);
      
      setChatMessages(prev => {
        const updatedMessages = [...prev];
        if (updatedMessages.length > 0 && updatedMessages[updatedMessages.length - 1].status === 'loading') {
          updatedMessages[updatedMessages.length - 1] = {
            role: 'assistant',
            content: 'Sorry, I encountered an error while generating a response. Please try again.',
            status: 'error',
            timestamp: {
              start: Date.now()
            }
          };
        }
        return updatedMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const retryAnalyzeMessage = async () => {
    // We just need to re-run the analysis on the current cell
    if (isLoading) return;
    analyzeCurrentCell();
  };

  const retryImproveMessage = async () => {
    // We just need to re-run the improvement on the current cell
    if (isLoading) return;
    improveCurrentCell();
  };

  // Function to handle retry based on active tab
  const handleRetry = () => {
    switch (activeTab) {
      case 'chat':
        retryChatMessage();
        break;
      case 'analyze':
        retryAnalyzeMessage();
        break;
      case 'improve':
        retryImproveMessage();
        break;
    }
  };

  // Stop ongoing request
  const stopRequest = (requestId?: string) => {
    if (!requestId) return;
    
    ollamaServiceInstance.cancelRequest(requestId);
    console.log(`Cancelled request: ${requestId}`);
  };

  // Cancel the most recent ongoing request for the active tab
  const stopCurrentRequest = () => {
    let messages: Message[] = [];
    
    switch (activeTab) {
      case 'chat':
        messages = chatMessages;
        break;
      case 'analyze':
        messages = analyzeMessages;
        break;
      case 'improve':
        messages = improveMessages;
        break;
    }
    
    // Find the most recent loading message
    const loadingMessage = [...messages].reverse().find(msg => msg.status === 'loading');
    if (loadingMessage && loadingMessage.requestId) {
      stopRequest(loadingMessage.requestId);
    }
  };

  // Regenerate the last response
  const regenerateResponse = () => {
    switch (activeTab) {
      case 'chat':
        retryChatMessage();
        break;
      case 'analyze':
        retryAnalyzeMessage();
        break;
      case 'improve':
        retryImproveMessage();
        break;
    }
  };

  const renderMessage = (message: Message, index: number) => {
    const messageClasses = `jp-AIAssistant-message jp-AIAssistant-message-${message.role} ${
      message.status === 'loading' ? 'jp-AIAssistant-message-loading' : ''
    } ${message.status === 'error' ? 'jp-AIAssistant-error' : ''}`;

    // Format the message content
    const formattedContent = message.role === 'assistant' && message.status === 'complete'
      ? formatMessageWithCodeBlocks(message.content)
      : <span className="jp-AIAssistant-text">{message.content}</span>;

    return (
      <div key={index} className={messageClasses}>
        {formattedContent}
        {renderTimestamp(message)}
        {message.status === 'loading' && (
          <button className="jp-AIAssistant-action-button" onClick={() => stopRequest(message.requestId)}>
            Stop
          </button>
        )}
        {message.status === 'error' && (
          <button className="jp-AIAssistant-retry" onClick={handleRetry}>
            Retry
          </button>
        )}
        {message.status === 'complete' && message.role === 'assistant' && (
          <button className="jp-AIAssistant-action-button" onClick={regenerateResponse}>
            Refresh
          </button>
        )}
      </div>
    );
  };

  const renderTimestamp = (message: Message) => {
    if (!message.timestamp) return null;
    
    const { start, end } = message.timestamp;
    let className = 'jp-AIAssistant-timestamp';
    
    if (message.role === 'user') {
      className += ' jp-AIAssistant-timestamp-user';
    } else if (message.status === 'loading') {
      className += ' jp-AIAssistant-timestamp-loading';
    } else if (message.status === 'error') {
      className += ' jp-AIAssistant-timestamp-error';
    }
    
    if (message.role === 'assistant' && message.status === 'complete') {
      return (
        <div className={className}>
          {formatTimestamp(start)} {end && `• ${formatTimeDiff(start, end)}`}
          {message.fromCache && <span className="jp-AIAssistant-cache-indicator"> (from cache)</span>}
        </div>
      );
    }
    
    return (
      <div className={className}>
        {formatTimestamp(start)}
      </div>
    );
  };

  return (
    <div className="jp-AIAssistant">
      <div className="jp-AIAssistant-header">
        <div className="jp-AIAssistant-title">Ollama AI Assistant</div>
      </div>
      
      <div className="jp-AIAssistant-scrollControl">
        <label>
          <input 
            type="checkbox" 
            checked={autoScroll} 
            onChange={() => setAutoScroll(!autoScroll)} 
          />
          Auto-scroll
        </label>
      </div>
      
      <div className="jp-AIAssistant-modelSelector">
        <label htmlFor="model-selector">Model:</label>
        <select 
          id="model-selector" 
          value={selectedModel} 
          onChange={handleModelChange}
          disabled={isLoading || models.length === 0}
          className="jp-AIAssistant-modelSelect"
        >
          {models.length === 0 && <option value="">Loading models...</option>}
          {models.map(model => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
        {modelError && <div className="jp-AIAssistant-modelError">{modelError}</div>}
      </div>
      
      <div className="jp-AIAssistant-tabs">
        <button 
          className={`jp-AIAssistant-tab ${activeTab === 'chat' ? 'jp-AIAssistant-tab-active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          Chat
        </button>
        <button 
          className={`jp-AIAssistant-tab ${activeTab === 'analyze' ? 'jp-AIAssistant-tab-active' : ''}`}
          onClick={() => setActiveTab('analyze')}
        >
          Analyze Code
        </button>
        <button 
          className={`jp-AIAssistant-tab ${activeTab === 'improve' ? 'jp-AIAssistant-tab-active' : ''}`}
          onClick={() => setActiveTab('improve')}
        >
          Improve Code
        </button>
      </div>
      
      {activeTab === 'chat' && (
        <>
          <div className="jp-AIAssistant-conversation" ref={chatContainerRef}>
            {chatMessages.map(renderMessage)}
          </div>
          <form className="jp-AIAssistant-input-form" onSubmit={handleChatSubmit}>
            <textarea 
              className="jp-AIAssistant-input-textarea"
              value={chatInput}
              onChange={handleChatInputChange}
              placeholder="Ask me anything..."
              disabled={isLoading}
            />
            <div className="jp-AIAssistant-input-actions">
              {isLoading && (
                <button 
                  type="button"
                  className="jp-AIAssistant-input-button"
                  onClick={stopCurrentRequest}
                >
                  Stop
                </button>
              )}
              <button 
                type="submit" 
                className="jp-AIAssistant-input-button"
                disabled={isLoading || !chatInput.trim()}
              >
                Send
              </button>
            </div>
          </form>
        </>
      )}
      
      {activeTab === 'analyze' && (
        <>
          <div className="jp-AIAssistant-conversation" ref={analyzeContainerRef}>
            {analyzeMessages.map(renderMessage)}
          </div>
          <div className="jp-AIAssistant-action">
            <div className="jp-AIAssistant-input-actions">
              {isLoading && (
                <button 
                  type="button"
                  className="jp-AIAssistant-action-button"
                  onClick={stopCurrentRequest}
                >
                  Stop
                </button>
              )}
              <button 
                className="jp-AIAssistant-action-button jp-AIAssistant-action-button-full" 
                onClick={analyzeCurrentCell}
                disabled={isLoading}
              >
                Analyze Current Cell
              </button>
            </div>
          </div>
        </>
      )}
      
      {activeTab === 'improve' && (
        <>
          <div className="jp-AIAssistant-conversation" ref={improveContainerRef}>
            {improveMessages.map(renderMessage)}
          </div>
          <div className="jp-AIAssistant-action">
            <div className="jp-AIAssistant-input-actions">
              {isLoading && (
                <button 
                  type="button"
                  className="jp-AIAssistant-action-button"
                  onClick={stopCurrentRequest}
                >
                  Stop
                </button>
              )}
              <button 
                className="jp-AIAssistant-action-button jp-AIAssistant-action-button-full" 
                onClick={improveCurrentCell}
                disabled={isLoading}
              >
                Improve Current Cell
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}; 