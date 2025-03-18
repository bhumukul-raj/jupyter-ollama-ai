# JupyterLab AI Assistant Extension

A comprehensive JupyterLab extension that integrates Ollama-powered AI assistance directly into notebooks with cell-specific context awareness and responsive design.

## Project Overview

This extension enhances JupyterLab with:

1. **Ollama AI Integration**: Chat with locally installed Ollama AI models
2. **Cell-Contextual AI Assistance**: Ask questions about specific notebook cells
3. **Responsive Design**: Bootstrap-powered responsive interface

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
│   ├── index.ts                        # Extension entry point
│   ├── components/                     # React components
│   │   ├── ChatWidget.tsx              # Main chat interface component
│   │   ├── ChatMessage.tsx             # Individual message component
│   │   ├── ModelSelector.tsx           # Ollama model selector
│   │   ├── CellToolbarButton.tsx       # Cell toolbar button component
│   │   └── ContextMenu.tsx             # Right-click context menu component
│   ├── services/                       # Service modules
│   │   ├── ollama.ts                   # Ollama API service
│   │   ├── messageStore.ts             # Chat history/state management
│   │   └── cellContext.ts              # Cell content extraction utility
│   ├── icons/                          # Custom SVG icons
│   │   ├── chatIcon.ts                 # Chat button icon
│   │   └── askIcon.ts                  # Ask about cell icon
│   ├── styles/                         # CSS/SCSS styles
│   │   ├── index.css                   # Main stylesheet
│   │   ├── bootstrap.scss              # Bootstrap customization
│   │   └── variables.css               # CSS variables
│   └── widget.tsx                      # Main widget implementation
│
├── style/                              # Style files
│   ├── index.css                       # Compiled CSS
│   └── index.js                        # Style loader
│
├── bootstrap/                          # Bootstrap integration
│   ├── scss/                           # SCSS source files
│   └── dist/                           # Compiled Bootstrap assets
│
├── lib/                                # Compiled JavaScript (build output)
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

#### Ollama Integration
- **`ollama_client.py`**: Wrapper around the Ollama API
  - Communicates with locally running Ollama service
  - Handles model selection, prompting, and response streaming
  - Implements context formatting for code cells

### 2. Frontend Architecture

#### Extension Entry Point
- **`index.ts`**: Main extension file that:
  - Registers commands for launching the chat widget
  - Adds buttons to the notebook toolbar
  - Integrates with the notebook cell toolbar
  - Sets up context menu items

#### React Components
- **`ChatWidget.tsx`**: Main chat interface
  - Chat history display
  - Message input
  - Model selection dropdown
  - Settings panel
  
- **`CellToolbarButton.tsx`**: Adds a button to each cell for quick queries
  - Captures cell content
  - Formats appropriate prompt based on cell type (code/markdown)
  - Sends to Ollama with proper context

#### Services
- **`ollama.ts`**: Frontend service that communicates with backend endpoints
  - Sends/receives chat messages
  - Handles streaming responses
  - Manages model selection

- **`messageStore.ts`**: Manages chat state
  - Stores conversation history
  - Handles message threading
  - Persists chats between sessions

### 3. Bootstrap Integration

- **Bootstrap Integration Strategy**:
  - Import Bootstrap SCSS source files
  - Customize variables for JupyterLab theme compatibility
  - Use Bootstrap grid system and components for responsive layout
  - Implement JupyterLab theme awareness (light/dark mode)

## Data Flow Diagram

```
┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│                   │     │                   │     │                   │
│  JupyterLab UI    │◄────┤  Extension UI     │◄────┤  Server Extension │
│  (Notebook Cells) │     │  (React Widgets)  │     │  (Python Backend) │
│                   │────►│                   │────►│                   │
└───────────────────┘     └───────────────────┘     └────────┬──────────┘
                                                             │
                                                             ▼
                                                    ┌────────────────────┐
                                                    │                    │
                                                    │  Ollama API        │
                                                    │  (Local AI Model)  │
                                                    │                    │
                                                    └────────────────────┘
```

## Ollama Integration Details

```
┌───────────────────────────────────────────────────────────────┐
│ JupyterLab Extension                                           │
└───────────────┬───────────────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────────────┐
│ Python Server Extension                                        │
│                                                                │
│  ┌────────────────┐     ┌────────────────┐    ┌──────────────┐│
│  │ Request Handler│────►│ Ollama Client  │───►│ Ollama API   ││
│  └────────────────┘     └────────────────┘    └──────────────┘│
│                                                                │
└───────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────┐
│ Ollama (Local)                                                 │
│  ┌────────────────┐     ┌────────────────┐                    │
│  │ API Server     │────►│ AI Model       │                    │
│  └────────────────┘     └────────────────┘                    │
└───────────────────────────────────────────────────────────────┘
```

