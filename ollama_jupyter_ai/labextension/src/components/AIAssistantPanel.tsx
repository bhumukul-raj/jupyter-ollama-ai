import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faRobot, 
  faBolt,
  faCode,
  faMagic,
  faCog,
  faSave,
  faDownload,
  faUpload,
  faTrash
} from '@fortawesome/free-solid-svg-icons';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { INotebookTracker } from '@jupyterlab/notebook';

// Import components
import MessageList from './MessageList';
import InputArea from './InputArea';
import ModelSelector from './ModelSelector';
import TabNavigation from './TabNavigation';

// Import context and hooks
import { AIAssistantProvider, useAIAssistant, TabType } from '../context/AIAssistantContext';
import { applySyntaxHighlighting, formatMessageWithCodeBlocks } from '../utils/formatUtils';

// Props interface
interface AIAssistantPanelProps {
  notebooks: INotebookTracker;
}

// Tab definitions
const tabs: { id: TabType; label: string; icon: IconProp }[] = [
  { id: 'chat', label: 'Chat', icon: faBolt },
  { id: 'analyze', label: 'Analyze', icon: faCode },
  { id: 'improve', label: 'Tools', icon: faMagic }
];

// Main component implementation
const AIAssistantPanelContent: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [isCompact, setIsCompact] = useState<boolean>(false);
  const {
    // State
    messages,
    chatInput,
    activeTab,
    isLoading,
    userPreferences,
    
    // API data
    models,
    selectedModel,
    
    // Actions
    setChatInput,
    setActiveTab,
    setUserPreference,
    setSelectedModel,
    
    // Message operations
    sendChatMessage,
    analyzeCurrentCell,
    improveCurrentCell,
    retryLastMessage,
    regenerateResponse,
    clearMessages,
    stopCurrentRequest,
    
    // Notebook operations
    activeCellContent,
    hasActiveNotebook,
    
    // Data operations
    exportConversation,
    saveConversation,
    loadConversation,
    importConversation
  } = useAIAssistant();
  
  // Use ResizeObserver to detect panel size changes
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver(entries => {
      if (!entries[0]) return;
      
      const width = entries[0].contentRect.width;
      setContainerWidth(width);
      
      // Set compact mode when width is below threshold
      setIsCompact(width < 500);
    });
    
    resizeObserver.observe(containerRef.current);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Handler for chat input changes
  const handleChatInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setChatInput(e.target.value);
  };

  // Handler for chat message submission
  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim() === '') return;
    
    sendChatMessage(chatInput);
  };
  
  // Handler for analyze action
  const handleAnalyze = () => {
    if (!hasActiveNotebook || !activeCellContent) {
      alert('Please select a notebook cell to analyze');
      return;
    }

    analyzeCurrentCell();
  };
  
  // Handler for improve action
  const handleImprove = () => {
    if (!hasActiveNotebook || !activeCellContent) {
      alert('Please select a notebook cell to improve');
      return;
    }

    if (activeCellContent.cellType !== 'code') {
      alert('Only code cells can be improved');
      return;
    }

    improveCurrentCell();
  };
  
  // Handler for tab changes
  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId as TabType);
  }, [setActiveTab]);
  
  // Handler for model changes
  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedModel(e.target.value);
  };
  
  // Handler for auto-scroll toggle
  const toggleAutoScroll = () => {
    setUserPreference('autoScroll', !userPreferences.autoScroll);
  };
  
  // Handler for saving the conversation
  const handleSaveConversation = () => {
    const id = saveConversation();
    if (id) {
      alert(`Conversation saved with ID: ${id}\n\nConversations are stored in your browser's localStorage and will persist between sessions. You can access them by using the import button.`);
    } else {
      alert('Failed to save conversation');
    }
  };
  
  // Handler for exporting the conversation
  const handleExportConversation = (format: 'json' | 'markdown' | 'notebook') => {
    const content = exportConversation(format);
    if (!content) {
      alert('No conversation to export');
      return;
    }

    // Create and trigger download
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation_export_${Date.now()}.${format === 'notebook' ? 'ipynb' : format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Handler for importing a conversation
  const handleImportConversation = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const content = event.target?.result as string;
            const parsedData = JSON.parse(content);
            
            // Validate the data format before importing
            if (Array.isArray(parsedData) && 
                parsedData.length > 0 && 
                parsedData.every(msg => 
                  typeof msg === 'object' && 
                  (msg.role === 'user' || msg.role === 'assistant') && 
                  typeof msg.content === 'string')) {
              
              // Data is valid, import it
              const success = importConversation(content);
              if (success) {
                alert('Conversation imported successfully');
              } else {
                alert('Failed to import conversation. Check the console for details.');
              }
            } else {
              alert('Invalid conversation format. The file must contain a valid conversation JSON array.');
            }
    } catch (error) {
            console.error('Error parsing JSON file:', error);
            alert('Failed to import conversation. The file does not contain valid JSON data.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };
  
  // Render active tab content
  const renderTabContent = useCallback(() => {
    switch (activeTab) {
      case 'chat':
        return (
          <div className="jp-AIAssistant-conversationContainer" ref={containerRef}>
            <div className="jp-AIAssistant-conversation">
              {messages.length === 0 ? (
                <div className="jp-AIAssistant-emptyState">
                  <FontAwesomeIcon icon={faRobot} className="fa-icon-lg" style={{ marginBottom: '16px' }} />
                  <p>Start a new conversation with the AI assistant</p>
                  <p><small>Your conversation will be processed locally using Ollama</small></p>
                </div>
              ) : (
                <MessageList
                  messages={messages}
                  autoScroll={userPreferences.autoScroll}
                  isLoading={isLoading}
                  onRetry={retryLastMessage}
                  onStop={stopCurrentRequest}
                  onRegenerate={regenerateResponse}
                  formatMessageWithCodeBlocks={formatMessageWithCodeBlocks}
                  containerRef={containerRef}
                  containerWidth={containerWidth}
                  isCompact={isCompact}
                />
              )}
            </div>
            
            <InputArea
              inputValue={chatInput}
              isLoading={isLoading}
              onInputChange={handleChatInputChange}
              onSubmit={handleChatSubmit}
              onStopRequest={stopCurrentRequest}
              onRegenerate={regenerateResponse}
              isCompact={isCompact}
            />
          </div>
        );
        
      case 'analyze':
        return (
          <div className="jp-AIAssistant-conversationContainer" ref={containerRef}>
            <div className="jp-AIAssistant-conversation">
              {messages.length === 0 ? (
                <div className="jp-AIAssistant-emptyState">
                  <FontAwesomeIcon icon={faCode} className="fa-icon-lg" style={{ marginBottom: '16px' }} />
                  <p>Analyze your notebook cell code</p>
                  <p><small>Select a cell and click "Analyze" to get insights</small></p>
                </div>
              ) : (
                <MessageList
                  messages={messages}
                  autoScroll={userPreferences.autoScroll}
                  isLoading={isLoading}
                  onRetry={retryLastMessage}
                  onStop={stopCurrentRequest}
                  onRegenerate={regenerateResponse}
                  formatMessageWithCodeBlocks={formatMessageWithCodeBlocks}
                  containerRef={containerRef}
                  containerWidth={containerWidth}
                  isCompact={isCompact}
                />
              )}
            </div>
            
            <div className="jp-AIAssistant-action">
            <button
                className="jp-AIAssistant-action-button jp-AIAssistant-action-button-full"
                onClick={handleAnalyze}
                disabled={isLoading || !hasActiveNotebook || !activeCellContent}
              >
                {isLoading ? 'Analyzing...' : 'Analyze Current Cell'}
            </button>
          </div>
          </div>
        );
        
      case 'improve':
        return (
          <div className="jp-AIAssistant-conversationContainer" ref={containerRef}>
            <div className="jp-AIAssistant-conversation">
              {messages.length === 0 ? (
                <div className="jp-AIAssistant-emptyState">
                  <FontAwesomeIcon icon={faMagic} className="fa-icon-lg" style={{ marginBottom: '16px' }} />
                  <p>Improve your notebook cell code</p>
                  <p><small>Select a code cell and click "Improve" to optimize it</small></p>
                </div>
              ) : (
                <MessageList
                  messages={messages}
                  autoScroll={userPreferences.autoScroll}
                  isLoading={isLoading}
                  onRetry={retryLastMessage}
                  onStop={stopCurrentRequest}
                  onRegenerate={regenerateResponse}
                  formatMessageWithCodeBlocks={formatMessageWithCodeBlocks}
                  containerRef={containerRef}
                  containerWidth={containerWidth}
                  isCompact={isCompact}
                />
        )}
      </div>
            
            <div className="jp-AIAssistant-action">
              <button
                className="jp-AIAssistant-action-button jp-AIAssistant-action-button-full"
                onClick={handleImprove}
                disabled={
                  isLoading || 
                  !hasActiveNotebook || 
                  !activeCellContent || 
                  activeCellContent.cellType !== 'code'
                }
              >
                {isLoading ? 'Improving...' : 'Improve Current Cell'}
              </button>
            </div>
        </div>
      );
        
      default:
        return null;
    }
  }, [
    activeTab,
    messages,
    userPreferences.autoScroll,
    isLoading,
    retryLastMessage,
    stopCurrentRequest,
    regenerateResponse,
    formatMessageWithCodeBlocks,
    containerRef,
    containerWidth,
    isCompact,
    chatInput,
    handleChatInputChange,
    handleChatSubmit
  ]);
  
  // Render main component
  return (
    <div className="jp-AIAssistant" ref={containerRef}>
      <div className={`jp-AIAssistant-header ${isCompact ? 'jp-AIAssistant-header-compact' : ''}`}>
        <div className="jp-AIAssistant-title">
          <FontAwesomeIcon icon={faRobot} className="fa-icon-md" style={{ marginRight: '8px' }} />
          Ollama AI Assistant
        </div>
        
        <div className="jp-AIAssistant-scrollControl">
          <label>
            <input
              type="checkbox"
              checked={userPreferences.autoScroll}
              onChange={toggleAutoScroll}
            />
            Auto-scroll
          </label>
        </div>
        
        <ModelSelector
          models={models}
          selectedModel={selectedModel}
          isLoading={isLoading}
          onModelChange={handleModelChange}
          onRefreshModels={() => {}}
        />
      </div>
      
      <div className={`jp-AIAssistant-toolbar ${isCompact ? 'jp-AIAssistant-toolbar-compact' : ''}`}>
        <TabNavigation
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isLoading={isLoading}
          isCompact={isCompact}
        />
        
        <div className="jp-AIAssistant-toolbar-actions">
          <button
            className="jp-AIAssistant-toolbar-button"
            onClick={handleSaveConversation}
            title="Save conversation"
            disabled={messages.length === 0}
          >
            <FontAwesomeIcon icon={faSave} className="fa-icon-sm" />
          </button>
          
          <button
            className="jp-AIAssistant-toolbar-button"
            onClick={() => handleExportConversation('json')}
            title="Export conversation as JSON"
            disabled={messages.length === 0}
          >
            <FontAwesomeIcon icon={faDownload} className="fa-icon-sm" />
          </button>
          
          <button
            className="jp-AIAssistant-toolbar-button"
            onClick={handleImportConversation}
            title="Import conversation"
          >
            <FontAwesomeIcon icon={faUpload} className="fa-icon-sm" />
          </button>
          
          <button
            className="jp-AIAssistant-toolbar-button"
            onClick={() => clearMessages()}
            title="Clear conversation"
            disabled={messages.length === 0}
          >
            <FontAwesomeIcon icon={faTrash} className="fa-icon-sm" />
          </button>
          
          <button
            className="jp-AIAssistant-toolbar-button"
            onClick={() => {}}
            title="Settings"
          >
            <FontAwesomeIcon icon={faCog} className="fa-icon-sm" />
          </button>
        </div>
      </div>

      {renderTabContent()}
      
      {userPreferences.enableKeyboardShortcuts && (
        <div className="jp-AIAssistant-keyboard-help">
          Press Ctrl+Enter to send
          </div>
      )}
    </div>
  );
}; 

// Wrapper component that provides the context
export const AIAssistantPanel = React.memo<AIAssistantPanelProps>(({ notebooks }) => {
  return (
    <AIAssistantProvider notebooks={notebooks}>
      <AIAssistantPanelContent />
    </AIAssistantProvider>
  );
});

export default AIAssistantPanel; 