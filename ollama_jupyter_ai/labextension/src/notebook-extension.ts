import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { INotebookTracker } from '@jupyterlab/notebook';
import { OllamaService } from './services/OllamaService';

/**
 * Notebook-specific extension for Ollama AI features
 */
const notebookExtension: JupyterFrontEndPlugin<void> = {
  id: 'ollama-jupyter-ai:notebook-extension',
  autoStart: true,
  requires: [INotebookTracker],
  activate: (
    app: JupyterFrontEnd,
    notebooks: INotebookTracker
  ) => {
    console.log('Ollama Jupyter AI Notebook Extension activated');
    
    // Create a shared instance of OllamaService
    const ollamaService = new OllamaService();
    
    // Add commands
    const { commands } = app;
    
    // Command to analyze the current cell
    commands.addCommand('ollama:analyze-cell', {
      label: 'Analyze Code with Ollama AI',
      execute: async () => {
        const notebook = notebooks.currentWidget;
        if (!notebook) return;
        
        const cell = notebook.content.activeCell;
        if (!cell || cell.model.type !== 'code') {
          console.log('No active code cell found');
          return;
        }
        
        // Get the cell content
        const code = cell.model.toString();
        if (!code.trim()) {
          console.log('Cell is empty');
          return;
        }
        
        // Get the analysis from Ollama
        try {
          const analysis = await ollamaService.analyzeCode(code);
          console.log('Analysis:', analysis);
          
          // Add to cell context menu for future use
          app.contextMenu.addItem({
            command: 'ollama:analyze-cell',
            selector: '.jp-Notebook .jp-CodeCell'
          });
        } catch (error) {
          console.error('Error analyzing code:', error);
        }
      }
    });
  }
};

export default notebookExtension;