## Implementation Strategy

### 1. Cell Context Extraction
- Add buttons to each cell toolbar that:
  - Extract current cell content
  - Detect code language or markdown context
  - Format appropriate prompt with context
  - Send to Ollama with specific instructions

### 2. Chat Widget Implementation
- Create a sidebar widget with:
  - Bootstrap-based responsive layout
  - Message history display
  - Input area with markdown support
  - Model selector dropdown
  - Chat history persistence

### 3. Bootstrap Integration
- Import Bootstrap via SCSS:
  - Use webpack to compile custom Bootstrap build
  - Override Bootstrap variables to match JupyterLab theme
  - Use Bootstrap components with JupyterLab compatibility classes
  - Implement responsive design for all viewport sizes

## Typical User Flows

### Flow 1: Ask about specific cell
1. User clicks on the "Ask" icon in a code cell
2. Extension extracts cell content
3. Popup appears with pre-formatted question options
4. User selects question (e.g., "Explain this code")
5. Extension sends code with prompt to Ollama
6. Response appears in a small popup or sidebar

### Flow 2: General chat interaction
1. User opens chat sidebar from launcher or menu
2. User selects an Ollama model
3. User sends a message with a question
4. Extension sends request to backend
5. Backend forwards to Ollama and streams response
6. Response appears in chat with syntax highlighting
7. Chat history is saved for future sessions

## Development Roadmap

1. **Stage 1: Basic Extension Structure**
   - Set up frontend and backend components
   - Implement basic Ollama connection

2. **Stage 2: Chat Interface**
   - Develop main chat widget
   - Implement Bootstrap styling
   - Add model selection

3. **Stage 3: Cell Integration**
   - Add cell toolbar buttons
   - Implement context extraction
   - Build contextual question UI

4. **Stage 4: Polish and UX**
   - Ensure responsive design
   - Add error handling
   - Optimize performance
   - Implement settings

## Key Technical Considerations

1. **Performance Optimization**
   - Efficient handling of large notebook cells
   - Response streaming for better UX
   - Lazy loading of Bootstrap components

2. **Security**
   - Secure communication with local Ollama API
   - Validation of all inputs/outputs
   - Proper error handling

3. **Compatibility**
   - JupyterLab theme compatibility with Bootstrap
   - Responsive design for various screen sizes
   - Cross-browser compatibility

## User Interface Mockup

```
┌─────────────────────────────────────────────────────────────────────────┐
│ JupyterLab                                                      [_][□][X]│
├─────────────┬───────────────────────────────────────┬───────────────────┤
│             │                                       │                   │
│   Launcher  │  ◆ My Notebook.ipynb                  │    Chat Assistant │
│   Files     │                                       │    ┌─────────────┐│
│   Running   │  ┌─────────────────────────────────┐  │    │ Model: llama2│
│   Commands  │  │ In [1]: # Data Analysis         │  │    └─────────────┘│
│   Help      │  │                                 │  │                   │
│             │  │ import pandas as pd        [Ask]│  │    ┌─────────────┐│
│             │  │ import numpy as np             │  │    │ User:        │
│             │  │ import matplotlib.pyplot as plt│  │    │ Can you      │
│             │  │                                │  │    │ explain how  │
│   AI        │  └─────────────────────────────────┘  │    │ to analyze  │
│   Assistant │                                       │    │ this data?  │
│             │  ┌─────────────────────────────────┐  │    └─────────────┘│
│             │  │ In [2]:                         │  │                   │
│             │  │                                 │  │    ┌─────────────┐│
│             │  │ df = pd.read_csv('data.csv')   │  │    │ Assistant:   │
│             │  │ df.head()                  [Ask]│  │    │ To analyze  │
│             │  │                                │  │    │ the data, you│
│             │  └─────────────────────────────────┘  │    │ should first│
│             │                                       │    │ examine the │
│             │       ┌─────────────────────┐         │    │ structure...│
│             │       │ Ask about this cell │         │    │             │
│             │       ├─────────────────────┤         │    └─────────────┘│
│             │       │ ▸ Explain this code │         │                   │
│             │       │ ▸ Optimize this code│         │    ┌─────────────┐│
│             │       │ ▸ Find bugs         │         │    │ Message:    │
│             │       │ ▸ Custom question...│         │    │ ____________│
│             │       └─────────────────────┘         │    │ Send ▶      │
│             │                                       │    └─────────────┘│
└─────────────┴───────────────────────────────────────┴───────────────────┘
```

## Getting Started

See the [main README.md](./README.md) for installation and development instructions.

## License

This project is licensed under [MIT License](LICENSE.md). 