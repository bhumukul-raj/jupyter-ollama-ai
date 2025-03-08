import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { INotebookTracker } from '@jupyterlab/notebook';
import { AIAssistantWidget } from './widget';
import notebookExtension from './notebook-extension';

/**
 * Command ID for opening the Ollama AI Assistant
 */
const COMMAND_ID = 'ollama-jupyter-ai:open';

/**
 * Initialization data for the ollama-jupyter-ai extension.
 */
const mainPlugin: JupyterFrontEndPlugin<void> = {
  id: 'ollama-jupyter-ai:plugin',
  autoStart: true,
  requires: [INotebookTracker],
  activate: (app: JupyterFrontEnd, notebooks: INotebookTracker) => {
    console.log('JupyterLab extension ollama-jupyter-ai is activated!');

    // Register command to open the AI Assistant
    app.commands.addCommand(COMMAND_ID, {
      label: 'Open Ollama AI Assistant',
      execute: () => {
        // Check if our widget already exists in the right panel
        const existingWidgets = app.shell.widgets('right');
        let widgetExists = false;
        
        // Iterate through the widgets in the right area
        let current = existingWidgets.next();
        while (current.done === false) {
          const widget = current.value;
          if (widget.id === 'ollama-ai-assistant') {
            widgetExists = true;
            break;
          }
          current = existingWidgets.next();
        }
        
        // If the widget exists, just activate it
        if (widgetExists) {
          app.shell.activateById('ollama-ai-assistant');
          return;
        }
        
        // Otherwise, create and add the widget
        const newWidget = new AIAssistantWidget(notebooks);
        newWidget.title.label = 'Ollama AI Assistant';
        newWidget.title.closable = true;
        newWidget.id = 'ollama-ai-assistant';
        
        // Add the widget to the right area
        app.shell.add(newWidget, 'right', { rank: 1000 });
      }
    });

    // Create and add the widget to the sidebar
    const widget = new AIAssistantWidget(notebooks);
    widget.title.label = 'Ollama AI Assistant';
    widget.title.closable = true;
    widget.id = 'ollama-ai-assistant';

    // Add the widget to the right area
    app.shell.add(widget, 'right', { rank: 1000 });
  }
};

// Export the main plugin and the notebook extension
export default [mainPlugin, notebookExtension]; 