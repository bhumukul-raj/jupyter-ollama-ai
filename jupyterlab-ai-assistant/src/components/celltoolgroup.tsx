import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';
import { Cell } from '@jupyterlab/cells';
import { searchIcon, buildIcon, bugIcon, userIcon } from '@jupyterlab/ui-components';
import * as ReactDOM from 'react-dom';
import * as React from 'react';

import { CellContextMenu } from './CellToolbarButton';
import { getAvailableModels } from '../services/ollama';

// Command prefix for unique command IDs
const COMMAND_PREFIX = 'ai-assistant:cell-';

/**
 * Initialization data for the cell toolbar component.
 */
const cellToolbarPlugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-ai-assistant:celltoolbar',
  autoStart: true,
  requires: [INotebookTracker],
  optional: [ISettingRegistry],
  activate: async (
    app: JupyterFrontEnd,
    notebookTracker: INotebookTracker,
    settingRegistry: ISettingRegistry | null
  ) => {
    console.log('[DEBUG] JupyterLab AI Assistant Cell Toolbar activation starting...');
    console.log('[DEBUG] NotebookTracker state:', {
      hasCurrentWidget: !!notebookTracker.currentWidget,
      hasActiveCell: !!notebookTracker.currentWidget?.content.activeCell,
      activeCellChangedSignal: !!notebookTracker.activeCellChanged,
      currentChangedSignal: !!notebookTracker.currentChanged,
      size: notebookTracker.size
    });

    // Get default model from settings
    let defaultModel = 'llama2';
    if (settingRegistry) {
      try {
        console.log('[DEBUG] Loading settings from registry...');
        const settings = await settingRegistry.load('jupyterlab-ai-assistant:plugin');
        defaultModel = settings.get('defaultModel').composite as string || 'llama2';
        console.log(`[DEBUG] Cell toolbar settings loaded, defaultModel: ${defaultModel}`);
      } catch (error) {
        console.error('[DEBUG] Failed to load cell toolbar settings:', error);
      }
    } else {
      console.log('[DEBUG] No settings registry available, using default model:', defaultModel);
    }

    // Get available models
    let availableModels: string[] = [];
    try {
      console.log('[DEBUG] Fetching available Ollama models for cell toolbar...');
      const models = await getAvailableModels();
      availableModels = models.map((model: any) => model.name);
      console.log('[DEBUG] Available models for cell toolbar:', availableModels);
      
      if (availableModels.length > 0 && !availableModels.includes(defaultModel)) {
        console.log(`[DEBUG] Default model ${defaultModel} not available, switching to ${availableModels[0]}`);
        defaultModel = availableModels[0];
      }
    } catch (error) {
      console.error('[DEBUG] Failed to fetch Ollama models for cell toolbar:', error);
    }

    // Define the command IDs - use the same ones as in plugin.json
    const commands = [
      {
        id: 'ai-assistant:analyze-cell',
        icon: searchIcon,
        tooltip: 'Explain this code with AI'
      },
      {
        id: 'ai-assistant:optimize-cell',
        icon: buildIcon,
        tooltip: 'Optimize this code with AI'
      },
      {
        id: 'ai-assistant:debug-cell',
        icon: bugIcon,
        tooltip: 'Debug this code with AI'
      },
      {
        id: 'ai-assistant:chat-cell',
        icon: userIcon,
        tooltip: 'Chat about this code'
      }
    ];

    console.log('[DEBUG] Cell toolbar command IDs:', commands.map(cmd => cmd.id).join(', '));
    
    // Update command enabled state when active cell changes
    const updateCommandEnabledState = () => {
      const hasActiveCell = !!notebookTracker.activeCell;
      console.log(`[DEBUG] Updating cell toolbar command state, activeCell: ${hasActiveCell}`);
      
      commands.forEach(cmd => {
        app.commands.notifyCommandChanged(cmd.id);
      });
    };

    // Connect to notebookTracker signals
    if (notebookTracker.currentChanged) {
      console.log('[DEBUG] Connecting to notebookTracker.currentChanged signal');
      notebookTracker.currentChanged.connect((_, notebook) => {
        console.log('[DEBUG] Current notebook changed:', !!notebook);
        updateCommandEnabledState();
      });
    }

    // If available, also connect to activeCellChanged signal
    if (notebookTracker.activeCellChanged) {
      console.log('[DEBUG] Connecting to notebookTracker.activeCellChanged signal');
      notebookTracker.activeCellChanged.connect((_, cell) => {
        console.log('[DEBUG] Active cell changed:', !!cell);
        updateCommandEnabledState();
      });
    }

    // Add command executed listener for debugging
    const commandExecutedHandler = (sender: any, args: any) => {
      if (commands.some(cmd => cmd.id === args.id)) {
        console.log(`[DEBUG] Cell toolbar command executed: ${args.id}`);
        
        // Get cell content for debugging
        const cell = notebookTracker.activeCell;
        if (cell) {
          try {
            const content = cell.model.sharedModel.getSource();
            console.log(`[DEBUG] Active cell content (${content.length} chars):`, 
              content.substring(0, 100) + (content.length > 100 ? '...' : ''));
            console.log(`[DEBUG] Cell type: ${cell.model.type}`);
          } catch (error) {
            console.error('[DEBUG] Error getting cell content:', error);
          }
        }
      }
    };
    
    // Connect to command executed signal
    app.commands.commandExecuted.connect(commandExecutedHandler);

    console.log('[DEBUG] JupyterLab AI Assistant Cell Toolbar is activated!');
  }
};

export default cellToolbarPlugin; 