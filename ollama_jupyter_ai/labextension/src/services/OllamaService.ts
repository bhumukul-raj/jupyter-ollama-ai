import axios from 'axios';

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  context: number[];
  done: boolean;
}

interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
}

// Cache interface for storing responses
interface CacheEntry {
  response: string;
  timestamp: number;
  expiresAt: number;
}

// Maximum size for notebook context
const MAX_NOTEBOOK_CONTEXT_SIZE = 5000;

export class OllamaService {
  private baseUrl: string;
  private defaultModel: string;
  private debugEnabled: boolean = true;
  private responseCache: Map<string, CacheEntry> = new Map();
  private cacheTTL: number = 1000 * 60 * 30; // 30 minutes cache lifetime
  private activeRequests: Map<string, AbortController> = new Map();

  constructor(baseUrl: string = 'http://localhost:11434', defaultModel: string = 'mistral') {
    this.baseUrl = baseUrl;
    this.defaultModel = defaultModel;
    this.log('OllamaService initialized with base URL:', baseUrl);
    this.log('Default model set to:', defaultModel);
  }

  /**
   * Log messages to console
   */
  private log(...args: any[]): void {
    if (!this.debugEnabled) return;
    
    // Log to console with timestamp
    const timestamp = new Date().toISOString();
    console.debug(`[${timestamp}] [OllamaService]`, ...args);
  }

  /**
   * Fetch available models from Ollama
   * @returns Array of available model names
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      this.log('Fetching available models from Ollama API');
      const response = await axios.get(`${this.baseUrl}/api/tags`);
      this.log('Models response:', response.data);
      
      if (response.data && response.data.models) {
        const models = response.data.models.map((model: OllamaModel) => model.name);
        return models;
      }
      
      return [];
    } catch (error) {
      this.log('Error fetching models from Ollama API:', error);
      
      // Try alternative endpoint
      try {
        this.log('Trying alternative endpoint for models');
        const response = await axios.get(`${this.baseUrl}/api/models`);
        this.log('Alternative models response:', response.data);
        
        if (response.data && Array.isArray(response.data.models)) {
          return response.data.models.map((model: any) => model.name || model);
        }
        
        return [];
      } catch (altError) {
        this.log('Error with alternative endpoint:', altError);
        return [];
      }
    }
  }

  /**
   * Get the default model name
   * @returns The default model name
   */
  getDefaultModel(): string {
    return this.defaultModel;
  }

  /**
   * Generate a caching key from the request parameters
   */
  private getCacheKey(prompt: string, model: string): string {
    return `${model}:${prompt}`;
  }

  /**
   * Check if a response is cached and still valid
   */
  private getCachedResponse(prompt: string, model: string): { response: string, fromCache: boolean } | null {
    const cacheKey = this.getCacheKey(prompt, model);
    const cachedEntry = this.responseCache.get(cacheKey);
    
    if (cachedEntry && Date.now() < cachedEntry.expiresAt) {
      this.log('Cache hit for:', cacheKey);
      console.log(`[OllamaService] CACHE HIT: Response found in cache (saved ${Date.now() - cachedEntry.timestamp}ms ago)`);
      return { response: cachedEntry.response, fromCache: true };
    }
    
    // Clean up expired entry if found
    if (cachedEntry) {
      this.log('Cache expired for:', cacheKey);
      this.responseCache.delete(cacheKey);
    }
    
    console.log(`[OllamaService] CACHE MISS: Request will be sent to Ollama API`);
    return null;
  }

  /**
   * Cache a response
   */
  private cacheResponse(prompt: string, model: string, response: string): void {
    const cacheKey = this.getCacheKey(prompt, model);
    this.responseCache.set(cacheKey, {
      response,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.cacheTTL
    });
    
    // Cleanup cache if it gets too large (keep the most recent 50 entries)
    if (this.responseCache.size > 50) {
      const keys = Array.from(this.responseCache.keys());
      const oldestKeys = keys.slice(0, keys.length - 50);
      for (const key of oldestKeys) {
        this.responseCache.delete(key);
      }
    }
  }

  /**
   * Cancel an active request
   * @param requestId The ID of the request to cancel
   * @returns True if a request was cancelled, false otherwise
   */
  cancelRequest(requestId: string): boolean {
    const controller = this.activeRequests.get(requestId);
    if (controller) {
      this.log(`Cancelling request with ID: ${requestId}`);
      controller.abort();
      this.activeRequests.delete(requestId);
      return true;
    }
    return false;
  }

