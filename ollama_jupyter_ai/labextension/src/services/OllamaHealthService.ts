import axios from 'axios';
import { OllamaError, OllamaConnectionError, OllamaTimeoutError } from './OllamaService';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  message: string;
  lastChecked: Date;
  responseTime?: number;
  details?: {
    availableModels?: string[];
    error?: string;
    retryCount?: number;
    lastError?: string;
  };
}

export class OllamaHealthService {
  private baseUrl: string;
  private healthCheckInterval: number;
  private maxRetries: number;
  private retryDelay: number;
  private onStatusChange?: (status: HealthCheckResult) => void;
  private intervalId?: NodeJS.Timeout;
  private lastStatus: HealthCheckResult;
  private consecutiveFailures: number = 0;
  private readonly maxConsecutiveFailures: number = 5;
  
  constructor(
    baseUrl: string = 'http://localhost:11434',
    healthCheckInterval: number = 30000, // 30 seconds
    maxRetries: number = 3,
    retryDelay: number = 1000 // 1 second
  ) {
    this.baseUrl = baseUrl;
    this.healthCheckInterval = healthCheckInterval;
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
    this.lastStatus = {
      status: 'unhealthy',
      message: 'Initial state',
      lastChecked: new Date()
    };
  }
  
  public async checkHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    let attempts = 0;
    let lastError: Error | null = null;
    
