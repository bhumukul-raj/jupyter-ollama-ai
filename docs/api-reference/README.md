# API Reference

This section provides technical reference information for the APIs used in the Ollama JupyterLab AI Assistant.

## Contents

- [Ollama API](ollama-api.md): Details about the Ollama API endpoints and usage
- [JupyterLab Extensions API](jupyterlab-extensions-api.md): Information about JupyterLab extension points
- [Context API](context-api.md): Documentation for the React Context API
- [Service API](service-api.md): Details about the service layer API

## Overview

The Ollama JupyterLab AI Assistant interacts with several APIs:

1. **Ollama API**: For communication with the Ollama language models
2. **JupyterLab Extension API**: For integration with JupyterLab
3. **JupyterLab Notebook API**: For accessing notebook content
4. **Browser APIs**: For storage, UI rendering, and other browser features

## Key API Interactions

### Ollama API

The extension communicates with Ollama using its HTTP API:

- `/api/generate`: For generating text from models
- `/api/models`: For listing available models
- `/api/cancel`: For cancelling a running generation

The `OllamaService` class handles all communication with the Ollama API.

### JupyterLab Extension API

The extension integrates with JupyterLab using its extension API:

- `JupyterFrontEndPlugin`: Extension entry point
- `INotebookTracker`: For accessing notebooks
- `Widget`: For creating UI elements

### Internal APIs

The extension also defines several internal APIs:

- **Context API**: React context for state management
- **Service API**: Classes for external communication
- **Hook API**: Custom React hooks

## Using the API Reference

Each API reference document provides:

- Method signatures and parameters
- Return types and examples
- Usage notes and considerations

For implementation details, refer to the source code and the [Developer Guide](../developer-guide/README.md). 