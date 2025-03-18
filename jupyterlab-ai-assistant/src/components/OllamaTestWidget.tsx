import React, { useEffect, useState } from 'react';
import { MainAreaWidget } from '@jupyterlab/apputils';
import { Widget } from '@lumino/widgets';
import ReactDOM from 'react-dom';
import { getAvailableModels } from '../services/ollama';

// ReactJS component for displaying available models
export const OllamaTestComponent: React.FC = () => {
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const availableModels = await getAvailableModels();
        setModels(availableModels || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching models:', error);
        setError('Failed to fetch models. Check the console for details.');
        setLoading(false);
      }
    };

    fetchModels();
  }, []);

  if (loading) {
    return <div>Loading models...</div>;
  }

  if (error) {
    return <div className="jp-error">{error}</div>;
  }

  return (
    <div className="jp-OllamaTest">
      <h2>Available Ollama Models</h2>
      {models.length > 0 ? (
        <ul>
          {models.map((model, index) => (
            <li key={index}>
              <strong>{model.name}</strong>
              {model.size && ` - Size: ${(model.size / (1024 * 1024 * 1024)).toFixed(2)} GB`}
              {model.parameter_size && ` - Parameters: ${model.parameter_size}`}
            </li>
          ))}
        </ul>
      ) : (
        <p>No models found. Make sure Ollama is running and has models installed.</p>
      )}
    </div>
  );
};

// Function to create the OllamaTest widget
export function createOllamaTestWidget(): MainAreaWidget<Widget> {
  const content = new Widget();
  const widget = new MainAreaWidget({ content });
  
  widget.id = 'jp-ollama-test';
  widget.title.label = 'Ollama Models';
  widget.title.closable = true;
  
  ReactDOM.render(<OllamaTestComponent />, content.node);
  
  return widget;
} 