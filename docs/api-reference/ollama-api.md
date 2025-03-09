# Ollama API Reference

This document provides information about the Ollama API used by the JupyterLab AI Assistant extension.

## Base URL

By default, the extension connects to Ollama at:

```
http://localhost:11434
```

## API Endpoints

### 1. Generate Text

**Endpoint**: `/api/generate`
**Method**: POST
**Usage**: Generate text from a model

**Request Body**:
```json
{
  "model": "mistral",
  "prompt": "Your prompt text here",
  "options": {
    "temperature": 0.7,
    "max_tokens": 2048
  },
  "stream": true
}
```

**Parameters**:
- `model` (string): The name of the model to use
- `prompt` (string): The prompt to generate text from
- `options` (object): Configuration options for generation
  - `temperature` (number): Controls randomness, between 0.0 and 1.0
  - `max_tokens` (number): Maximum number of tokens to generate
- `stream` (boolean): Whether to stream the response

**Response**:
For streaming responses, the API returns a stream of JSON objects:
```json
{"model":"mistral","created_at":"2023-11-06T18:19:39Z","response":"The","done":false}
{"model":"mistral","created_at":"2023-11-06T18:19:39Z","response":" response","done":false}
{"model":"mistral","created_at":"2023-11-06T18:19:40Z","response":" continues","done":false}
{"model":"mistral","created_at":"2023-11-06T18:19:40Z","response":".","done":true}
```

For non-streaming responses, the API returns a single JSON object:
```json
{
  "model": "mistral",
  "created_at": "2023-11-06T18:19:39Z",
  "response": "The response continues.",
  "done": true
}
```

### 2. List Models

**Endpoint**: `/api/tags`
**Method**: GET
**Usage**: List available models

**Response**:
```json
{
  "models": [
    {
      "name": "mistral",
      "modified_at": "2023-11-06T18:00:00Z",
      "size": 4800000000
    },
    {
      "name": "llama2",
      "modified_at": "2023-11-06T17:00:00Z", 
      "size": 3800000000
    }
  ]
}
```

### 3. Cancel Request

**Endpoint**: `/api/cancel`
**Method**: POST
**Usage**: Cancel an ongoing generation request

**Request Body**:
```json
{
  "request_id": "req_12345"
}
```

**Parameters**:
- `request_id` (string): The ID of the request to cancel

## Usage in the Extension

The extension uses the Ollama API through the `OllamaService` class, which provides methods for:

- `getAvailableModels()`: Lists available models
- `generateResponse()`: Generates a response from a prompt
- `analyzeCode()`: Analyzes code using a model
- `suggestCodeImprovements()`: Suggests improvements for code
- `cancelRequest()`: Cancels an ongoing request

## Example Usage

```typescript
// Create an instance of OllamaService
const ollamaService = new OllamaService('http://localhost:11434', 'mistral');

// Get available models
const models = await ollamaService.getAvailableModels();

// Generate a response
const response = await ollamaService.generateResponse(
  'What is the capital of France?',
  'mistral',
  undefined,
  (partialResponse, done) => {
    console.log('Partial response:', partialResponse);
    console.log('Done:', done);
  },
  'req_12345'
);

// Cancel a request
ollamaService.cancelRequest('req_12345');
```

## Error Handling

The Ollama API may return errors with appropriate HTTP status codes. The extension handles these errors and provides feedback to the user.

Common error scenarios:
- Model not found (404)
- Invalid request format (400)
- Server error (500)

## References

- [Ollama GitHub Repository](https://github.com/ollama/ollama)
- [Ollama API Documentation](https://github.com/ollama/ollama/blob/main/docs/api.md) 