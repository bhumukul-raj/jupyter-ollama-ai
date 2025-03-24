import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ReactWidget } from '@jupyterlab/apputils';
import { IThemeManager } from '@jupyterlab/apputils';
import { userIcon } from '@jupyterlab/ui-components';
import { showDialog, Dialog } from '@jupyterlab/apputils';
import ReactMarkdown from 'react-markdown';
import { ProgressBar } from '@jupyterlab/statusbar';
import { MainAreaWidget } from '@jupyterlab/apputils';
import { Widget } from '@lumino/widgets';

import { ModelSelector } from './ModelSelector';
import { ChatMessage } from './ChatMessage';
import { getAvailableModels, sendChatMessage } from '../services/ollama';

import 'bootstrap/dist/css/bootstrap.min.css';

// Define types locally if they don't exist in a separate file
export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system'
}

export interface ChatMessageType {
  id: string;
  role: MessageRole | string;
  content: string;
  status?: 'sending' | 'complete' | 'error';
  timestamp: Date;
}

interface ChatSettings {
  model: string;
  temperature: number;
  useStreamingResponse: boolean;
  modelsAvailable: string[];
}

// Define the OllamaChat interface for API requests
interface OllamaChat {
  model: string;
  messages: {
    role: string;
    content: string;
  }[];
  temperature: number;
  stream: boolean;
}

// Define types for chat responses
interface ChatResponseChunk {
  content?: string;
  message?: {
    content?: string;
  };
  error?: string;
  done?: boolean;
}

// Define helpers to check types and safely handle streaming responses
function isAsyncGenerator(obj: any): obj is AsyncGenerator<any, any, unknown> {
  return obj && typeof obj === 'object' && typeof obj[Symbol.asyncIterator] === 'function';
}

// Safe extraction function for stream chunks
function safeExtractContentFromChunk(chunk: any): string {
  if (!chunk) {
    return '';
  }
  
  if (typeof chunk === 'object' && 'content' in chunk && chunk.content) {
    return String(chunk.content);
  }
  
  if (
    typeof chunk === 'object' && 
    'message' in chunk && 
    typeof chunk.message === 'object' && 
    chunk.message && 
    'content' in chunk.message
  ) {
    return String(chunk.message.content);
  }
  
  return '';
}

// Simplified version of these functions if they don't exist
async function fetchOllamaModels(): Promise<string[]> {
  try {
    const modelsList = await getAvailableModels();
    // Check if modelsList has a models property (API might return different formats)
    if (Array.isArray(modelsList)) {
      // Direct array of models
      return modelsList.map(model => model.name || model.id || 'unknown model');
    } else if (modelsList && typeof modelsList === 'object' && 'models' in modelsList) {
      // Object with models array property
      const modelsArray = (modelsList as any).models;
      return Array.isArray(modelsArray) 
        ? modelsArray.map(model => model.name || model.id || 'unknown model')
        : [];
    }
    // Fallback for unexpected response format
    console.warn('Unexpected model list format:', modelsList);
    return [];
  } catch (error) {
    console.error('Error fetching models:', error);
    return [];
  }
}

// Type the sendChatRequest function properly
async function sendChatRequest(chat: OllamaChat): Promise<AsyncGenerator<ChatResponseChunk, void, unknown> | ChatResponseChunk> {
  try {
    if (chat.stream) {
      // For streaming mode, use the sendChatMessage function with stream option
      console.log('[DEBUG] Sending streaming chat request:', chat);
      
      const response = await sendChatMessage(chat.model, chat.messages, {
        stream: true,
        temperature: chat.temperature
      });
      
      if ('error' in response) {
        console.error('[ERROR] Chat API error:', response.error);
        return { error: response.error };
      }
      
      return response;
    } else {
      // For non-streaming mode, use the sendChatMessage function
      console.log('[DEBUG] Sending non-streaming chat request:', chat);
      
      const response = await sendChatMessage(chat.model, chat.messages, {
        stream: false,
        temperature: chat.temperature
      });
      
      return response;
    }
  } catch (error) {
    console.error('[ERROR] Error in sendChatRequest:', error);
    return { error: `Error: ${error.message || error}` };
  }
}

