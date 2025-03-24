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
  
  // Log request information
  console.log(`[DEBUG] Making ${init.method || 'GET'} request to: ${url}`);
  
  // Create headers with XSRF token for POST requests
  if (init.method === 'POST' || init.method === 'PUT' || init.method === 'DELETE') {
    // Ensure headers object exists
    init.headers = init.headers || {};
    
    // Add XSRF token from settings if available
    if (settings.token) {
      (init.headers as any)['X-XSRFToken'] = settings.token;
    }
    
    // Ensure content type is set for JSON requests
    if (!init.headers['Content-Type'] && init.body) {
      (init.headers as any)['Content-Type'] = 'application/json';
    }
    
    // Log the request headers and body
    console.log('[DEBUG] Request headers:', init.headers);
    if (init.body) {
      try {
        const bodyData = JSON.parse(init.body as string);
        console.log('[DEBUG] Request payload:', JSON.stringify(bodyData, null, 2));
      } catch (e) {
        console.log('[DEBUG] Request body:', init.body);
      }
    }
  }
  
  // Make the request
  let response: Response;
  try {
    console.log(`[DEBUG] Sending request to ${endPoint}...`);
    response = await ServerConnection.makeRequest(url, init, settings);
    console.log(`[DEBUG] Response status: ${response.status}`);
  } catch (error) {
    console.error('[ERROR] Network error making request:', error);
    throw new ServerConnection.NetworkError(error as any);
  }
  
  // Handle the response
  if (response.ok) {
    try {
      // Get response text
      const text = await response.text();
      console.log(`[DEBUG] Response size: ${text.length} bytes`);
      
      // Handle empty responses
      if (!text || text.trim() === '') {
        console.log('[DEBUG] Empty response received');
        return {} as T;
      }
      
      // Parse JSON response
      try {
        const data = JSON.parse(text);
        console.log('[DEBUG] Response parsed successfully:', JSON.stringify(data, null, 2).substring(0, 1000) + (JSON.stringify(data, null, 2).length > 1000 ? '... (truncated)' : ''));
        return data as T;
      } catch (e) {
        console.log('[DEBUG] Response is not JSON, returning as text');
        return text as unknown as T;
      }
    } catch (error) {
      console.error('[ERROR] Error processing response:', error);
      throw new ServerConnection.ResponseError(response);
    }
  } else {
    // Handle error responses
    let errorMessage: string;
    try {
      const text = await response.text();
      try {
        // Try to parse error as JSON
        const data = JSON.parse(text);
        errorMessage = data.message || data.error || text;
      } catch {
        // Use text as is if not JSON
        errorMessage = text;
      }
    } catch {
      errorMessage = response.statusText;
    }
    
    console.error(`[ERROR] Server error: ${response.status} - ${errorMessage}`);
    throw new ServerConnection.ResponseError(response, errorMessage);
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
 * Send a chat message to the Ollama API
 * 
 * @param model The model to use
 * @param messages The chat messages
 * @param options Additional options
 * @returns The response from Ollama (AsyncGenerator for streaming, object for non-streaming)
 */
export async function sendChatMessage(
  model: string,
  messages: Array<{ role: string; content: string }>,
  options: Record<string, any> = {}
): Promise<any> {
  try {
    // Log the request for debugging
    console.log(`Sending chat message to model ${model} with ${messages.length} messages`);
    
    // Check if streaming is requested
    const isStreaming = options.stream === true;
    
    if (isStreaming) {
      // For streaming, we'll use requestAPI and then handle the response as a stream
      // This ensures proper XSRF handling
      
      // Prepare headers and URL
      const settings = ServerConnection.makeSettings();
      const url = URLExt.join(
        settings.baseUrl,
        'api',
        'ollama',
        'chat'
      );
      
      // Create a custom fetch request that processes the stream
      // but let ServerConnection handle the XSRF token
      try {
        // First make a normal request using ServerConnection which handles XSRF token
        // but manually set options to handle streaming
        const init: RequestInit = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream'
          },
          body: JSON.stringify({
            model,
            messages,
            ...options
          })
        };
        
        console.log('[DEBUG] Making streaming request with ServerConnection');
        const response = await ServerConnection.makeRequest(url, init, settings);
        
        if (!response.ok) {
          const errorText = await response.text();
          return { error: `Error: ${response.status} - ${errorText}` };
        }
        
        // Now handle the streaming response
        const reader = response.body?.getReader();
        if (!reader) {
          return { error: 'Failed to get reader from response' };
        }
        
        const decoder = new TextDecoder();
        
        // Create an async generator to yield chunks as they arrive
        async function* streamGenerator() {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                yield { done: true };
                break;
              }
              
              const chunk = decoder.decode(value);
              console.log('[DEBUG] Received chunk:', chunk.substring(0, 50) + (chunk.length > 50 ? '...' : ''));
              
              const lines = chunk.split('\n\n');
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const jsonStr = line.slice(6);
                    if (jsonStr.trim()) {
                      const json = JSON.parse(jsonStr);
                      yield json;
                    }
                  } catch (e) {
                    console.error('Error parsing JSON from stream:', e);
                  }
                }
              }
            }
          } catch (e) {
            console.error('[ERROR] Error reading stream:', e);
            yield { error: `Error reading stream: ${e}` };
          } finally {
            reader.releaseLock();
          }
        }
        
        return streamGenerator();
      } catch (error) {
        console.error('[ERROR] Error in streaming request:', error);
        return { error: `Error in streaming request: ${error.message || error}` };
      }
    } else {
      // For non-streaming, use requestAPI as before
      const data = await requestAPI<any>('chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages,
          ...options
        })
      });
      
      return data;
    }
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
    
    // Add a try/catch specifically for the request to provide better error handling
    try {
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
      
      return data;
    } catch (requestError) {
      console.error('[ERROR] Cell analysis request failed:', requestError);
      // Rethrow with more context
      throw new Error(`Cell analysis failed: ${requestError.message || requestError}`);
    }
  } catch (error) {
    console.error('[ERROR] Error in analyzeCellContent:', error);
    throw error;
  }
} 