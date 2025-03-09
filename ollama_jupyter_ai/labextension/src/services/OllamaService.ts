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

// New persistent storage interface
interface OllamaStorageService {
  saveCache(key: string, value: CacheEntry): void;
  getCache(key: string): CacheEntry | null;
  getAllCacheKeys(): string[];
  clearCache(): void;
  isAvailable(): boolean;
}

// New service options interface
interface OllamaServiceOptions {
  baseUrl?: string;
  defaultModel?: string;
  cacheLifetime?: number;
  maxCacheSize?: number;
  persistCache?: boolean;
  debugEnabled?: boolean;
}

// Implement a local storage-based persistent cache
class LocalStorageCacheService implements OllamaStorageService {
  private readonly prefix = 'ollama_cache_';
  
  constructor() {
    this.cleanupExpiredEntries();
  }
  
  public saveCache(key: string, value: CacheEntry): void {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save cache to localStorage:', error);
      this.pruneCache(); // Try to make space
    }
  }
  
  public getCache(key: string): CacheEntry | null {
    try {
      const cached = localStorage.getItem(this.prefix + key);
      if (!cached) return null;
      
      const entry = JSON.parse(cached) as CacheEntry;
      
      // Check if entry has expired
      if (entry.expiresAt < Date.now()) {
        localStorage.removeItem(this.prefix + key);
        return null;
      }
      
      return entry;
    } catch (error) {
      console.error('Failed to retrieve cache from localStorage:', error);
      return null;
    }
  }
  
  public getAllCacheKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keys.push(key.substring(this.prefix.length));
      }
    }
    return keys;
  }
  
  public clearCache(): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
  
  // Check if local storage is available
  public isAvailable(): boolean {
    try {
      const testKey = '__ollama_test__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  // Remove expired entries to free up space
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        try {
          const entry = JSON.parse(localStorage.getItem(key) || '{}') as CacheEntry;
          if (entry.expiresAt < now) {
            keysToRemove.push(key);
          }
        } catch (error) {
          // Remove invalid entries
          keysToRemove.push(key);
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
  
  // Remove oldest entries when we're out of space
  private pruneCache(): void {
    try {
      // Get all cache entries with timestamps
      const entries: { key: string; timestamp: number }[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          try {
            const entry = JSON.parse(localStorage.getItem(key) || '{}') as CacheEntry;
            entries.push({ key, timestamp: entry.timestamp });
          } catch (error) {
            // Remove invalid entries
            localStorage.removeItem(key);
          }
        }
      }
      
      // Sort by timestamp (oldest first)
      entries.sort((a, b) => a.timestamp - b.timestamp);
      
      // Remove oldest 20% of entries
      const removeCount = Math.max(1, Math.ceil(entries.length * 0.2));
      entries.slice(0, removeCount).forEach(entry => {
        localStorage.removeItem(entry.key);
      });
    } catch (error) {
      console.error('Error pruning cache:', error);
    }
  }
}

// Enhanced OllamaService class
export class OllamaService {
  private baseUrl: string;
  private defaultModel: string;
  private debugEnabled: boolean = true;
  private responseCache: Map<string, CacheEntry> = new Map();
  private cacheTTL: number = 1000 * 60 * 30; // 30 minutes cache lifetime by default
  private activeRequests: Map<string, AbortController> = new Map();
  private storageService: OllamaStorageService | null = null;
  private maxCacheSize: number;
  private useTokenStreaming: boolean = true;
  
  constructor(baseUrl: string = 'http://localhost:11434', defaultModel: string = 'mistral', options?: OllamaServiceOptions) {
    this.baseUrl = options?.baseUrl || baseUrl;
    this.defaultModel = options?.defaultModel || defaultModel;
    this.cacheTTL = options?.cacheLifetime || 1000 * 60 * 30;
    this.maxCacheSize = options?.maxCacheSize || 100;
    this.debugEnabled = options?.debugEnabled ?? true;
    
    // Initialize persistent storage if requested
    if (options?.persistCache) {
      const storageService = new LocalStorageCacheService();
      if (storageService.isAvailable()) {
        this.storageService = storageService;
        this.log('Persistent cache enabled using localStorage');
      } else {
        this.log('Persistent cache requested but localStorage is not available');
      }
    }
    
    this.log('OllamaService initialized with base URL:', this.baseUrl);
    this.log('Default model set to:', this.defaultModel);
  }

  /**
   * A simple log method that conditionally logs based on debug setting
   */
  private log(...args: any[]): void {
    if (this.debugEnabled) {
      // Use only essential logging; avoid excessive console output
      console.log('[OllamaService]', ...args);
    }
  }

  /**
   * Get a list of available models from Ollama
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      this.log('Fetching available models');
      
      const response = await axios.get<{ models: OllamaModel[] }>(`${this.baseUrl}/api/tags`);
      const models = response.data.models.map(model => model.name);
      
      this.log('Found models:', models);
      return models;
    } catch (error) {
      this.log('Error fetching models:', error);
      
      // Try to return a sensible default if we can't reach Ollama
      if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
        // Ollama might not be running
        this.log('Ollama seems to be offline. Is it running?');
        throw new Error('Could not connect to Ollama. Please make sure it is running on ' + this.baseUrl);
      }
      
      return [];
    }
  }
  
  /**
   * Get the default model
   */
  getDefaultModel(): string {
    return this.defaultModel;
  }
  
  /**
   * Set the default model
   */
  setDefaultModel(model: string): void {
    this.defaultModel = model;
  }
  
  /**
   * Generate a cache key from the prompt and model
   */
  private getCacheKey(prompt: string, model: string): string {
    // Simple hashing function for the cache key
    return `${model}_${this.hashString(prompt)}`;
  }
  
  /**
   * Hash a string to create a shorter key
   */
  private hashString(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return hash.toString(16); // Convert to hex string
  }
  
  /**
   * Check if we have a cached response
   */
  private getCachedResponse(prompt: string, model: string): { response: string, fromCache: boolean } | null {
    const cacheKey = this.getCacheKey(prompt, model);
    
    // First check in-memory cache
    const memoryCached = this.responseCache.get(cacheKey);
    if (memoryCached) {
      const now = Date.now();
      if (memoryCached.expiresAt > now) {
        this.log('Cache hit (memory):', cacheKey);
        return { 
          response: memoryCached.response + '__FROM_CACHE__', 
          fromCache: true 
        };
      } else {
        // Expired entry
        this.responseCache.delete(cacheKey);
      }
    }
    
    // Then check persistent storage if available
    if (this.storageService) {
      const storageCached = this.storageService.getCache(cacheKey);
      if (storageCached) {
        // Add to in-memory cache for faster access next time
        this.responseCache.set(cacheKey, storageCached);
        this.log('Cache hit (storage):', cacheKey);
        return { 
          response: storageCached.response + '__FROM_CACHE__', 
          fromCache: true 
        };
      }
    }
    
    return null;
  }
  
  /**
   * Store a response in the cache
   */
  private cacheResponse(prompt: string, model: string, response: string): void {
    const cacheKey = this.getCacheKey(prompt, model);
    const now = Date.now();
    
    const cacheEntry: CacheEntry = {
      response,
      timestamp: now,
      expiresAt: now + this.cacheTTL
    };
    
    // Add to in-memory cache
    this.responseCache.set(cacheKey, cacheEntry);
    
    // Add to persistent storage if available
    if (this.storageService) {
      this.storageService.saveCache(cacheKey, cacheEntry);
    }
    
    // Ensure cache doesn't grow too large
    this.enforceMemoryCacheLimit();
    
    this.log('Cached response for:', cacheKey);
  }
  
  /**
   * Limit the in-memory cache size by removing oldest entries
   */
  private enforceMemoryCacheLimit(): void {
    if (this.responseCache.size <= this.maxCacheSize) return;
    
    // Sort entries by timestamp (oldest first)
    const entries = Array.from(this.responseCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest entries until we're under the limit
    const entriesToRemove = entries.slice(0, entries.length - this.maxCacheSize);
    for (const [key] of entriesToRemove) {
      this.responseCache.delete(key);
    }
    
    this.log(`Removed ${entriesToRemove.length} old entries from memory cache`);
  }
  
  /**
   * Clear the cache (both in-memory and persistent)
   */
  public clearCache(): void {
    this.responseCache.clear();
    
    if (this.storageService) {
      this.storageService.clearCache();
    }
    
    this.log('Cache cleared');
  }

  /**
   * Cancel an ongoing request
   */
  cancelRequest(requestId: string): boolean {
    console.log(`OllamaService: Attempting to cancel request ${requestId}`);
    
    const controller = this.activeRequests.get(requestId);
    
    if (controller) {
      try {
        console.log(`OllamaService: AbortController found for ${requestId}, sending abort signal...`);
        // Force immediate abort of the fetch request
        controller.abort();
        this.activeRequests.delete(requestId);
        
        // Also send a direct cancellation request to Ollama's API
        this.sendCancellationRequest(requestId)
          .then(() => console.log(`Direct cancellation request sent to Ollama for ${requestId}`))
          .catch(err => console.error(`Failed to send direct cancellation to Ollama: ${err}`));
        
        console.log(`Request ${requestId} canceled successfully`);
        return true;
      } catch (error) {
        console.error(`OllamaService: Error canceling request ${requestId}:`, error);
        // Still remove from active requests to avoid hanging requests
        this.activeRequests.delete(requestId); 
        return false;
      }
    }
    
    console.warn(`OllamaService: Request ${requestId} not found for cancellation`);
    return false;
  }

  /**
   * Send a direct cancellation request to Ollama's API
   * This attempts to send a direct signal to stop generation
   */
  private async sendCancellationRequest(requestId: string): Promise<void> {
    try {
      // Create a new AbortController for the cancellation request itself
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      // Attempt to send a POST request to Ollama's cancellation endpoint
      // This is a more direct approach to ensure the generation stops
      await fetch(`${this.baseUrl}/api/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ request_id: requestId }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      this.log(`Direct cancellation request for ${requestId} completed`);
    } catch (error) {
      // If this fails, log it but don't throw - we've already tried the AbortController approach
      this.log(`Error in direct cancellation request: ${error}`);
    }
  }

  /**
   * Handle a request cancellation during streaming
   */
  private handleStreamCancellation(requestId: string, controller: AbortController, fullResponseText: string, onUpdate?: (partialResponse: string, done: boolean, fromCache?: boolean) => void): void {
    this.log(`Request ${requestId} was cancelled during streaming`);
    
    // If we have an update callback, call it to indicate cancellation
    if (onUpdate) {
      onUpdate(fullResponseText + '\n\n[Response generation stopped]', true, false);
    }
    
    // Remove the active request
    this.activeRequests.delete(requestId);
  }

  /**
   * Send a request to Ollama
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
    
    // Store controller for potential cancellation
    if (requestId) {
      console.log(`Setting up AbortController for request ${requestId}`);
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

        // Flag to track if cancellation was requested
        let cancelled = false;

        // Setup listener for abort signals
        controller.signal.addEventListener('abort', () => {
          console.log(`Abort detected for request ${requestId}`);
          cancelled = true;
          
          this.handleStreamCancellation(
            requestId || 'unknown', 
            controller, 
            fullResponseText, 
            onUpdate
          );
        });

        // Read the stream until done or cancelled
        while (!cancelled) {
          try {
            const { done, value } = await reader.read();
            
            // Check if we've been cancelled during the read
            if (cancelled) {
              console.log(`Cancellation detected after read for ${requestId}`);
              break;
            }
            
            if (done) {
              onUpdate(fullResponseText, true, false);
              // Cache the full response
              this.cacheResponse(prompt, model, fullResponseText);
              this.log(`Request completed in ${Date.now() - requestStartTime}ms. Response cached.`);

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
            if (error.name === 'AbortError' || cancelled) {
              console.log(`Read was aborted for request ${requestId}`);
              return { response: fullResponseText, fromCache: false };
            }
            throw error;
          }
        }
        
        // If we exit the loop due to cancellation
        if (cancelled) {
          console.log(`Exited stream loop due to cancellation for ${requestId}`);
          return { response: fullResponseText, fromCache: false };
        }
        
        return { response: fullResponseText, fromCache: false };
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
        this.log(`Request completed in ${Date.now() - requestStartTime}ms. Response cached.`);
        
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

  /**
   * Get all active request IDs
   * @returns Array of active request IDs
   */
  getActiveRequests(): string[] {
    return Array.from(this.activeRequests.keys());
  }
} 