  /**
   * Send a request to the Ollama API with streaming
   * @param prompt The prepared prompt to send
   * @param model The model to use
   * @param includeNotebookContext Whether to include notebook context
   * @param onUpdate Optional callback for streaming updates
   * @param requestId Optional ID for this request (for cancellation)
   * @returns The generated response text and cache status
   * @private
   */
  private async sendRequest(
    prompt: string, 
    model: string, 
    includeNotebookContext: boolean = false,
    onUpdate?: (partialResponse: string, done: boolean, fromCache?: boolean) => void,
    requestId?: string
  ): Promise<{ response: string, fromCache: boolean }> {
    this.log('Sending request to Ollama API:', {
      model,
      prompt,
      includeNotebookContext,
      requestId
    });

    // Check cache first for non-streaming requests
    if (!onUpdate) {
      const cachedResponse = this.getCachedResponse(prompt, model);
      if (cachedResponse) {
        return cachedResponse;
      }
    } else {
      // Even for streaming requests, we can check the cache
      const cachedResponse = this.getCachedResponse(prompt, model);
      if (cachedResponse) {
        // For streaming requests, immediately deliver the full cached response
        if (onUpdate) {
          onUpdate(cachedResponse.response, true, true);
        }
        return cachedResponse;
      }
    }

    const fullUrl = `${this.baseUrl}/api/generate`;
    const requestBody = {
      model,
      prompt,
      options: {
        temperature: 0.7,
        max_tokens: 2048
      },
      stream: !!onUpdate // Enable streaming if onUpdate callback is provided
    };

    // Create AbortController for this request
    const controller = new AbortController();
    if (requestId) {
      this.activeRequests.set(requestId, controller);
    }

    try {
      const requestStartTime = Date.now();
      if (onUpdate) {
        // Streaming implementation
        const response = await fetch(fullUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Response body reader could not be created');
        }

        let fullResponseText = '';
        const decoder = new TextDecoder();

        while (true) {
          try {
            const { done, value } = await reader.read();
            
            if (done) {
              onUpdate(fullResponseText, true, false);
              // Cache the full response
              this.cacheResponse(prompt, model, fullResponseText);
              console.log(`[OllamaService] Request completed in ${Date.now() - requestStartTime}ms. Response cached.`);

              // Clean up the active request
              if (requestId) {
                this.activeRequests.delete(requestId);
              }
              
              return { response: fullResponseText, fromCache: false };
            }

            // Decode the chunk and split into lines (JSONL format)
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
              try {
                const jsonResponse = JSON.parse(line) as OllamaResponse;
                if (jsonResponse.response) {
                  fullResponseText += jsonResponse.response;
                  onUpdate(fullResponseText, jsonResponse.done, false);
                }
              } catch (e) {
                this.log('Error parsing JSON line:', e);
              }
            }
          } catch (error: any) {
            if (error.name === 'AbortError') {
              this.log('Request was cancelled');
              onUpdate(fullResponseText + '\n\n[Request cancelled by user]', true, false);
              return { response: fullResponseText, fromCache: false };
            }
            throw error;
          }
        }
      } else {
        // Non-streaming implementation (using fetch for consistency)
        const response = await fetch(fullUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const responseText = await response.text();
        const lines = responseText.trim().split('\n');
        let fullResponseText = '';
        
        for (const line of lines) {
          try {
            const jsonResponse = JSON.parse(line) as OllamaResponse;
            if (jsonResponse.response) {
              fullResponseText += jsonResponse.response;
            }
          } catch (e) {
            this.log('Error parsing JSON line:', e);
          }
        }

        if (!fullResponseText) {
          throw new Error('No valid response text found in the API response');
        }

        // Cache the response
        this.cacheResponse(prompt, model, fullResponseText);
        console.log(`[OllamaService] Request completed in ${Date.now() - requestStartTime}ms. Response cached.`);
        
        // Clean up the active request
        if (requestId) {
          this.activeRequests.delete(requestId);
        }
        
        return { response: fullResponseText, fromCache: false };
      }
    } catch (error: any) {
      // Clean up the active request on error
      if (requestId) {
        this.activeRequests.delete(requestId);
      }
      
      if (error.name === 'AbortError') {
        this.log('Request was cancelled');
        return { response: '[Request cancelled by user]', fromCache: false };
      }
      
      this.log('API request failed:', error);
      throw new Error(`Failed to get response from Ollama API: ${error}`);
    }
  }

