import React from 'react';
import { ReactWidget } from '@jupyterlab/apputils';
import { INotebookTracker } from '@jupyterlab/notebook';
import { AIAssistantPanel } from './components/AIAssistantPanel';

/**
 * A widget that hosts the AI Assistant panel component.
 */
export class AIAssistantWidget extends ReactWidget {
  private notebooks: INotebookTracker;

  constructor(notebooks: INotebookTracker) {
    super();
    this.notebooks = notebooks;
  }

  render(): JSX.Element {
    return (
      <div className="jp-AIAssistant-container">
        <AIAssistantPanel notebooks={this.notebooks} />
      </div>
    );
  }
} 