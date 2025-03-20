import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  ILayoutRestorer
} from '@jupyterlab/application';

import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { 
  ICommandPalette, 
  showDialog, 
  Dialog, 
  ReactWidget, 
  WidgetTracker, 
  IWidgetTracker,
  CommandToolbarButton
} from '@jupyterlab/apputils';
import { IMainMenu, MainMenu } from '@jupyterlab/mainmenu';
import { IThemeManager } from '@jupyterlab/apputils';
import { INotebookTracker } from '@jupyterlab/notebook';
import { Cell } from '@jupyterlab/cells';
import { Menu } from '@lumino/widgets';
import { CommandRegistry } from '@lumino/commands';
import { toArray } from '@lumino/algorithm';
import {
  LabIcon,
  ToolbarButton,
  refreshIcon,
  bugIcon,
  buildIcon,
  searchIcon,
  userIcon
} from '@jupyterlab/ui-components';
import * as ReactDOM from 'react-dom';
import React from 'react';

import { ChatWidget } from './components/ChatWidget';
import { createOllamaTestWidget } from './components/OllamaTestWidget';
import { CellContextMenu } from './components/CellToolbarButton';
import cellToolbarPlugin from './components/celltoolgroup';
import { getAvailableModels } from './services/ollama';

/**
 * Interface for launcher type if available
 */
interface ILauncher {
  add: (options: { command: string, category: string, rank: number }) => void;
}

