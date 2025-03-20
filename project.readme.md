# JupyterLab AI Assistant Extension

A comprehensive JupyterLab extension that integrates Ollama-powered AI assistance directly into notebooks with cell-specific context awareness and responsive design.

## Project Overview

This extension enhances JupyterLab with:

1. **Ollama AI Integration**: Chat with locally installed Ollama AI models
2. **Cell-Contextual AI Assistance**: Ask questions about specific notebook cells
3. **Responsive Design**: Bootstrap-powered responsive interface
4. **Theme-Aware UI**: Seamless integration with JupyterLab's light/dark themes

## Architecture Overview

```
jupyterlab-ai-assistant/
├── jupyterlab_ai_assistant/            # Python package (backend)
│   ├── __init__.py                     # Package initialization & server extension paths
│   ├── _version.py                     # Version information (auto-generated)
│   ├── handlers.py                     # API handlers for Ollama communication
│   ├── config.py                       # Configuration management with Traitlets
│   └── ollama_client.py                # Ollama API client wrapper
│
├── src/                                # TypeScript/React frontend
│   ├── index.tsx                       # Extension entry point
│   ├── plugin.ts                       # Main plugin definition & command registration
│   ├── components/                     # React components
│   │   ├── ChatWidget.tsx              # Main chat interface component
│   │   ├── ChatMessage.tsx             # Individual message component
│   │   ├── ModelSelector.tsx           # Ollama model selector
│   │   ├── CellToolbarButton.tsx       # Cell toolbar button component
│   │   ├── celltoolgroup.tsx           # Cell toolbar group component 
│   │   └── OllamaTestWidget.tsx        # Ollama connection test widget
│   ├── services/                       # Service modules
│   │   └── ollama.ts                   # Ollama API service
│   └── types.d.ts                      # TypeScript type definitions
│
├── style/                              # Style files
│   ├── base.css                        # Base styles
│   ├── ChatWidget.css                  # Chat widget styles
│   ├── index.css                       # Main stylesheet
│   └── index.js                        # Style loader
│
├── build-dev.sh                        # Development environment setup script
├── build-dist.sh                       # Distribution build script
├── lib/                                # Compiled JavaScript (build output)
├── schema/                             # Extension schema
│   └── plugin.json                     # Extension configuration
│
├── tsconfig.json                       # TypeScript configuration
├── package.json                        # NPM package definition
├── pyproject.toml                      # Python project configuration (defines dependencies & build)
├── setup.py                            # Python setup script (handles installation and asset management)
└── README.md                           # Project documentation
```

## Component Details

### 1. Backend Architecture

#### Python Server Extension
- **`handlers.py`**: Defines JupyterLab server endpoints that proxy requests to Ollama
  - **`OllamaModelsHandler`**: GET endpoint for available models
  - **`OllamaChatHandler`**: POST endpoint for chat completions with streaming support
  - **`OllamaCellContextHandler`**: POST endpoint to analyze cell code
  - **`OllamaEmbeddingsHandler`**: POST endpoint for generating embeddings
  - **`OllamaTestHandler`**: GET/POST endpoints for testing Ollama connectivity

