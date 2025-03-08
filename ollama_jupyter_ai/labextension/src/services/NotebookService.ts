import { NotebookPanel, NotebookActions } from '@jupyterlab/notebook';
import { CodeCell } from '@jupyterlab/cells';

export class NotebookService {
  private notebook: NotebookPanel | null = null;

  setNotebook(notebook: NotebookPanel) {
    this.notebook = notebook;
  }

  async executeCell(cell: CodeCell) {
    if (!this.notebook || !this.notebook.sessionContext) {
      throw new Error('No active notebook');
    }
    await this.notebook.sessionContext.session?.kernel?.requestExecute({
      code: cell.model.toString()
    }).done;
  }

  insertCell(type: 'code' | 'markdown', content: string, index?: number) {
    if (!this.notebook) {
      throw new Error('No active notebook');
    }

    // Use NotebookActions to insert a cell
    NotebookActions.insertBelow(this.notebook.content);
    const activeCell = this.notebook.content.activeCell;
    
    if (activeCell) {
      // Set the cell content
      activeCell.model.sharedModel.setSource(content);
      
      // Change cell type if needed
      if (type === 'markdown') {
        NotebookActions.changeCellType(this.notebook.content, 'markdown');
      }
    }
  }

  deleteCell(index: number) {
    if (!this.notebook) {
      throw new Error('No active notebook');
    }
    
    // Select the cell at the given index
    this.notebook.content.activeCellIndex = index;
    // Delete the selected cell
    NotebookActions.deleteCells(this.notebook.content);
  }

  moveCell(fromIndex: number, toIndex: number) {
    if (!this.notebook) {
      throw new Error('No active notebook');
    }
    
    // Select the cell at fromIndex
    this.notebook.content.activeCellIndex = fromIndex;
    
    // Move the cell up or down based on the target index
    const steps = Math.abs(toIndex - fromIndex);
    for (let i = 0; i < steps; i++) {
      if (fromIndex < toIndex) {
        NotebookActions.moveDown(this.notebook.content);
      } else {
        NotebookActions.moveUp(this.notebook.content);
      }
    }
  }

  getCellContent(index: number): string {
    if (!this.notebook || !this.notebook.model) {
      throw new Error('No active notebook');
    }
    const cell = this.notebook.model.cells.get(index);
    return cell ? cell.sharedModel.getSource() : '';
  }

  getAllCellsContent(): string {
    if (!this.notebook || !this.notebook.model) {
      throw new Error('No active notebook');
    }
    const cells = this.notebook.model.cells;
    let content = '';
    for (let i = 0; i < cells.length; i++) {
      const cell = cells.get(i);
      content += `Cell ${i + 1}:\n${cell.sharedModel.getSource()}\n\n`;
    }
    return content;
  }
}