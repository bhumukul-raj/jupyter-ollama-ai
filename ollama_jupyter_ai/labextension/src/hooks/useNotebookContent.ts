import { useState, useEffect, useCallback } from 'react';
import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';
import { CodeCell } from '@jupyterlab/cells';
import { NotebookService } from '../services/NotebookService';

interface UseNotebookContentOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const useNotebookContent = (
  notebooks: INotebookTracker,
  options: UseNotebookContentOptions = {}
) => {
  const [notebookService] = useState(() => new NotebookService());
  const [currentNotebook, setCurrentNotebook] = useState<NotebookPanel | null>(null);
  const [notebookContent, setNotebookContent] = useState<string>('');
  const [activeCellContent, setActiveCellContent] = useState<{
    content: string;
    cellType: string;
    index: number;
  } | null>(null);
  const [hasNotebook, setHasNotebook] = useState<boolean>(false);
  
  // Update current notebook when active notebook changes
  useEffect(() => {
    // Set initial notebook if available
    if (notebooks.currentWidget) {
      setCurrentNotebook(notebooks.currentWidget);
      notebookService.setNotebook(notebooks.currentWidget);
      setHasNotebook(true);
    } else {
      setHasNotebook(false);
    }
    
    // Listen for notebook changes
    const notebookChanged = (tracker: INotebookTracker, panel: NotebookPanel | null) => {
      setCurrentNotebook(panel);
      if (panel) {
        notebookService.setNotebook(panel);
        setHasNotebook(true);
        refreshNotebookContent();
      } else {
        setHasNotebook(false);
      }
    };
    
    // Listen for active cell changes
    const activeCellChanged = () => {
      refreshActiveCellContent();
    };
    
    // Subscribe to notebook changes
    notebooks.currentChanged.connect(notebookChanged);
    
    // Subscribe to active cell changes if a notebook is active
    if (notebooks.currentWidget) {
      notebooks.currentWidget.content.activeCellChanged.connect(activeCellChanged);
    }
    
    // Set up auto-refresh if enabled
    let refreshTimer: number | null = null;
    
    if (options.autoRefresh && options.refreshInterval) {
      refreshTimer = window.setInterval(() => {
        refreshNotebookContent();
        refreshActiveCellContent();
      }, options.refreshInterval);
    }
    
    // Initial content refresh
    refreshNotebookContent();
    refreshActiveCellContent();
    
    // Cleanup
    return () => {
      notebooks.currentChanged.disconnect(notebookChanged);
      
      if (notebooks.currentWidget) {
        notebooks.currentWidget.content.activeCellChanged.disconnect(activeCellChanged);
      }
      
      if (refreshTimer !== null) {
        clearInterval(refreshTimer);
      }
    };
  }, [notebooks, notebookService, options.autoRefresh, options.refreshInterval]);
  
  // Refresh notebook content
  const refreshNotebookContent = useCallback(() => {
    if (currentNotebook && hasNotebook) {
      try {
        const content = notebookService.getAllCellsContent();
        setNotebookContent(content);
      } catch (err) {
        console.error('Error getting notebook content:', err);
        setNotebookContent('');
      }
    } else {
      setNotebookContent('');
    }
  }, [currentNotebook, notebookService, hasNotebook]);
  
  // Refresh active cell content
  const refreshActiveCellContent = useCallback(() => {
    if (currentNotebook && hasNotebook) {
      try {
        const activeCell = currentNotebook.content.activeCell;
        
        if (activeCell) {
          const activeCellIndex = currentNotebook.content.activeCellIndex;
          const content = notebookService.getCellContent(activeCellIndex);
          
          setActiveCellContent({
            content,
            cellType: activeCell.model.type,
            index: activeCellIndex
          });
        } else {
          setActiveCellContent(null);
        }
      } catch (err) {
        console.error('Error getting active cell content:', err);
        setActiveCellContent(null);
      }
    } else {
      setActiveCellContent(null);
    }
  }, [currentNotebook, notebookService, hasNotebook]);
  
  // Insert a new cell in the notebook
  const insertCell = useCallback((
    type: 'code' | 'markdown',
    content: string,
    index?: number
  ) => {
    if (hasNotebook) {
      try {
        notebookService.insertCell(type, content, index);
        refreshNotebookContent();
      } catch (err) {
        console.error('Error inserting cell:', err);
        throw err;
      }
    } else {
      throw new Error('No active notebook');
    }
  }, [notebookService, refreshNotebookContent, hasNotebook]);
  
  // Execute a cell by index
  const executeCell = useCallback(async (index: number) => {
    if (currentNotebook && hasNotebook) {
      try {
        const cell = currentNotebook.content.widgets[index];
        if (cell.model.type === 'code') {
          // Check if it's a CodeCell before executing
          if ('outputArea' in cell) {
            await notebookService.executeCell(cell as CodeCell);
          } else {
            throw new Error('Cell is not a CodeCell');
          }
        } else {
          throw new Error('Cannot execute non-code cell');
        }
      } catch (err) {
        console.error('Error executing cell:', err);
        throw err;
      }
    } else {
      throw new Error('No active notebook');
    }
  }, [currentNotebook, notebookService, hasNotebook]);
  
  return {
    notebookContent,
    activeCellContent,
    refreshNotebookContent,
    refreshActiveCellContent,
    insertCell,
    executeCell,
    hasActiveNotebook: hasNotebook
  };
};

export default useNotebookContent; 