import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSync } from '@fortawesome/free-solid-svg-icons';

interface ModelSelectorProps {
  models: string[];
  selectedModel: string;
  isLoading: boolean;
  onModelChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onRefreshModels: () => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  selectedModel,
  isLoading,
  onModelChange,
  onRefreshModels
}) => {
  return (
    <div className="jp-AIAssistant-modelSelector">
      <select
        className="jp-AIAssistant-modelSelect"
        value={selectedModel}
        onChange={onModelChange}
        disabled={isLoading}
        title="Select Ollama model"
      >
        {models.length === 0 ? (
          <option value="">Loading models...</option>
        ) : (
          models.map(model => (
            <option key={model} value={model}>
              {model}
            </option>
          ))
        )}
      </select>
      
      <button 
        className="jp-AIAssistant-message-control-button"
        onClick={onRefreshModels}
        disabled={isLoading}
        title="Refresh model list"
      >
        <FontAwesomeIcon 
          icon={faSync} 
          className={`fa-icon-sm ${isLoading ? 'fa-spin' : ''}`} 
        />
      </button>
    </div>
  );
};

export default ModelSelector; 