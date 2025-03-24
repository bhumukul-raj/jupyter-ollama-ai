import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  ILayoutRestorer
} from '@jupyterlab/application';

import { 
  IThemeManager, 
  ICommandPalette, 
  showDialog,
  Dialog
} from '@jupyterlab/apputils';
import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';
import { IMainMenu } from '@jupyterlab/mainmenu';
import { Menu, Widget } from '@lumino/widgets';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { CodeCell } from '@jupyterlab/cells';
import ReactDOM from 'react-dom';
import { 
  searchIcon, 
  buildIcon, 
  bugIcon,
  infoIcon
} from '@jupyterlab/ui-components';

// Import cell-analysis.css only if it exists
import '../style/index.css';
import '../style/ChatWidget.css';
try {
  require('../style/cell-analysis.css');
} catch (e) {
  console.warn('cell-analysis.css not found, skipping import');
}

import { ChatWidget } from './components/ChatWidget';
import { analyzeCell } from './services/cell';
import { getAvailableModels } from './services/ollama';

// Define interfaces for JupyterLab extensions we need to interact with
interface ICellMenu {
  addGroup(commands: Array<{ command: string }>, rank?: number): void;
}

interface IEditorContextMenu {
  addGroup(commands: Array<{ command: string }>, rank?: number): void;
}

interface IEditorTracker {
  currentWidget: Widget | null;
}

interface IPluginSettings {
  baseUrl?: string;
  defaultModel?: string;
  defaultStreamResponse?: boolean;
  defaultTemperature?: number;
}

// Helper function to get the current cell from the notebook tracker
function getCurrentCell(notebookTracker: INotebookTracker): { cell: CodeCell, content: string, cellType: string } | null {
  const current = notebookTracker.currentWidget;
  if (!current) {
    return null;
  }
  const activeCell = current.content.activeCell;
  if (!activeCell || !(activeCell instanceof CodeCell)) {
    return null;
  }
  return {
    cell: activeCell,
    content: activeCell.model.sharedModel.getSource(),
    cellType: activeCell.model.type
  };
}

// Helper function to render React components
function renderComponent(node: HTMLElement, component: React.ReactElement): void {
  ReactDOM.render(component, node);
}

function addCellContextCommands(
  app: JupyterFrontEnd,
  tracker: INotebookTracker,
  themeManager: IThemeManager,
  settings: IPluginSettings
): void {
  // Command IDs
  const analyzeCommandId = 'jupyterlab-ai-assistant:analyze-cell';
  const explainCommandId = 'jupyterlab-ai-assistant:explain-cell';
  const optimizeCommandId = 'jupyterlab-ai-assistant:optimize-cell';
  const visualizeCommandId = 'jupyterlab-ai-assistant:visualize-cell';

  // Define analysis commands
  [
    {
      id: analyzeCommandId,
      text: 'Analyze Code',
      question: 'Analyze this code and explain what it does.',
      icon: searchIcon
    },
    {
      id: explainCommandId,
      text: 'Explain Code',
      question: 'Explain what this code does in simple terms.',
      icon: infoIcon
    },
    {
      id: optimizeCommandId,
      text: 'Optimize Code',
      question: 'Suggest optimizations for this code to make it more efficient.',
      icon: buildIcon
    },
    {
      id: visualizeCommandId,
      text: 'Suggest Visualizations',
      question: 'Suggest visualizations for the data in this code.',
      icon: searchIcon
    }
  ].forEach(command => {
    app.commands.addCommand(command.id, {
      label: command.text,
      iconClass: () => command.icon.name,
      execute: async () => {
        const cellInfo = getCurrentCell(tracker);
        if (!cellInfo) {
          showDialog({
            title: 'Error',
            body: 'No code cell selected.',
            buttons: [Dialog.okButton()]
          });
          return;
        }

        try {
          // Get the default model or use the first available one
          let model = settings.defaultModel || '';
          if (!model) {
            const models = await getAvailableModels();
            if (models && Array.isArray(models) && models.length > 0) {
              model = models[0].name || models[0].id || '';
            }
          }

          if (!model) {
            showDialog({
              title: 'Error',
              body: 'No model available for analysis. Please check your Ollama setup.',
              buttons: [Dialog.okButton()]
            });
            return;
          }

          // Call the analyze function directly
          const result = await analyzeCell(
            model,
            cellInfo.content,
            cellInfo.cellType,
            command.question
          );

          // Display the result
          const resultNode = document.createElement('div');
          resultNode.style.maxHeight = '70vh';
          resultNode.style.overflowY = 'auto';
          resultNode.style.whiteSpace = 'pre-wrap';
          resultNode.textContent = result.message?.content || 'No result returned';

          // Show the final result dialog
          showDialog({
            title: `${command.text} Results`,
            body: new Widget({ node: resultNode }),
            buttons: [Dialog.okButton()]
          });
        } catch (error) {
          showDialog({
            title: 'Error',
            body: `Failed to analyze code: ${error}`,
            buttons: [Dialog.okButton()]
          });
        }
      },
      isEnabled: () => Boolean(getCurrentCell(tracker))
    });
  });

  // Add commands to the notebook cell context menu
  app.contextMenu.addItem({
    command: analyzeCommandId,
    selector: '.jp-Cell'
  });

  app.contextMenu.addItem({
    command: explainCommandId,
    selector: '.jp-Cell'
  });

  app.contextMenu.addItem({
    command: optimizeCommandId,
    selector: '.jp-Cell'
  });

  app.contextMenu.addItem({
    command: visualizeCommandId,
    selector: '.jp-Cell'
  });
}

/**
 * Initialization data for the jupyterlab-ai-assistant extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-ai-assistant:plugin',
  autoStart: true,
  requires: [IThemeManager, ICommandPalette, INotebookTracker],
  optional: [IMainMenu, ILayoutRestorer],
  activate: async (
    app: JupyterFrontEnd,
    themeManager: IThemeManager,
    palette: ICommandPalette,
    notebookTracker: INotebookTracker,
    mainMenu?: IMainMenu,
    restorer?: ILayoutRestorer
  ) => {
    console.log('JupyterLab AI Assistant extension is activated!');

    // Initialize plugin settings
    const settings: IPluginSettings = {
      baseUrl: '', // Will be determined dynamically
      defaultModel: '', // Will be populated when models are fetched
      defaultStreamResponse: true,
      defaultTemperature: 0.7
    };

    // Add cell context commands for code analysis
    addCellContextCommands(app, notebookTracker, themeManager, settings);

    // Add a command to open the chat widget
    const command = 'jupyterlab-ai-assistant:open-chat';
    app.commands.addCommand(command, {
      label: 'AI Assistant Chat',
      iconClass: searchIcon.name,
      execute: () => {
        // Create and show the chat widget
        const chatWidget = new ChatWidget(
          themeManager,
          'Welcome to the JupyterLab AI Assistant. How can I help you?'
        );
        chatWidget.id = 'jupyterlab-ai-assistant-chat';
        chatWidget.title.label = 'AI Assistant';
        chatWidget.title.icon = searchIcon;
        chatWidget.title.closable = true;

        app.shell.add(chatWidget, 'right', { rank: 1000 });
      }
    });

    // Add the command to the palette
    palette.addItem({ command, category: 'AI Assistant' });

    // No need to add to Help menu since we have our own menu now
    if (mainMenu) {
      console.log('AI Assistant menu created via schema definition');
    }

    console.log('JupyterLab AI Assistant extension initialized successfully');
  }
};

export default plugin; 