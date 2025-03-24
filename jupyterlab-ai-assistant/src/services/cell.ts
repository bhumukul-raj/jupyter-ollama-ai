/**
 * Service for interacting with the Ollama cell context API.
 */

import { analyzeCellContent } from './ollama';

/**
 * Interface for cell analysis result
 */
export interface CellAnalysisResult {
  message: {
    content: string;
    role?: string;
  };
  done?: boolean;
  error?: string;
}

/**
 * Analyze a cell's content using Ollama.
 * 
 * @param model - The model to use for analysis
 * @param cellContent - The content of the cell to analyze
 * @param question - The question to ask about the cell
 * @param cellType - The type of cell (code or markdown)
 * @returns Promise resolving to the analysis result
 */
export async function analyzeCell(
  model: string,
  cellContent: string,
  question: string,
  cellType: string = 'code'
): Promise<CellAnalysisResult> {
  try {
    // Determine if this is likely a data science query
    const isDataScience = detectDataScienceContent(cellContent, cellType);
    
    console.log(`Analyzing cell with model=${model}, type=${question}, isDataScience=${isDataScience}`);

    // Use the API service that properly handles XSRF tokens
    return await analyzeCellContent(model, cellContent, cellType, question);
  } catch (error) {
    console.error('Error in analyzeCell:', error);
    throw error;
  }
}

/**
 * Detect if the content is related to data science.
 * 
 * @param content - The content to check
 * @param cellType - The type of cell
 * @returns Boolean indicating if the content is data science related
 */
function detectDataScienceContent(content: string, cellType: string): boolean {
  // Don't analyze markdown cells as data science
  if (cellType !== 'code') {
    return false;
  }
  
  // Keywords that suggest data science code
  const dataScienceKeywords = [
    'pandas', 'numpy', 'matplotlib', 'seaborn', 'sklearn', 
    'tensorflow', 'pytorch', 'keras', 'pd.', 'np.', 'plt.', 
    'sns.', 'df.', 'dataframe', 'series', 'array', 'plot(',
    'describe(', 'corr(', 'fit(', 'predict('
  ];
  
  // Check for data science imports
  const importRegex = /import\s+(pandas|numpy|matplotlib|seaborn|sklearn|tensorflow|keras)|from\s+(pandas|numpy|matplotlib|seaborn|sklearn|tensorflow|keras)\s+import/i;
  if (importRegex.test(content)) {
    return true;
  }
  
  // Check for common data science functions and patterns
  return dataScienceKeywords.some(keyword => 
    content.toLowerCase().includes(keyword.toLowerCase())
  );
} 