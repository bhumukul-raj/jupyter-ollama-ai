# Error Handling & Recovery

This document describes the error handling and recovery mechanisms implemented in the Ollama JupyterLab AI Assistant.

## Overview

The extension includes robust error handling capabilities to ensure a smooth user experience even when connectivity issues or other problems occur. These features help:

- Detect and report connection problems with Ollama service
- Automatically recover from temporary failures
- Provide clear feedback and instructions to users
- Monitor service health in real-time

The main implementation is in the `OllamaHealthService.ts` file, which provides a comprehensive health monitoring solution.

## Ollama Health Service

The `OllamaHealthService` class provides tools for monitoring and recovering from connectivity issues with the Ollama backend.

```typescript
export class OllamaHealthService {
  constructor(
    baseUrl: string = 'http://localhost:11434',
    healthCheckInterval: number = 30000, // 30 seconds
    maxRetries: number = 3,
    retryDelay: number = 1000 // 1 second
  )
}
```

### Health Monitoring

The service can continuously monitor the Ollama backend's health status:

```typescript
public startMonitoring(onStatusChange?: (status: HealthCheckResult) => void): void
public stopMonitoring(): void
```

#### Usage Example

```typescript
const healthService = new OllamaHealthService();

// Start monitoring with status change callback
healthService.startMonitoring((status) => {
  if (status.status === 'healthy') {
    showConnectedStatus();
  } else {
    showDisconnectedStatus(status.message);
  }
});

// Stop monitoring when component unmounts
useEffect(() => {
  return () => healthService.stopMonitoring();
}, []);
```

### Health Checking

The service provides methods to check the health of the Ollama service:

```typescript
public async checkHealth(): Promise<HealthCheckResult>
public getLastStatus(): HealthCheckResult
```

#### Health Check Results

Health checks return a structured result:

```typescript
interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  message: string;
  lastChecked: Date;
  responseTime?: number;
}
```

#### Usage Example

```typescript
// Check health before a critical operation
async function beforeSendingMessage() {
  const health = await healthService.checkHealth();
  
  if (health.status !== 'healthy') {
    showWarning(`Connection issue: ${health.message}`);
    return false;
  }
  
  return true;
}
```

### Auto-Recovery

The service provides utilities to wait for the Ollama service to become available:

```typescript
public async waitForHealthy(
  timeout: number = 30000,
  interval: number = 1000
): Promise<boolean>
```

#### Usage Example

```typescript
// Wait for service to recover before proceeding
async function recoverAndRetry() {
  showLoadingIndicator('Waiting for Ollama service...');
  
  const recovered = await healthService.waitForHealthy(
    10000,  // Wait up to 10 seconds
    500     // Check every 500ms
  );
  
  if (recovered) {
    showSuccess('Connection restored!');
    retryOperation();
  } else {
    showError('Could not reconnect to Ollama service');
    offerManualRetry();
  }
}
```

### Connection Testing

For more detailed diagnostics, the service provides connection testing:

```typescript
public async testConnection(): Promise<{
  isConnected: boolean;
  error?: string;
  details?: any;
}>
```

#### Usage Example

```typescript
// Perform detailed connection test
async function diagnoseConnectionIssue() {
  const result = await healthService.testConnection();
  
  if (result.isConnected) {
    console.log('Connected to Ollama successfully');
    console.log('Available models:', result.details?.models);
  } else {
    console.error('Connection failed:', result.error);
    showTroubleshootingHelp(result.error);
  }
}
```

### User Guidance

For user assistance, the service provides connection instructions:

```typescript
public getConnectionInstructions(): string
```

#### Usage Example

```typescript
function showConnectionHelp() {
  const instructions = healthService.getConnectionInstructions();
  
  showModal({
    title: 'Connection Help',
    body: markdown(instructions),
    buttons: [
      { text: 'Open Ollama Website', action: () => window.open('https://ollama.ai') },
      { text: 'Close', action: 'close' }
    ]
  });
}
```

## Integration with UI Components

The health service should be integrated with UI components to provide realtime feedback:

1. **Status Indicators**: Show connection status in the UI
2. **Error Notifications**: Display user-friendly error messages
3. **Recovery Prompts**: Guide users through recovery steps when needed

### Example Integration

```typescript
function AIAssistantPanel() {
  const [connectionStatus, setConnectionStatus] = useState<'connected'|'disconnected'|'connecting'>('connecting');
  const [statusMessage, setStatusMessage] = useState('Checking connection...');
  
  useEffect(() => {
    const healthService = new OllamaHealthService();
    
    healthService.startMonitoring((status) => {
      if (status.status === 'healthy') {
        setConnectionStatus('connected');
        setStatusMessage('Connected to Ollama');
      } else {
        setConnectionStatus('disconnected');
        setStatusMessage(status.message);
      }
    });
    
    return () => healthService.stopMonitoring();
  }, []);

  return (
    <div className="jp-AIAssistant">
      <div className="jp-AIAssistant-header">
        <div className="jp-AIAssistant-connection-status">
          <ConnectionStatusIndicator status={connectionStatus} />
          <span>{statusMessage}</span>
        </div>
        {/* ... other UI elements ... */}
      </div>
      {/* ... panel content ... */}
    </div>
  );
}
```

## Best Practices

When implementing error handling using these features:

1. **Provide clear feedback**: Always let users know what's happening and why
2. **Offer solutions**: Give specific instructions on how to resolve issues
3. **Auto-recover when possible**: Don't require user intervention for temporary issues
4. **Use appropriate timeouts**: Set reasonable timeouts for different operations
5. **Log detailed diagnostics**: Store detailed error information for troubleshooting
6. **Gracefully degrade**: Disable features that require connectivity, but keep the UI functional 