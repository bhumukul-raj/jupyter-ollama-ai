import React from 'react';

interface ModelSelectorProps {
  models: string[];
  selectedModel: string;
  onModelChange: (model: string) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  selectedModel,
  onModelChange
}) => {
  return (
    <div className="model-selector d-flex align-items-center">
      <label htmlFor="model-select" className="me-2 text-nowrap">Model:</label>
      <select
        id="model-select"
        value={selectedModel}
        onChange={(e) => onModelChange(e.target.value)}
        className="form-select form-select-sm"
      >
        {models.length === 0 ? (
          <option value="" disabled>
            Loading models...
          </option>
        ) : (
          models.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))
        )}
      </select>
    </div>
  );
}; 