  /**
   * Generate a response from the Ollama API
   * @param prompt The user's prompt
   * @param model The model to use (defaults to the service's default model)
   * @param notebookContent Optional notebook content for context
   * @param onUpdate Optional callback for streaming updates
   * @param requestId Optional ID for this request (for cancellation)
   * @returns The generated response text
   */
  async generateResponse(
    prompt: string, 
    model?: string,
    notebookContent?: string,
    onUpdate?: (partialResponse: string, done: boolean, fromCache?: boolean) => void,
    requestId?: string
  ): Promise<string> {
    const selectedModel = model || this.defaultModel;
    this.log('Generating response for prompt:', prompt);
    this.log('Using model:', selectedModel);
    
    // For chat messages, we don't need notebook context
    const result = await this.sendRequest(prompt, selectedModel, false, onUpdate, requestId);
    return result.response;
  }

  /**
   * Optimize notebook content by trimming if it's too large
   * @param notebookContent Notebook content to optimize
   * @returns Optimized notebook content
   */
  private optimizeNotebookContent(notebookContent: string): string {
    if (!notebookContent) return '';
    
    if (notebookContent.length <= MAX_NOTEBOOK_CONTEXT_SIZE) {
      return notebookContent;
    }
    
    this.log(`Notebook content too large (${notebookContent.length} chars), truncating...`);
    
    // Simple truncation strategy - truncate to max size while keeping cell boundaries
    const cells = notebookContent.split(/--- Cell \d+\/\d+ \[.*?\] ---/);
    let truncatedContent = '';
    let currentSize = 0;
    
    // Add the most important cells first (usually the active and adjacent cells)
    // This is a simple approach - a more sophisticated one would analyze content relevance
    for (const cell of cells) {
      if (currentSize + cell.length <= MAX_NOTEBOOK_CONTEXT_SIZE) {
        truncatedContent += cell;
        currentSize += cell.length;
      } else {
        // For the last cell that doesn't fit completely, add as much as possible
        const remainingSpace = MAX_NOTEBOOK_CONTEXT_SIZE - currentSize;
        if (remainingSpace > 100) { // Only add partial content if it's substantial
          truncatedContent += cell.substring(0, remainingSpace) + "\n[... content truncated ...]";
        } else {
          truncatedContent += "\n[... additional content truncated ...]";
        }
        break;
      }
    }
    
    this.log(`Truncated notebook content to ${truncatedContent.length} chars`);
    return truncatedContent;
  }

  private async sendRequestWithNotebookContext(
    prompt: string, 
    model: string, 
    notebookContent: string, 
    onUpdate?: (partialResponse: string, done: boolean, fromCache?: boolean) => void,
    requestId?: string
  ): Promise<string> {
    this.log('Raw notebook content type:', typeof notebookContent);
    
    // Optimize large notebook content
    const optimizedContent = this.optimizeNotebookContent(notebookContent);
    this.log('Raw notebook content sample (optimized):', optimizedContent.slice(0, 100));

    const promptWithContext = `Notebook Context:\n${optimizedContent}\n\nUser query: ${prompt}`;
    this.log('Created prompt with notebook context');
    
    const result = await this.sendRequest(promptWithContext, model, true, onUpdate, requestId);
    return result.response;
  }

  /**
   * Analyze code for errors or issues
   * @param code The code to analyze
   * @param model The model to use
   * @param onUpdate Optional callback for streaming updates
   * @param requestId Optional ID for this request (for cancellation)
   * @returns Analysis of the code
   */
  async analyzeCode(
    code: string, 
    model?: string, 
    onUpdate?: (partialResponse: string, done: boolean, fromCache?: boolean) => void,
    requestId?: string
  ): Promise<string> {
    const selectedModel = model || this.defaultModel;
    const prompt = `Analyze this code and provide detailed feedback:\n\`\`\`\n${code}\n\`\`\``;
    return this.sendRequestWithNotebookContext(prompt, selectedModel, code, onUpdate, requestId);
  }

  /**
   * Suggest improvements for code
   * @param code The code to improve
   * @param model The model to use
   * @param onUpdate Optional callback for streaming updates
   * @param requestId Optional ID for this request (for cancellation)
   * @returns Suggested improvements
   */
  async suggestCodeImprovements(
    code: string, 
    model?: string, 
    onUpdate?: (partialResponse: string, done: boolean, fromCache?: boolean) => void,
    requestId?: string
  ): Promise<string> {
    const selectedModel = model || this.defaultModel;
    const prompt = `Suggest improvements for this code:\n\`\`\`\n${code}\n\`\`\``;
    return this.sendRequestWithNotebookContext(prompt, selectedModel, code, onUpdate, requestId);
  }
} 