#### Configuration Management
- **`config.py`**: Uses Jupyter's Traitlets for configuration
  - **`OllamaConfig`**: Configuration class with the following options:
    - `base_url`: Ollama API URL (default: http://localhost:11434)
    - `enabled`: Toggle Ollama integration (default: True)
    - `default_model`: Default model (default: llama2)
    - `allowed_models`: List of allowed models (optional, all if not specified)
    - `max_tokens`: Maximum token generation limit (default: 4096)
    - `default_temperature`: Generation temperature (default: 0.7)
    - `request_timeout`: API timeout in seconds (default: 60)
    - `model_options`: Model-specific option overrides
    - `debug_mode`: Toggle debug logging (default: False)

#### Ollama Integration
- **`ollama_client.py`**: Wrapper around the Ollama API
  - **`OllamaClient`**: Client class with methods:
    - `list_models()`: Gets available models from Ollama
    - `chat_completion()`: Handles chat API with streaming support
    - `generate_embeddings()`: Gets vector embeddings
    - `_check_chat_api_support()`: Checks for modern Ollama API compatibility
    - `_format_generate_payload()`: Formats messages for API compatibility

### 2. Frontend Architecture

#### React Components
- **`ChatWidget.tsx`**: Main chat interface
  - Manages chat history and message display
  - Handles sending messages to Ollama
  - Streams AI responses with real-time updates
  - Provides model selection dropdown
  - Supports theme-aware styling

- **`CellToolbarButton.tsx`**: Adds AI assistance to cell toolbar
  - Captures cell content for analysis
  - Provides pre-formatted question templates
  - Shows dialog with query and AI response
  - Renders markdown and code in responses
  - Displays loading indicators and error messages

- **`ChatMessage.tsx`**: Individual message component
  - Renders user and assistant messages
  - Provides markdown formatting with syntax highlighting
  - Adapts to light/dark themes
  - Shows timestamps

- **`ModelSelector.tsx`**: Model selection dropdown
  - Lists available Ollama models
  - Handles model switching
  - Shows model selection UI

- **`OllamaTestWidget.tsx`**: Connection testing interface
  - Tests connectivity to Ollama server
  - Lists available models
  - Provides diagnostics for troubleshooting

#### Services
- **`ollama.ts`**: Frontend service
  - `requestAPI()`: Generic API request handler
  - `getAvailableModels()`: Fetches model list
  - `sendChatMessage()`: Sends messages with streaming
  - `analyzeCellContent()`: Sends cell content for analysis
  - Provides error handling and logging

### 3. Plugin Configuration
- **`plugin.ts`**: Main extension plugin
  - Registers commands for AI actions
  - Adds UI components to JupyterLab
  - Manages extension lifecycle
  - Creates toolbar buttons and palette commands
  - Handles integration with notebook cells

### 4. Styling

- **`ChatWidget.css`**: Chat interface styles
  - Message bubbles and layout
  - Input area styling
  - Response formatting
  - Responsive design adaptations
  - Dark/light theme variations

- **`base.css`**: Core component styles
  - Core layout styles
  - JupyterLab integration styles

- **`index.css`**: Extension-wide styles
  - Button styling
  - Dialog formatting
  - Cell toolbar integration

## System Architecture Diagram

The following diagram illustrates how the components of the JupyterLab AI Assistant interact:

```
┌─────────────────────────────────────────────────────────────────┐
│                      JupyterLab Interface                        │
└───────────────────────────┬───────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Extension Frontend                           │
│                                                                 │
│  ┌─────────────┐   ┌────────────────┐   ┌──────────────────┐    │
│  │ ChatWidget  │   │ Cell Toolbar   │   │  OllamaTest      │    │
│  │ Components  │   │ Components     │   │  Widget          │    │
│  └──────┬──────┘   └────────┬───────┘   └─────────┬────────┘    │
│         │                   │                     │             │
│         └─────────┬─────────┘─────────┬───────────┘             │
│                   │                   │                         │
│                   ▼                   ▼                         │
│            ┌─────────────────────────────────────┐             │
│            │       ollama.ts Service Layer       │             │
│            └────────────────────┬────────────────┘             │
│                                 │                               │
└─────────────────────────────────┼─────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Extension Backend                            │
│                                                                 │
│  ┌────────────────────┐      ┌───────────────────────────────┐  │
│  │ Server API Handlers│      │       OllamaConfig            │  │
│  │  - OllamaModels    │      │     - Base URL                │  │
│  │  - OllamaChat      │◄────►│     - Default Model           │  │
│  │  - OllamaCellContext│     │     - Allowed Models          │  │
│  │  - OllamaEmbeddings │     │     - Request Options         │  │
│  └──────────┬─────────┘      └───────────────────────────────┘  │
│             │                                                   │
│             ▼                                                   │
│     ┌───────────────────┐                                       │
│     │   OllamaClient    │                                       │
│     │   - Chat API      │                                       │
│     │   - Generate API  │                                       │
│     │   - Embeddings    │                                       │
│     └────────┬──────────┘                                       │
│              │                                                  │
└──────────────┼──────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Ollama Local Service                        │
│                                                                  │
│  ┌───────────────┐     ┌──────────────────┐     ┌──────────────┐ │
│  │ Ollama API    │     │  Model Engine    │     │ Models       │ │
│  │ - /api/chat   │────►│  - Inference     │────►│ - llama2     │ │
│  │ - /api/generate│    │  - Tokenization  │     │ - codellama  │ │
│  │ - /api/tags   │     │  - Embedding     │     │ - mistral    │ │
│  │ - /api/embeddings│  │                  │     │ - etc.       │ │
│  └───────────────┘     └──────────────────┘     └──────────────┘ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### Chat Workflow

```
┌───────────────┐     ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│ User submits  │     │  ChatWidget   │     │ ollama.ts     │     │ Python Server │
│ question via  │────►│  processes    │────►│ service sends │────►│ handlers      │
│ chat interface│     │  request      │     │ API request   │     │ receive req   │
└───────────────┘     └───────────────┘     └───────────────┘     └───────┬───────┘
                                                                          │
┌───────────────┐     ┌───────────────┐     ┌───────────────┐     ┌───────▼───────┐
│ Chat interface│     │ ReactMarkdown │     │ Frontend      │     │ OllamaClient  │
│ displays      │◄────│ renders       │◄────│ receives      │◄────│ calls Ollama  │
│ response      │     │ formatted text│     │ response      │     │ API & streams │
└───────────────┘     └───────────────┘     └───────────────┘     └───────────────┘
```

### Cell Context Workflow

```
┌───────────────┐     ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│ User clicks   │     │ Cell toolbar  │     │ CellContext   │     │ ollama.ts     │
│ cell toolbar  │────►│ button shows  │────►│ menu with     │────►│ service preps │
│ button        │     │ options       │     │ question list │     │ cell request  │
└───────────────┘     └───────────────┘     └───────────────┘     └───────┬───────┘
                                                                          │
┌───────────────┐     ┌───────────────┐     ┌───────────────┐     ┌───────▼───────┐
│ Response      │     │ React renders │     │ Frontend      │     │ Server handles│
│ displayed in  │◄────│ markdown in   │◄────│ receives      │◄────│ cell context  │
│ modal dialog  │     │ dialog        │     │ response      │     │ API request   │
└───────────────┘     └───────────────┘     └───────────────┘     └───────────────┘
```

### Request-Response Sequence

```
┌─────────┐          ┌─────────┐          ┌─────────────┐          ┌──────────┐
│ Browser │          │ Jupyter │          │ Python      │          │ Ollama   │
│ Client  │          │ Server  │          │ Extension   │          │ API      │
└────┬────┘          └────┬────┘          └──────┬──────┘          └────┬─────┘
     │                    │                      │                      │
     │  HTTP Request      │                      │                      │
     │ ───────────────────>                      │                      │
     │                    │                      │                      │
     │                    │  Forward Request     │                      │
     │                    │ ───────────────────────>                    │
     │                    │                      │                      │
     │                    │                      │    Ollama Request    │
     │                    │                      │ ──────────────────────>
     │                    │                      │                      │
     │                    │                      │    Stream Response   │
     │                    │                      │ <──────────────────────
     │                    │                      │                      │
     │                    │  Stream Response     │                      │
     │                    │ <───────────────────────                    │
     │                    │                      │                      │
     │  Stream Response   │                      │                      │
     │ <───────────────────                      │                      │
     │                    │                      │                      │
```

## Key Features

1. **Cell-Specific AI Assistance**
   - Quick access buttons in cell toolbar
   - Pre-formatted questions for common tasks:
     - Explain code
     - Fix bugs
     - Optimize code
     - Generate documentation
     - Custom queries
   - Context-aware responses based on cell content and type
   - Real-time streaming responses

2. **Chat Interface**
   - Real-time message streaming
   - Full markdown support with syntax highlighting
   - Code block formatting
   - Model selection from available Ollama models
   - Theme-aware design (light/dark)
   - Responsive layout for all screen sizes

3. **Ollama Integration**
   - Automatic model detection and listing
   - Support for all Ollama models
   - API compatibility checking and fallbacks
   - Embeddings support
   - Error handling and connectivity testing

4. **User Experience**
   - Bootstrap-powered responsive design
   - Smooth animations and transitions
   - Clear loading states and indicators
   - Comprehensive error handling
   - JupyterLab theme integration

## Configuration Options

The extension can be configured through JupyterLab's advanced settings:

```json
{
  "defaultModel": "llama2",
  "baseUrl": "http://localhost:11434",
  "enabled": true,
  "maxTokens": 4096,
  "defaultTemperature": "0.7",
  "requestTimeout": 60,
  "debugMode": false,
  "allowedModels": null,
  "modelOptions": {}
}
```

## Development Setup

### Prerequisites
- JupyterLab 4.0+
- Node.js 14+
- Python 3.8+
- Ollama installed and running locally

### Installation

Use the provided build script for automatic setup:

```bash
# Clone the repository
git clone https://github.com/bhumukul-raj/ollama-ai-assistant-project.git
cd ollama-ai-assistant-project/jupyterlab-ai-assistant

# Run development setup
./build-dev.sh
```

Or install manually:

```bash
# Clone the repository
git clone https://github.com/bhumukul-raj/ollama-ai-assistant-project.git
cd ollama-ai-assistant-project/jupyterlab-ai-assistant

# Install dependencies
pip install -e .
jupyter labextension develop . --overwrite

# Watch for changes during development
npm run watch
```

In a separate terminal, run JupyterLab in watch mode:
```bash
jupyter lab --watch
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Author

- **Bhumukul Raj** - [GitHub](https://github.com/bhumukul-raj) - [Email](mailto:bhumukulraj@gmail.com)

## Contributing

Contributions, issues, and feature requests are welcome! Feel free to check [issues page](https://github.com/bhumukul-raj/ollama-ai-assistant-project/issues).

## Screenshots

![JupyterLab AI Assistant Chat](https://raw.githubusercontent.com/bhumukul-raj/ollama-ai-assistant-project/main/screenshots/chat-widget.png)

![Cell Context Menu](https://raw.githubusercontent.com/bhumukul-raj/ollama-ai-assistant-project/main/screenshots/cell-context.png) 