export interface ChatComponentProps {
  themeManager?: IThemeManager;
  onModelChange?: (model: string) => void;
  welcomeMessage?: string;
}

export function ChatComponent({
  themeManager,
  onModelChange,
  welcomeMessage
}: ChatComponentProps): JSX.Element {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Loading...');
  const [error, setError] = useState<string | null>(null);
  const messageQueue = useRef<{message: string, timestamp: number}[]>([]);
  const [processingMessage, setProcessingMessage] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Data science related states
  const [isDataScienceQuery, setIsDataScienceQuery] = useState(false);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Default settings
  const [settings, setSettings] = useState<ChatSettings>({
    model: '',
    temperature: 0.7,
    useStreamingResponse: true,
    modelsAvailable: []
  });

  // Function to check if message is likely a data science query
  const checkIfDataScienceQuery = useCallback((message: string): boolean => {
    const dataScienceKeywords = [
      'pandas', 'dataframe', 'numpy', 'matplotlib', 'plot', 'seaborn',
      'sklearn', 'tensorflow', 'pytorch', 'keras', 'machine learning',
      'data analysis', 'statistical', 'regression', 'classification',
      'clustering', 'neural network', 'time series'
    ];
    
    const lowerMessage = message.toLowerCase();
    return dataScienceKeywords.some(keyword => lowerMessage.includes(keyword));
  }, []);

  // Function to start the loading timer for data science queries
  const startLoadingTimer = useCallback(() => {
    // Clear any existing timer
    if (loadingTimerRef.current) {
      clearInterval(loadingTimerRef.current);
    }
    
    // Set start time and initial progress
    startTimeRef.current = Date.now();
    setLoadingProgress(5); // Start with 5% progress
    
    // Set initial estimated time based on whether it's a data science query
    setEstimatedTimeRemaining(isDataScienceQuery ? 120 : 30); // 2 minutes for DS, 30 seconds otherwise
    
    // Start the timer that updates progress and estimated time
    loadingTimerRef.current = setInterval(() => {
      const elapsedSeconds = (Date.now() - startTimeRef.current) / 1000;
      
      // Calculate a new progress value (sigmoid curve to show progress slowing)
      let newProgress;
      const maxProgress = 95; // Don't go to 100% as that suggests completion
      
      if (isDataScienceQuery) {
        // Slower progress for data science queries
        newProgress = Math.min(maxProgress, 100 * (1 / (1 + Math.exp(-0.05 * (elapsedSeconds - 60)))));
      } else {
        // Faster progress for regular queries
        newProgress = Math.min(maxProgress, 100 * (1 / (1 + Math.exp(-0.1 * (elapsedSeconds - 15)))));
      }
      
      setLoadingProgress(newProgress);
      
      // Update estimated time remaining
      const totalEstimatedTime = isDataScienceQuery ? 120 : 30;
      const remainingTime = Math.max(0, totalEstimatedTime - elapsedSeconds);
      setEstimatedTimeRemaining(Math.round(remainingTime));
      
      // Update loading message based on elapsed time
      if (isDataScienceQuery) {
        if (elapsedSeconds > 90) {
          setLoadingMessage('Almost done with complex analysis...');
        } else if (elapsedSeconds > 60) {
          setLoadingMessage('Processing data science query (this may take a while)...');
        } else if (elapsedSeconds > 30) {
          setLoadingMessage('Working on data analysis...');
        } else {
          setLoadingMessage('Analyzing data science query...');
        }
      } else {
        if (elapsedSeconds > 20) {
          setLoadingMessage('Still working on your request...');
        } else if (elapsedSeconds > 10) {
          setLoadingMessage('Processing your request...');
        } else {
          setLoadingMessage('Thinking...');
        }
      }
    }, 1000);
  }, [isDataScienceQuery]);

  // Function to stop the loading timer
  const stopLoadingTimer = useCallback(() => {
    if (loadingTimerRef.current) {
      clearInterval(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
    setLoadingProgress(0);
    setEstimatedTimeRemaining(null);
  }, []);

  // Fetch available models on component mount
  useEffect(() => {
    fetchOllamaModels()
      .then((models) => {
        setSettings((prev) => ({
          ...prev,
          modelsAvailable: models,
          model: models.length > 0 ? models[0] : ''
        }));
        
        // If a model is selected, trigger onModelChange
        if (models.length > 0 && onModelChange) {
          onModelChange(models[0]);
        }
      })
      .catch((error) => {
        console.error('Failed to fetch models:', error);
        setError('Failed to fetch available models. Please check that Ollama is running.');
      });

    // Add a welcome message if provided
    if (welcomeMessage) {
      setMessages([
        {
          id: 'welcome',
          role: MessageRole.ASSISTANT,
          content: welcomeMessage,
          status: 'complete',
          timestamp: new Date()
        }
      ]);
    }
  }, [onModelChange, welcomeMessage]);

  // Effect to scroll to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle model change
  const handleModelChange = (model: string) => {
    setSettings((prev) => ({ ...prev, model }));
    if (onModelChange) {
      onModelChange(model);
    }
  };

  // Handle temperature change
  const handleTemperatureChange = (temperature: number) => {
    setSettings((prev) => ({ ...prev, temperature }));
  };

  // Handle streaming toggle
  const handleStreamingToggle = () => {
    setSettings((prev) => ({ ...prev, useStreamingResponse: !prev.useStreamingResponse }));
  };

  // Function to process the message queue
  const processMessageQueue = useCallback(async () => {
    if (messageQueue.current.length === 0 || processingMessage) {
      return;
    }

    setProcessingMessage(true);
    const { message, timestamp } = messageQueue.current.shift()!;
    
    // Check if this is likely a data science query
    const isDSQuery = checkIfDataScienceQuery(message);
    setIsDataScienceQuery(isDSQuery);
    
    try {
      // Add user message to chat
      const userMessageId = `user-${timestamp}`;
      const userMessage: ChatMessageType = {
        id: userMessageId,
        role: MessageRole.USER,
        content: message,
        status: 'complete',
        timestamp: new Date(timestamp)
      };
      setMessages((prev) => [...prev, userMessage]);

      // Add placeholder for assistant response
      const assistantMessageId = `assistant-${timestamp}`;
      const assistantMessage: ChatMessageType = {
        id: assistantMessageId,
        role: MessageRole.ASSISTANT,
        content: '',
        status: 'sending',
        timestamp: new Date(timestamp)
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Start loading indicators
      setIsLoading(true);
      setLoadingMessage(isDSQuery ? 'Analyzing data science query...' : 'Thinking...');
      startLoadingTimer();

      // Prepare chat history for API request
      const chatHistory: OllamaChat = {
        model: settings.model,
        messages: messages
          .filter((msg) => msg.status === 'complete')
        .map((msg) => ({
          role: msg.role,
          content: msg.content
          })),
        temperature: settings.temperature,
        stream: settings.useStreamingResponse
      };

      // Add the new user message
      chatHistory.messages.push({
        role: MessageRole.USER,
        content: message
      });

      if (settings.useStreamingResponse) {
        try {
          // For streaming mode
          const streamResult: AsyncGenerator<ChatResponseChunk, void, unknown> | ChatResponseChunk = await sendChatRequest({
            model: settings.model,
            messages: chatHistory.messages,
            temperature: settings.temperature,
            stream: true
          });

          // Handle streaming response
          if (isAsyncGenerator(streamResult)) {
            let accumulatedContent = '';
            
            for await (const chunk of streamResult) {
              if ('error' in chunk) {
                setError(`Error: ${chunk.error}`);
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, status: 'error', content: `Error: ${chunk.error}` }
                      : msg
                  )
                );
                break;
              }
              
              // Handle different response formats
              const chunkContent = safeExtractContentFromChunk(chunk);
              
              if (chunkContent) {
                accumulatedContent += chunkContent;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: accumulatedContent }
                      : msg
                  )
                );
              }
            }
            
            // Mark message as complete when stream ends
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, status: 'complete' }
                  : msg
              )
            );
          } else {
            console.warn('Expected AsyncGenerator but got:', streamResult);
            const result = await Promise.resolve(streamResult);
            const content = safeExtractContentFromChunk(result);
            
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content, status: 'complete' }
            : msg
        )
      );
          }
    } catch (error) {
          console.error('Error in streaming response:', error);
          setError(`Error: ${error instanceof Error ? error.message : String(error)}`);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, status: 'error' }
                : msg
            )
          );
        }
      } else {
        // For non-streaming, wait for complete response
        try {
          const result = await sendChatRequest(chatHistory);
          
          // Check if it's an AsyncGenerator (should not happen here but type-safe)
          if (isAsyncGenerator(result)) {
            console.warn('Received AsyncGenerator in non-streaming mode, processing as stream');
            let fullContent = '';
            
            for await (const chunk of result) {
              if ('error' in chunk) {
                setError(`Error: ${chunk.error}`);
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
            ? {
                ...msg,
                          content: `Error: ${chunk.error}`,
                          status: 'error'
              }
            : msg
        )
      );
                break;
              }
              
              const chunkContent = safeExtractContentFromChunk(chunk);
              if (chunkContent) {
                fullContent += chunkContent;
              }
            }
            
            // Update with full content when done
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      content: fullContent,
                      status: 'complete'
                    }
                  : msg
              )
            );
          } else {
            // Handle plain response object
            if ('error' in result) {
              console.error('Error in non-streaming response:', result.error);
              setError(`Error: ${result.error}`);
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? {
                        ...msg,
                        content: `Error: ${result.error}`,
                        status: 'error'
                      }
                    : msg
                )
              );
            } else {
              const content = safeExtractContentFromChunk(result);
              
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? {
                        ...msg,
                        content: content,
                        status: 'complete'
                      }
                    : msg
                )
              );
            }
          }
        } catch (error) {
          console.error('Error in non-streaming response:', error);
          setError(`Error: ${error instanceof Error ? error.message : String(error)}`);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, status: 'error' }
                : msg
            )
          );
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
      setError(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
      setProcessingMessage(false);
      stopLoadingTimer();
      
      // Process next message in queue if any
      setTimeout(() => {
        if (messageQueue.current.length > 0) {
          processMessageQueue();
        }
      }, 100);
    }
  }, [
    messages, 
    settings, 
    processingMessage, 
    checkIfDataScienceQuery, 
    startLoadingTimer, 
    stopLoadingTimer
  ]);

  // Effect to process message queue when it changes
  useEffect(() => {
    if (messageQueue.current.length > 0 && !processingMessage) {
      processMessageQueue();
    }
  }, [messageQueue.current.length, processingMessage, processMessageQueue]);

  // Handle send message
  const handleSendMessage = () => {
    if (!inputText.trim() || !settings.model) {
      return;
    }

    // Add message to queue
    messageQueue.current.push({
      message: inputText.trim(),
      timestamp: Date.now()
    });

    // Clear input
    setInputText('');
    
    // Clear any previous errors
    setError(null);
  };

  // Handle key press in input
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  // Handle clear chat
  const handleClearChat = () => {
    showDialog({
      title: 'Clear Chat',
      body: 'Are you sure you want to clear the chat history?',
      buttons: [
        Dialog.cancelButton(),
        Dialog.okButton({ label: 'Clear' })
      ]
    }).then((result) => {
      if (result.button.accept) {
        setMessages([]);
        messageQueue.current = [];
        setError(null);
      }
    });
  };

  return (
    <div className="jp-AI-ChatWidget">
      <div className="chat-header">
        <div className="chat-title">AI Assistant</div>
        <div className="model-selector-container">
          <ModelSelector
            models={settings.modelsAvailable}
            selectedModel={settings.model}
            onModelChange={handleModelChange}
          />
        </div>
      </div>
      
      {error && (
        <div className="error-message">
          <div className="error-content">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
            <button 
              className="error-dismiss-button" 
              onClick={() => setError(null)}
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      
      <div className="chat-options">
        <div className="temperature-control">
          <label htmlFor="temperature-slider">Temperature: {settings.temperature.toFixed(1)}</label>
          <input
            id="temperature-slider"
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={settings.temperature}
            onChange={(e) => handleTemperatureChange(parseFloat(e.target.value))}
          />
        </div>
        <div className="streaming-toggle">
          <label htmlFor="streaming-checkbox">
            <input
              id="streaming-checkbox"
              type="checkbox"
              checked={settings.useStreamingResponse}
              onChange={handleStreamingToggle}
            />
            Stream response
          </label>
        </div>
        <button 
          className="clear-chat-button" 
          onClick={handleClearChat}
          aria-label="Clear chat"
        >
          Clear chat
        </button>
          </div>

      <div className="messages-container" ref={messagesContainerRef}>
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
            message={{
              id: message.id,
              role: message.role === MessageRole.USER ? 'user' : 
                    message.role === MessageRole.ASSISTANT ? 'assistant' : 
                    message.role === MessageRole.SYSTEM ? 'system' : 'assistant',
              content: message.content,
              timestamp: message.timestamp
            }}
            themeManager={themeManager}
              />
            ))}
        
        {isLoading && (
          <div className="loading-container">
            <div className="loading-indicator">
              <div style={{ width: '100%', height: '4px', backgroundColor: '#f0f0f0', borderRadius: '2px' }}>
                <div 
                  style={{ 
                    width: `${loadingProgress}%`, 
                    height: '100%', 
                    backgroundColor: '#3578e5', 
                    borderRadius: '2px',
                    transition: 'width 0.3s ease-in-out'
                  }}
                />
              </div>
              <div className="loading-message">
                {loadingMessage}
                {estimatedTimeRemaining !== null && (
                  <span className="time-remaining">
                    {` (Est. ${estimatedTimeRemaining}s remaining)`}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="input-container">
        <div className="input-icon">
          <userIcon.react tag="div" />
        </div>
            <textarea
          className="input-textarea"
          placeholder="Type a message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading || !settings.model}
        />
            <button
          className="send-button"
              onClick={handleSendMessage}
          disabled={!inputText.trim() || isLoading || !settings.model}
          aria-label="Send message"
            >
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
            </button>
      </div>
    </div>
  );
}

export class ChatWidget extends ReactWidget {
  private readonly themeManager?: IThemeManager;
  private readonly welcomeMessage?: string;

  constructor(themeManager?: IThemeManager, welcomeMessage?: string) {
    super();
    this.themeManager = themeManager;
    this.welcomeMessage = welcomeMessage;
    this.addClass('jp-AI-ChatWidget');
  }

  render(): JSX.Element {
    return (
      <ChatComponent
        themeManager={this.themeManager}
        welcomeMessage={this.welcomeMessage || "Welcome to the JupyterLab AI Assistant! Ask me any questions about your code or data analysis tasks."}
      />
    );
  }
}

// Add safer type handling for processing API responses
function safeExtractContent(result: any): string {
  // Safely extract content from various response formats
  if (!result) {
    return '';
  }

  // Direct content property
  if (typeof result === 'object' && 'content' in result && result.content) {
    return String(result.content);
  }
  
  // Nested content in message property
  if (
    typeof result === 'object' && 
    'message' in result && 
    typeof result.message === 'object' && 
    result.message && 
    'content' in result.message
  ) {
    return String(result.message.content);
  }
  
  // Return empty string if no content found
  return '';
} 