/**
 * Initialization data for the jupyterlab-ai-assistant extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-ai-assistant:plugin',
  description: 'A JupyterLab extension for AI-assisted coding using Ollama',
  autoStart: true,
  requires: [INotebookTracker], // Make NotebookTracker required
  optional: [
    ICommandPalette, 
    'launcher' as any, 
    ILayoutRestorer, 
    IMainMenu, 
    IThemeManager,
    ISettingRegistry
  ],
  activate: async (
    app: JupyterFrontEnd,
    notebookTracker: INotebookTracker,
    palette: ICommandPalette | null,
    launcher: ILauncher | null,
    restorer: ILayoutRestorer | null,
    mainMenu: IMainMenu | null,
    themeManager: IThemeManager | null,
    settingRegistry: ISettingRegistry | null
  ) => {
    // Prevent multiple activations
    if ((app as any).aiAssistantActivated) {
      console.log('JupyterLab AI Assistant already activated, skipping...');
      return;
    }
    (app as any).aiAssistantActivated = true;

    console.log('JupyterLab extension jupyterlab-ai-assistant is activated!');
    
    // Debug notebook tracker state
    console.debug('NotebookTracker initial state:', {
      currentWidget: notebookTracker.currentWidget,
      hasSignals: !!notebookTracker.activeCellChanged,
      widgetCount: notebookTracker.size
    });

    // Handle settings - simplified approach like in the working example
    if (settingRegistry) {
      settingRegistry
        .load(plugin.id)
        .then(settings => {
          console.log('Settings loaded:', settings.composite);
        })
        .catch(reason => {
          console.error('Failed to load settings', reason);
        });
    }

    const { commands } = app;

    // Track if the extension has been activated already
    let activated = false;
    if (activated) {
      console.log("JupyterLab extension jupyterlab-ai-assistant is already activated.");
      return;
    }
    activated = true;
    
    // Store the current selected model for cell toolbar operations
    let currentModel = '';
    let availableModels: string[] = [];
    
    // Command for testing Ollama connection
    const ollamaTestCommand = 'ai-assistant:test-ollama';
    const chatCommand = 'ai-assistant:open-chat';
    
    // Function to update model menu items
    let modelMenu: Menu | null = null;
    const updateModelCommands = () => {
      // If no menu yet, just return
      if (!modelMenu) return;
      
      // Clear existing items
      while (modelMenu.items.length > 0) {
        modelMenu.removeItemAt(0);
      }
      
      // Add a command for each available model
      availableModels.forEach((model: string) => {
        const modelCommandId = `ai-assistant:select-model-${model}`;
        
        // Only add the command if it doesn't exist yet
        if (!commands.hasCommand(modelCommandId)) {
          commands.addCommand(modelCommandId, {
            label: model,
            execute: () => {
              currentModel = model;
              console.log(`[DEBUG] Selected model for cell toolbar: ${currentModel}`);
              
              // Update command labels to show selected model
              commands.notifyCommandChanged('ai-assistant:analyze-cell');
              commands.notifyCommandChanged('ai-assistant:optimize-cell');
              commands.notifyCommandChanged('ai-assistant:debug-cell');
              
              // Refresh the model menu to update checkmarks
              updateModelCommands();
            },
            isToggled: () => currentModel === model
          });
        }
        
        // Add the model to the menu
        modelMenu.addItem({ command: modelCommandId });
      });
      
      // Add a separator and refresh command
      if (availableModels.length > 0) {
        modelMenu.addItem({ type: 'separator' });
      }
      modelMenu.addItem({ command: refreshModelsCommand });
    };
    
    // Try to load settings
    if (settingRegistry) {
      try {
        const settings = await settingRegistry.load('jupyterlab-ai-assistant:plugin');
        const defaultModel = settings.get('defaultModel').composite as string || 'llama2';
        currentModel = defaultModel;
      } catch (error) {
        console.warn('Failed to load settings:', error);
        currentModel = 'llama2';
      }
    }
    
    // Fetch available models
    try {
      const models = await getAvailableModels();
      availableModels = models.map((model: any) => model.name);
      console.log('Available models:', availableModels);
      
      // Set current model to first available if current is not in list
      if (availableModels.length > 0 && !availableModels.includes(currentModel)) {
        currentModel = availableModels[0];
      }
    } catch (error) {
      console.error('Failed to fetch available models:', error);
    }

    // Add the command for showing the Ollama Test widget
    commands.addCommand(ollamaTestCommand, {
      label: 'Show Available Ollama Models',
      execute: () => {
        try {
          const widget = createOllamaTestWidget();
          app.shell.add(widget, 'main');
          return widget;
        } catch (error) {
          console.error('Failed to create Ollama test widget:', error);
          return null;
        }
      }
    });

    // Add the command to show the chat widget
    commands.addCommand(chatCommand, {
      label: 'Open AI Assistant Chat',
      icon: userIcon,
      execute: () => {
        try {
          // Create a unique ID for the widget
          const id = `ai-assistant-chat-${Date.now()}`;
          
          // Check if widget already exists
          const widgets = toArray(app.shell.widgets('right'));
          const widget = widgets.find(w => w.id === id);
          if (widget) {
            // If it exists, activate it
            app.shell.activateById(widget.id);
            return widget;
          }

          // Create new widget
          const chatWidget = new ChatWidget({
            themeManager: themeManager
          });
          chatWidget.id = id;
          chatWidget.title.closable = true;

          // Add the widget to the right area
          app.shell.add(chatWidget, 'right', { rank: 1000 });
          app.shell.activateById(chatWidget.id);
          
          return chatWidget;
        } catch (error) {
          console.error('Failed to create chat widget:', error);
          return null;
        }
      }
    });

    // Add cell analysis commands
    commands.addCommand('ai-assistant:analyze-cell', {
      label: () => `Explain Code with AI (${currentModel})`,
      icon: searchIcon,
      execute: async () => {
        try {
          console.log('[DEBUG] Executing ai-assistant:analyze-cell command');
          if (notebookTracker?.activeCell) {
            const cell = notebookTracker.activeCell;
            console.log('[DEBUG] Active cell found, type:', cell.model.type);
            
            // Create a widget to host our React component
            const host = document.createElement('div');
            host.style.position = 'absolute';
            host.style.top = '50%';
            host.style.left = '50%';
            host.style.transform = 'translate(-50%, -50%)';
            host.style.zIndex = '1000';
            
            // Attach to the document body
            document.body.appendChild(host);
            
            // Function to remove the host when the dialog is closed
            const onClose = () => {
              ReactDOM.unmountComponentAtNode(host);
              document.body.removeChild(host);
            };
            
            // Render our React component inside the host
            ReactDOM.render(
              React.createElement(CellContextMenu, {
                cell: cell,
                onClose: onClose,
                selectedModel: currentModel,
                initialAction: 'explain'
              }),
              host
            );
          } else {
            console.warn('[DEBUG] No active cell found for analysis');
            
            showDialog({
              title: 'No Active Cell',
              body: 'Please select a cell to analyze',
              buttons: [Dialog.okButton()]
            });
          }
        } catch (error) {
          console.error('[DEBUG] Error analyzing cell:', error);
          
          showDialog({
            title: 'Error',
            body: `An error occurred: ${error.message || 'Unknown error'}`,
            buttons: [Dialog.okButton()]
          });
        }
      },
      isEnabled: () => {
        const enabled = !!(notebookTracker?.currentWidget && notebookTracker?.activeCell);
        console.log('[DEBUG] ai-assistant:analyze-cell enabled:', enabled);
        return enabled;
      }
    });

    commands.addCommand('ai-assistant:optimize-cell', {
      label: () => `Optimize Code with AI (${currentModel})`,
      icon: buildIcon,
      execute: async () => {
        try {
          console.log('[DEBUG] Executing ai-assistant:optimize-cell command');
          if (notebookTracker?.activeCell) {
            const cell = notebookTracker.activeCell;
            console.log('[DEBUG] Active cell found for optimization, type:', cell.model.type);
            
            // Create a widget to host our React component
            const host = document.createElement('div');
            host.style.position = 'absolute';
            host.style.top = '50%';
            host.style.left = '50%';
            host.style.transform = 'translate(-50%, -50%)';
            host.style.zIndex = '1000';
            
            // Attach to the document body
            document.body.appendChild(host);
            
            // Function to remove the host when the dialog is closed
            const onClose = () => {
              ReactDOM.unmountComponentAtNode(host);
              document.body.removeChild(host);
            };
            
            // Render our React component inside the host
            ReactDOM.render(
              React.createElement(CellContextMenu, {
                cell: cell,
                onClose: onClose,
                selectedModel: currentModel,
                initialAction: 'optimize'
              }),
              host
            );
          } else {
            console.warn('[DEBUG] No active cell found for optimization');
            
            showDialog({
              title: 'No Active Cell',
              body: 'Please select a cell to optimize',
              buttons: [Dialog.okButton()]
            });
          }
        } catch (error) {
          console.error('[DEBUG] Error optimizing cell:', error);
          
          showDialog({
            title: 'Error',
            body: `An error occurred: ${error.message || 'Unknown error'}`,
            buttons: [Dialog.okButton()]
          });
        }
      },
      isEnabled: () => {
        const enabled = !!(notebookTracker?.currentWidget && notebookTracker?.activeCell);
        console.log('[DEBUG] ai-assistant:optimize-cell enabled:', enabled);
        return enabled;
      }
    });

    commands.addCommand('ai-assistant:debug-cell', {
      label: () => `Debug Code with AI (${currentModel})`,
      icon: bugIcon,
      execute: async () => {
        try {
          console.log('[DEBUG] Executing ai-assistant:debug-cell command');
          if (notebookTracker?.activeCell) {
            const cell = notebookTracker.activeCell;
            console.log('[DEBUG] Active cell found for debugging, type:', cell.model.type);
            
            // Create a widget to host our React component
            const host = document.createElement('div');
            host.style.position = 'absolute';
            host.style.top = '50%';
            host.style.left = '50%';
            host.style.transform = 'translate(-50%, -50%)';
            host.style.zIndex = '1000';
            
            // Attach to the document body
            document.body.appendChild(host);
            
            // Function to remove the host when the dialog is closed
            const onClose = () => {
              ReactDOM.unmountComponentAtNode(host);
              document.body.removeChild(host);
            };
            
            // Render our React component inside the host
            ReactDOM.render(
              React.createElement(CellContextMenu, {
                cell: cell,
                onClose: onClose,
                selectedModel: currentModel,
                initialAction: 'debug'
              }),
              host
            );
          } else {
            console.warn('[DEBUG] No active cell found for debugging');
            
            showDialog({
              title: 'No Active Cell',
              body: 'Please select a cell to debug',
              buttons: [Dialog.okButton()]
            });
          }
        } catch (error) {
          console.error('[DEBUG] Error debugging cell:', error);
          
          showDialog({
            title: 'Error',
            body: `An error occurred: ${error.message || 'Unknown error'}`,
            buttons: [Dialog.okButton()]
          });
        }
      },
      isEnabled: () => {
        const enabled = !!(notebookTracker?.currentWidget && notebookTracker?.activeCell);
        console.log('[DEBUG] ai-assistant:debug-cell enabled:', enabled);
        return enabled;
      }
    });

    commands.addCommand('ai-assistant:chat-cell', {
      label: () => `Chat about Code with AI (${currentModel})`,
      icon: userIcon,
      execute: async () => {
        try {
          console.log('[DEBUG] Executing ai-assistant:chat-cell command');
          if (notebookTracker?.activeCell) {
            const cell = notebookTracker.activeCell;
            console.log('[DEBUG] Active cell found for chat, type:', cell.model.type);
            
            // Create a widget to host our React component
            const host = document.createElement('div');
            host.style.position = 'absolute';
            host.style.top = '50%';
            host.style.left = '50%';
            host.style.transform = 'translate(-50%, -50%)';
            host.style.zIndex = '1000';
            
            // Attach to the document body
            document.body.appendChild(host);
            
            // Function to remove the host when the dialog is closed
            const onClose = () => {
              ReactDOM.unmountComponentAtNode(host);
              document.body.removeChild(host);
            };
            
            // Render our React component inside the host
            ReactDOM.render(
              React.createElement(CellContextMenu, {
                cell: cell,
                onClose: onClose,
                selectedModel: currentModel,
                initialAction: 'chat'
              }),
              host
            );
          } else {
            console.warn('[DEBUG] No active cell found for chat');
            
            showDialog({
              title: 'No Active Cell',
              body: 'Please select a cell to chat about',
              buttons: [Dialog.okButton()]
            });
          }
        } catch (error) {
          console.error('[DEBUG] Error starting chat:', error);
          
          showDialog({
            title: 'Error',
            body: `An error occurred: ${error.message || 'Unknown error'}`,
            buttons: [Dialog.okButton()]
          });
        }
      },
      isEnabled: () => {
        const enabled = !!(notebookTracker?.currentWidget && notebookTracker?.activeCell);
        console.log('[DEBUG] ai-assistant:chat-cell enabled:', enabled);
        return enabled;
      }
    });

    // Add a command to refresh the model list
    const refreshModelsCommand = 'ai-assistant:refresh-models';
    commands.addCommand(refreshModelsCommand, {
      label: 'Refresh Available Models',
      execute: async () => {
        try {
          console.log('[DEBUG] Refreshing available models...');
          const models = await getAvailableModels();
          availableModels = models.map((model: any) => model.name);
          console.log('[DEBUG] Refreshed models list:', availableModels);
          
          // If current model is not available, switch to first available
          if (availableModels.length > 0 && !availableModels.includes(currentModel)) {
            currentModel = availableModels[0];
            console.log(`[DEBUG] Current model not available, switching to ${currentModel}`);
          }
          
          // Update commands to reflect model changes
          commands.notifyCommandChanged('ai-assistant:analyze-cell');
          commands.notifyCommandChanged('ai-assistant:optimize-cell');
          commands.notifyCommandChanged('ai-assistant:debug-cell');
          
          // If we have a model menu update function defined, call it
          if (typeof updateModelCommands === 'function') {
            updateModelCommands();
          }
          
          // Show confirmation
          showDialog({
            title: 'Models Refreshed',
            body: `Found ${availableModels.length} available models.`,
            buttons: [Dialog.okButton()]
          });
        } catch (error) {
          console.error('[DEBUG] Error refreshing models:', error);
          
          // Show error
          showDialog({
            title: 'Error Refreshing Models',
            body: `Failed to refresh models: ${error.message || 'Unknown error'}`,
            buttons: [Dialog.okButton()]
          });
        }
      }
    });

    // Add the commands to the command palette with defensive checks
    if (palette && typeof palette.addItem === 'function') {
      try {
        palette.addItem({ command: ollamaTestCommand, category: 'AI Assistant' });
        palette.addItem({ command: chatCommand, category: 'AI Assistant' });
        palette.addItem({ command: 'ai-assistant:analyze-cell', category: 'AI Assistant' });
        palette.addItem({ command: 'ai-assistant:optimize-cell', category: 'AI Assistant' });
        palette.addItem({ command: 'ai-assistant:debug-cell', category: 'AI Assistant' });
        palette.addItem({ command: 'ai-assistant:chat-cell', category: 'AI Assistant' });
      } catch (error) {
        console.error('Failed to add commands to palette:', error);
      }
    }

    // Create an AI menu and add it to the main menu with defensive checks
    if (mainMenu && typeof mainMenu.addMenu === 'function') {
      try {
        const aiMenu = new Menu({ commands });
        aiMenu.title.label = 'AI Assistant';
        
        // Add main commands
        aiMenu.addItem({ command: chatCommand });
        aiMenu.addItem({ command: ollamaTestCommand });
        
        // Add model selector submenu
        modelMenu = new Menu({ commands });
        modelMenu.title.label = 'Select Default Model';
        
        // Initial population of the model menu
        updateModelCommands();
        
        // Add the model menu to the AI menu
        aiMenu.addItem({ type: 'submenu', submenu: modelMenu });
        
        // Add a separator before cell actions
        aiMenu.addItem({ type: 'separator' });
        
        // Add cell-specific commands in a submenu
        const cellMenu = new Menu({ commands });
        cellMenu.title.label = 'Cell Actions';
        cellMenu.addItem({ command: 'ai-assistant:analyze-cell' });
        cellMenu.addItem({ command: 'ai-assistant:optimize-cell' });
        cellMenu.addItem({ command: 'ai-assistant:debug-cell' });
        cellMenu.addItem({ command: 'ai-assistant:chat-cell' });
        aiMenu.addItem({ type: 'submenu', submenu: cellMenu });
        
        // Add the menu to mainMenu
        mainMenu.addMenu(aiMenu);
      } catch (error) {
        console.error('Failed to create AI menu:', error);
      }
    }

    // Add entries to the launcher with defensive checks
    if (launcher && typeof launcher.add === 'function') {
      try {
        launcher.add({
          command: chatCommand,
          category: 'AI Assistant',
          rank: 1
        });
        
        launcher.add({
          command: ollamaTestCommand,
          category: 'AI Assistant',
          rank: 2
        });
      } catch (error) {
        console.error('Failed to add commands to launcher:', error);
      }
    }

    // Activate the cell toolbar plugin with defensive check
    try {
      await cellToolbarPlugin.activate(app, settingRegistry);
    } catch (error) {
      console.error('Failed to activate cell toolbar plugin:', error);
    }
  }
};

export default plugin; 