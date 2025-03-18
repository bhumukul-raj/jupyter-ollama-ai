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
│   ├── __init__.py                     # Package initialization
│   ├── _version.py                     # Version information
│   ├── handlers.py                     # API handlers for Ollama communication
│   ├── config.py                       # Configuration management
│   └── ollama_client.py                # Ollama API client wrapper
│
├── src/                                # TypeScript/React frontend
│   ├── index.tsx                       # Extension entry point
│   ├── components/                     # React components
│   │   ├── ChatWidget.tsx              # Main chat interface component
│   │   ├── ChatMessage.tsx             # Individual message component
│   │   ├── ModelSelector.tsx           # Ollama model selector
│   │   ├── CellToolbarButton.tsx       # Cell toolbar button component
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
├── lib/                                # Compiled JavaScript (build output)
├── schema/                             # Extension schema
│   └── plugin.json                     # Extension configuration
│
├── tsconfig.json                       # TypeScript configuration
├── package.json                        # NPM package definition
├── pyproject.toml                      # Python project configuration
├── setup.py                            # Python setup script
└── README.md                           # Project documentation
```

## Component Details

### 1. Backend Architecture

#### Python Server Extension
- **`handlers.py`**: Defines JupyterLab server endpoints that proxy requests to Ollama
  - `/api/ollama/chat` - POST endpoint for chat completions
  - `/api/ollama/models` - GET endpoint for available models
  - `/api/ollama/cell-context` - POST endpoint to analyze cell code
  - `/api/ollama/embeddings` - POST endpoint for generating embeddings

#### Ollama Integration
- **`ollama_client.py`**: Wrapper around the Ollama API
  - Communicates with locally running Ollama service
  - Handles model selection, prompting, and response streaming
  - Implements context formatting for code cells
  - Supports both chat and generate APIs with fallback

### 2. Frontend Architecture

#### React Components
- **`ChatWidget.tsx`**: Main chat interface
  - Chat history display with markdown support
  - Message input with code highlighting
  - Model selection dropdown
  - Theme-aware styling
  - Responsive design for all screen sizes

- **`CellToolbarButton.tsx`**: Adds buttons to each cell for quick queries
  - Captures cell content
  - Formats appropriate prompt based on cell type
  - Sends to Ollama with proper context
  - Displays responses in a modal dialog

- **`ChatMessage.tsx`**: Individual message component
  - Supports markdown rendering
  - Code block syntax highlighting
  - Theme-aware styling
  - Timestamp display

#### Services
- **`ollama.ts`**: Frontend service that communicates with backend endpoints
  - Sends/receives chat messages
  - Handles streaming responses
  - Manages model selection
  - Provides error handling and logging

### 3. Styling

- **Base Styles** (`base.css`):
  - Core layout and component styles
  - JupyterLab theme integration
  - Responsive design utilities

- **Chat Widget Styles** (`ChatWidget.css`):
  - Chat interface specific styles
  - Message bubbles and layout
  - Code block formatting
  - Dark/light theme support

## System Architecture Diagram

The following diagram illustrates how the various components of the JupyterLab AI Assistant interact:

```
┌───────────────────────────────────────────────────────────────┐
│                      JupyterLab Interface                      │
└───────────────────────────┬───────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────┐
│                     Extension Frontend                         │
│                                                               │
│  ┌─────────────┐   ┌────────────────┐   ┌──────────────────┐  │
│  │ ChatWidget  │   │ Cell Toolbar   │   │  OllamaTest      │  │
│  │ Components  │   │ Components     │   │  Widget          │  │
│  └──────┬──────┘   └────────┬───────┘   └─────────┬────────┘  │
│         │                   │                     │           │
│         └─────────┬─────────┘─────────┬───────────┘           │
│                   │                   │                       │
│                   ▼                   ▼                       │
│            ┌─────────────────────────────────────┐           │
│            │       ollama.ts Service Layer       │           │
│            └────────────────────┬────────────────┘           │
│                                 │                             │
└─────────────────────────────────┼─────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Extension Backend                            │
│                                                                 │
│  ┌────────────────────┐      ┌───────────────────────────────┐  │
│  │ Server API Handlers│      │           Config              │  │
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

## Data Flow and Workflow

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

### File Interactions in Request Flow

For a typical cell-context request, these files are involved in the process:

1. **Frontend Initiates Request**:
   - `src/components/CellToolbarButton.tsx` - Captures cell content and user question
   - `src/services/ollama.ts` - `analyzeCellContent()` function sends request to backend

2. **Backend Processes Request**:
   - `jupyterlab_ai_assistant/handlers.py` - `OllamaCellContextHandler` processes request
   - `jupyterlab_ai_assistant/ollama_client.py` - Formats prompt and sends to Ollama API
   - `jupyterlab_ai_assistant/config.py` - Provides configuration for request timeout, model options

3. **Response Handling**:
   - `jupyterlab_ai_assistant/handlers.py` - Sends response back to frontend
   - `src/services/ollama.ts` - Processes response data
   - `src/components/CellToolbarButton.tsx` - Renders response in dialog with markdown formatting

### Error Handling Flow

The extension implements robust error handling across all layers:

```
┌───────────────┐     ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│ User Interface│     │ Frontend      │     │ Python Server │     │ Ollama API    │
│ Layer         │     │ Service Layer │     │ Extension     │     │ Connection    │
└───────┬───────┘     └───────┬───────┘     └───────┬───────┘     └───────┬───────┘
        │                     │                     │                     │
        ▼                     ▼                     ▼                     ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│ Display error │     │ Error handling│     │ Exception     │     │ Connection    │
│ messages and  │◄────│ and logging   │◄────│ handling with │◄────│ timeouts and  │
│ retry options │     │ in TypeScript │     │ Tornado       │     │ API errors    │
└───────────────┘     └───────────────┘     └───────────────┘     └───────────────┘
```

## Key Features

1. **Cell-Specific AI Assistance**
   - Quick access buttons in cell toolbar
   - Pre-formatted questions for common tasks
   - Context-aware responses
   - Code syntax highlighting

2. **Chat Interface**
   - Real-time message streaming
   - Markdown support
   - Code block syntax highlighting
   - Model selection
   - Theme-aware design

3. **Ollama Integration**
   - Support for multiple models
   - Automatic model detection
   - Fallback mechanisms for API compatibility
   - Error handling and recovery

4. **User Experience**
   - Responsive design for all screen sizes
   - Smooth animations and transitions
   - Clear error messages
   - Loading states and indicators

## Configuration

The extension can be configured through JupyterLab's settings:

```json
{
  "defaultModel": "llama2",
  "baseUrl": "http://localhost:11434",
  "enabled": true,
  "maxTokens": 4096,
  "defaultTemperature": "0.7",
  "requestTimeout": 60,
  "debugMode": true
}
```

## Development

### Prerequisites
- JupyterLab 3.0+
- Node.js 14+
- Python 3.7+
- Ollama installed and running locally

### Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/jupyterlab-ai-assistant.git
cd jupyterlab-ai-assistant

# Install dependencies
./install.sh
```

### Development Workflow
1. Start Ollama service: `ollama serve`
2. Pull required models: `ollama pull llama2`
3. Start JupyterLab: `jupyter lab`
4. Make changes and rebuild:
   ```bash
   jlpm build
   jupyter lab build
   ```

## License

This project is licensed under the MIT License - see the LICENSE file for details. 