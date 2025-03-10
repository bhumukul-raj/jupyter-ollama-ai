import axios from 'axios';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  message: string;
  lastChecked: Date;
  responseTime?: number;
}

export class OllamaHealthService {
  private baseUrl: string;
  private healthCheckInterval: number;
  private maxRetries: number;
  private retryDelay: number;
  private onStatusChange?: (status: HealthCheckResult) => void;
  private intervalId?: NodeJS.Timeout;
  private lastStatus: HealthCheckResult;
  
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
  
  public startMonitoring(onStatusChange?: (status: HealthCheckResult) => void): void {
    this.onStatusChange = onStatusChange;
    this.checkHealth(); // Initial check
    this.intervalId = setInterval(() => this.checkHealth(), this.healthCheckInterval);
  }
  
  public stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
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
        const status: HealthCheckResult = {
          status: 'healthy',
          message: 'Ollama service is running normally',
          lastChecked: new Date(),
          responseTime
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
        
        if (attempts < this.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        }
      }
    }
    
    // After all retries failed
    const status: HealthCheckResult = {
      status: 'unhealthy',
      message: `Ollama service is not responding: ${lastError?.message}`,
      lastChecked: new Date()
    };
    
    // Only notify if status changed
    if (this.lastStatus.status !== status.status) {
      this.onStatusChange?.(status);
    }
    
    this.lastStatus = status;
    return status;
  }
  
  public async waitForHealthy(
    timeout: number = 30000,
    interval: number = 1000
  ): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const status = await this.checkHealth();
      if (status.status === 'healthy') {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    return false;
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
      const response = await axios.get(`${this.baseUrl}/api/tags`, {
        timeout: 5000
      });
      
      return {
        isConnected: true,
        details: {
          models: response.data.models,
          responseTime: response.headers['x-response-time']
        }
      };
    } catch (error: any) {
      let errorMessage = 'Unknown error occurred';
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          errorMessage = 'Could not connect to Ollama service. Is it running?';
        } else if (error.response) {
          errorMessage = `Server responded with error: ${error.response.status}`;
        } else if (error.request) {
          errorMessage = 'No response received from server';
        } else {
          errorMessage = error.message;
        }
      }
      
      return {
        isConnected: false,
        error: errorMessage
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

Need help? Visit: https://github.com/bhumukul-raj/ollama-ai-assistant-project/issues
    `.trim();
  }
} 