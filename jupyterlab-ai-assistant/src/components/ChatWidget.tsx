import React, { useState, useEffect, useRef } from 'react';
import { ReactWidget } from '@jupyterlab/apputils';
import { IThemeManager } from '@jupyterlab/apputils';
import { userIcon } from '@jupyterlab/ui-components';

import { ChatMessage } from './ChatMessage';
import { ModelSelector } from './ModelSelector';
import { getAvailableModels, sendChatMessage } from '../services/ollama';

import 'bootstrap/dist/css/bootstrap.min.css';
import '../../style/ChatWidget.css';

interface ChatMessageType {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface ChatWidgetProps {
  themeManager: IThemeManager | null;
  initialContext?: string;  // Optional initial context for the chat
}

export class ChatWidget extends ReactWidget {
  private themeManager: IThemeManager | null;
  private initialContext: string | undefined;

  constructor(props: ChatWidgetProps) {
    super();
    this.themeManager = props.themeManager;
    this.initialContext = props.initialContext;
    this.addClass('jp-ChatWidget');
    this.title.label = 'AI Assistant Chat';
    this.title.closable = true;
    this.title.icon = userIcon;
  }

  render(): JSX.Element {
    return <ChatComponent themeManager={this.themeManager} initialContext={this.initialContext} />;
  }
}

function ChatComponent({ themeManager, initialContext }: ChatWidgetProps): JSX.Element {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState<string>('llama2');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch available models on component mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const models = await getAvailableModels();
        setAvailableModels(models.map((model: any) => model.name));
        if (models.length > 0) {
          setSelectedModel(models[0].name);
        }
      } catch (error) {
        console.error('Failed to fetch models:', error);
      }
    };

    fetchModels();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!currentMessage.trim()) return;

    // Add user message to chat
    const userMessage: ChatMessageType = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: currentMessage,
      timestamp: new Date()
    };

    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);

    // Add loading placeholder
    const placeholderId = `assistant-${Date.now()}`;
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        id: placeholderId,
        role: 'assistant',
        content: '...',
        timestamp: new Date()
      }
    ]);

    try {
      // Format messages for API
      const apiMessages = messages
        .filter((msg) => msg.role !== 'system')
        .concat(userMessage)
        .map((msg) => ({
          role: msg.role,
          content: msg.content
        }));

      // Add system message
      const systemMessage = {
        role: 'system',
        content: 'You are an AI assistant helping with Jupyter notebooks. Be concise and helpful.'
      };

      // Send chat request
      const response = await sendChatMessage(
        selectedModel, 
        [systemMessage, ...apiMessages]
      );

      // Replace loading placeholder with response
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === placeholderId
            ? {
                ...msg,
                content: response.message?.content || 'No response',
                timestamp: new Date()
              }
            : msg
        )
      );
    } catch (error) {
      console.error('Error sending message:', error);
      // Update placeholder with error
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === placeholderId
            ? {
                ...msg,
                content: 'Error: Failed to get response from AI',
                timestamp: new Date()
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const isDarkTheme = themeManager?.theme
    ? themeManager.isLight(themeManager.theme) === false
    : false;

  return (
    <div className={`chat-container container-fluid p-0 ${isDarkTheme ? 'dark-theme' : 'light-theme'}`}>
      <div className="chat-header row m-0 p-3 align-items-center">
        <div className="col-6">
          <h3 className="mb-0">AI Assistant</h3>
        </div>
        <div className="col-6">
          <ModelSelector
            models={availableModels}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
          />
        </div>
      </div>
      
      {initialContext && (
        <div className="context-section p-3 border-bottom">
          <h5 className="mb-2">Context:</h5>
          <pre className="context-code p-2 rounded">{initialContext}</pre>
        </div>
      )}
      
      <div className="messages-container p-3">
        {messages.length === 0 ? (
          <div className="empty-state text-center p-4">
            <p className="text-muted">No messages yet. Start a conversation!</p>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                isDarkTheme={isDarkTheme}
              />
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="input-section p-3 border-top">
        <div className="row m-0">
          <div className="col-9 col-md-10 p-0 pe-2">
            <textarea
              className="form-control"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              disabled={isLoading}
              rows={3}
            />
          </div>
          <div className="col-3 col-md-2 p-0">
            <button
              className="btn btn-primary w-100 h-100"
              onClick={handleSendMessage}
              disabled={isLoading || !currentMessage.trim()}
            >
              {isLoading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 