    while (attempts < this.maxRetries) {
      try {
        // Try to get the list of models as a health check
        const response = await axios.get(`${this.baseUrl}/api/tags`, {
          timeout: 5000 // 5 second timeout
        });
        
        const responseTime = Date.now() - startTime;
        const models = response.data.models.map((model: any) => model.name);
        
        // Reset consecutive failures on success
        this.consecutiveFailures = 0;
        
        const status: HealthCheckResult = {
          status: 'healthy',
          message: 'Ollama service is running normally',
          lastChecked: new Date(),
          responseTime,
          details: {
            availableModels: models,
            retryCount: attempts
          }
        };
        
        // Only notify if status changed
        if (this.lastStatus.status !== status.status) {
          this.onStatusChange?.(status);
        }
        
        this.lastStatus = status;
        return status;
      } catch (error) {
        lastError = error as Error;
        attempts++;
        
        // Increment consecutive failures
        this.consecutiveFailures++;
        
        // If we've hit the maximum consecutive failures, mark as degraded
        if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
          const status: HealthCheckResult = {
            status: 'degraded',
            message: 'Ollama service is experiencing persistent issues',
            lastChecked: new Date(),
            details: {
              error: lastError?.message,
              retryCount: attempts,
              lastError: lastError?.stack
            }
          };
          
          if (this.lastStatus.status !== status.status) {
            this.onStatusChange?.(status);
          }
          
          this.lastStatus = status;
          return status;
        }
        
        if (attempts < this.maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempts), 5000); // Exponential backoff, max 5 seconds
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        }
      }
    }
    
    // After all retries failed
    const status: HealthCheckResult = {
      status: 'unhealthy',
      message: this.getDetailedErrorMessage(lastError),
      lastChecked: new Date(),
      details: {
        error: lastError?.message,
        retryCount: attempts,
        lastError: lastError?.stack
      }
    };
    
    // Only notify if status changed
    if (this.lastStatus.status !== status.status) {
      this.onStatusChange?.(status);
    }
    
    this.lastStatus = status;
    return status;
  }
  
  private getDetailedErrorMessage(error: Error | null): string {
    if (!error) {
      return 'Unknown error occurred while checking Ollama service health';
    }
    
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        return `Could not connect to Ollama service at ${this.baseUrl}. Is it running?`;
      }
      if (error.code === 'ETIMEDOUT') {
        return `Connection to Ollama service timed out. Please check your network connection.`;
      }
      if (error.response) {
        return `Ollama service returned an error: ${error.response.status} - ${error.response.statusText}`;
      }
      if (error.request) {
        return 'No response received from Ollama service';
      }
    }
    
    return `Ollama service error: ${error.message}`;
  }
  
  public startMonitoring(onStatusChange?: (status: HealthCheckResult) => void): void {
    this.onStatusChange = onStatusChange;
    
    // Clear any existing interval
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    
    // Perform initial health check
    this.checkHealth().catch(error => {
      console.error('Error during initial health check:', error);
    });
    
    // Set up periodic health checks
    this.intervalId = setInterval(async () => {
      try {
        await this.checkHealth();
      } catch (error) {
        console.error('Error during periodic health check:', error);
      }
    }, this.healthCheckInterval);
  }
  
  public stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.onStatusChange = undefined;
  }
  
  public getLastStatus(): HealthCheckResult {
    return this.lastStatus;
  }
  
  public async testConnection(): Promise<{
    isConnected: boolean;
    error?: string;
    details?: any;
  }> {
    try {
      const startTime = Date.now();
      const response = await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: 5000
      });
      
      const responseTime = Date.now() - startTime;
      
      return {
        isConnected: true,
        details: {
          models: response.data.models,
          responseTime,
          serverUrl: this.baseUrl
        }
      };
    } catch (error: any) {
      let errorMessage = 'Unknown error occurred';
      let details = {};
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          errorMessage = 'Could not connect to Ollama service. Is it running?';
          details = { code: 'ECONNREFUSED', url: this.baseUrl };
        } else if (error.code === 'ETIMEDOUT') {
          errorMessage = 'Connection to Ollama service timed out';
          details = { code: 'ETIMEDOUT', url: this.baseUrl };
        } else if (error.response) {
          errorMessage = `Server responded with error: ${error.response.status}`;
          details = { 
            statusCode: error.response.status,
            statusText: error.response.statusText,
            url: this.baseUrl
          };
        } else if (error.request) {
          errorMessage = 'No response received from server';
          details = { code: 'NO_RESPONSE', url: this.baseUrl };
        } else {
          errorMessage = error.message;
          details = { code: 'UNKNOWN', url: this.baseUrl };
        }
      }
      
      return {
        isConnected: false,
        error: errorMessage,
        details
      };
    }
  }
  
  public getConnectionInstructions(): string {
    return `
To connect to Ollama:

1. Make sure Ollama is installed
   - Visit https://ollama.ai for installation instructions
   - Follow the platform-specific setup guide

2. Start the Ollama service
   - Open a terminal
   - Run: ollama serve

3. Pull a model (if not already done)
   - In terminal: ollama pull mistral
   - Wait for the download to complete

4. Verify the connection
   - The service should be running on ${this.baseUrl}
   - Try restarting the Ollama service if issues persist
   - Check your firewall settings if connection is blocked

5. Common troubleshooting steps:
   - Ensure no other service is using port 11434
   - Check system resources (CPU, memory, disk space)
   - Verify network connectivity
   - Check Ollama service logs for errors

Need help? Visit: https://github.com/bhumukul-raj/ollama-ai-assistant-project/issues
    `.trim();
  }

  /**
   * Waits for the service to be healthy or until timeout
   * @param timeout Timeout in milliseconds
   * @returns A promise that resolves when the service is healthy or rejects on timeout
   */
  public async waitForHealthy(timeout: number = 10000): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    // Check health initially
    let status = await this.checkHealth();
    
    // If already healthy, return immediately
    if (status.status === 'healthy') {
      return status;
    }
    
    // Wait for healthy status or timeout
    return new Promise<HealthCheckResult>((resolve, reject) => {
      const checkInterval = setInterval(async () => {
        // Check if we've exceeded the timeout
        if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          reject(new Error(`Timeout waiting for Ollama service to be healthy. Current status: ${status.status}`));
          return;
        }
        
        // Check health
        status = await this.checkHealth();
        
        // If healthy, resolve
        if (status.status === 'healthy') {
          clearInterval(checkInterval);
          resolve(status);
        }
      }, 1000); // Check every second
    });
  }
} 