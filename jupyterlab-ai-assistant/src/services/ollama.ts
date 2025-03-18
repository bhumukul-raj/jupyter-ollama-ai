import { URLExt } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';

/**
 * Call the API extension
 *
 * @param endPoint API endpoint
 * @param init Request initialization options
 * @returns The response body parsed as JSON
 */
export async function requestAPI<T>(
  endPoint = '',
  init: RequestInit = {}
): Promise<T> {
  // Get server connection settings
  const settings = ServerConnection.makeSettings();
  
  // Construct the URL
  const url = URLExt.join(
    settings.baseUrl,
    'api',
    'ollama',
    endPoint
  );
  
  // Enhanced request logging
  console.log(`[DEBUG] Making ${init.method || 'GET'} request to: ${url}`);
  if (init.body) {
    try {
      const bodyData = JSON.parse(init.body as string);
      console.log('[DEBUG] Request payload:', JSON.stringify(bodyData, null, 2));
    } catch (e) {
      console.log('[DEBUG] Request body:', init.body);
    }
  }
  
  // Make the request
  const startTime = Date.now();
  let response: Response;
  try {
    console.log(`[DEBUG] Sending request to ${endPoint}...`);
    response = await ServerConnection.makeRequest(url, init, settings);
    console.log(`[DEBUG] Response received in ${Date.now() - startTime}ms, status: ${response.status}`);
  } catch (error) {
    console.error('[DEBUG] Network error making request:', error);
    throw new ServerConnection.NetworkError(error as any);
  }
  
  // For successful responses, get the data
  if (response.ok) {
    try {
      // For empty responses, return an empty object
      const text = await response.text();
      console.log(`[DEBUG] Response size: ${text.length} bytes`);
      
      if (!text || text.trim() === '') {
        console.log('[DEBUG] Empty response received');
        return {} as T;
      }
      
      // Try to parse the response as JSON
      try {
        const data = JSON.parse(text);
        console.log('[DEBUG] Response parsed successfully:', JSON.stringify(data, null, 2).substring(0, 1000) + (JSON.stringify(data, null, 2).length > 1000 ? '... (truncated)' : ''));
        return data as T;
      } catch (e) {
        console.error('[DEBUG] Error parsing JSON response:', e);
        console.debug('[DEBUG] Response text (first 500 chars):', text.substring(0, 500));
        throw new Error(`Invalid JSON response: ${e.message}`);
      }
    } catch (error) {
      console.error('[DEBUG] Error processing response:', error);
      throw new ServerConnection.ResponseError(
        response,
        `Failed to process response: ${error.message}`
      );
    }
  }
  
  // For error responses, try to get error details
  try {
    const text = await response.text();
    let errorData;
    
    // Try to parse the error response as JSON
    try {
      errorData = JSON.parse(text);
    } catch (e) {
      // If parsing fails, use the text directly
      throw new ServerConnection.ResponseError(
        response,
        `Server error: ${text.substring(0, 200)}`
      );
    }
    
    // Use the parsed error message or a default message
    throw new ServerConnection.ResponseError(
      response,
      errorData.error || `Server error: ${response.status} ${response.statusText}`
    );
  } catch (error) {
    if (error instanceof ServerConnection.ResponseError) {
      throw error;
    }
    
    // If all else fails, throw a generic error
    throw new ServerConnection.ResponseError(
      response,
      `Unknown error: ${response.status} ${response.statusText}`
    );
  }
}

/**
 * Get all available Ollama models
 * 
 * @returns A list of available models
 */
export async function getAvailableModels(): Promise<any[]> {
  console.log('[DEBUG] Fetching available Ollama models...');
  try {
    const data = await requestAPI<{ models: any[] }>('models');
    if (!data.models) {
      console.warn('[DEBUG] No models found in response:', data);
      return [];
    }
    console.log(`[DEBUG] Successfully fetched ${data.models.length} models:`, 
      data.models.map(m => m.name || m.id || 'unknown').join(', '));
    return data.models;
  } catch (error) {
    console.error('[DEBUG] Error fetching models:', error);
    return [];
  }
}

/**
 * Send a chat message to Ollama
 * 
 * @param model The model to use
 * @param messages The chat messages
 * @param options Additional options
 * @returns The response from Ollama
 */
export async function sendChatMessage(
  model: string,
  messages: Array<{ role: string; content: string }>,
  options: Record<string, any> = {}
): Promise<any> {
  try {
    // Log the request for debugging
    console.log(`Sending chat message to model ${model} with ${messages.length} messages`);
    
    const data = await requestAPI<any>('chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        ...options
      })
    });
    
    return data;
  } catch (error) {
    console.error('Error sending chat message:', error);
    throw error;
  }
}

/**
 * Analyze cell content using Ollama
 * 
 * @param model The model to use
 * @param cellContent The cell content to analyze
 * @param cellType The type of cell (code, markdown)
 * @param question The question to ask about the cell
 * @returns The analysis result
 */
export async function analyzeCellContent(
  model: string,
  cellContent: string,
  cellType: string,
  question: string
): Promise<any> {
  try {
    // Detailed request logging
    console.log('[DEBUG] Starting cell analysis request:');
    console.log(`[DEBUG] - Model: ${model}`);
    console.log(`[DEBUG] - Cell type: ${cellType}`);
    console.log(`[DEBUG] - Content length: ${cellContent.length} characters`);
    console.log(`[DEBUG] - Content preview: ${cellContent.substring(0, 100)}${cellContent.length > 100 ? '...' : ''}`);
    console.log(`[DEBUG] - Question: ${question}`);
    
    const requestStartTime = Date.now();
    const data = await requestAPI<any>('cell-context', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        cell_content: cellContent,
        cell_type: cellType,
        question
      })
    });
    
    console.log(`[DEBUG] Cell analysis completed in ${Date.now() - requestStartTime}ms`);
    
    // Add response validation with logging
    if (!data || typeof data !== 'object') {
      console.error('[DEBUG] Invalid response format:', data);
      throw new Error('Invalid response format from server');
    }

    // Check for error in response
    if ('error' in data) {
      console.error('[DEBUG] Server returned error:', data.error);
      throw new Error(data.error as string);
    }

    // Log successful response details
    if (data.message?.content) {
      console.log('[DEBUG] Response content length:', data.message.content.length);
      console.log('[DEBUG] Response preview:', data.message.content.substring(0, 100) + 
        (data.message.content.length > 100 ? '...' : ''));
    } else {
      console.log('[DEBUG] Response structure:', Object.keys(data).join(', '));
    }
    
    return data;
  } catch (error) {
    console.error('[DEBUG] Error analyzing cell content:', error);
    console.error('[DEBUG] Error context:', {
      model,
      cellType,
      contentLength: cellContent.length,
      questionType: question
    });
    throw error;
  }
} 