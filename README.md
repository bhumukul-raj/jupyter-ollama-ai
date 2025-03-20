# JupyterLab AI Assistant Extension

A comprehensive JupyterLab extension that integrates Ollama-powered AI assistance directly into notebooks with cell-specific context awareness and responsive design.

## Project Overview

This extension enhances JupyterLab with:

1. **Ollama AI Integration**: Chat with locally installed Ollama AI models
2. **Cell-Contextual AI Assistance**: Ask questions about specific notebook cells
3. **Responsive Design**: Bootstrap-powered responsive interface
4. **Theme-Aware UI**: Seamless integration with JupyterLab's light/dark themes

## Features

- **Chat with Ollama Models**: Interact with locally-running Ollama AI models directly within JupyterLab
- **Cell-Contextual AI Assistance**: Ask questions about specific notebook cells with a simple click
- **Smart Responses**: Get syntax-highlighted, markdown-formatted responses
- **Responsive Design**: Clean, modern interface that adapts to your JupyterLab theme
- **Theme-Aware UI**: Seamless integration with JupyterLab's light/dark themes
- **Multi-Model Support**: Use any Ollama model installed on your system
- **Code Analysis**: Explain, optimize, or debug code directly from your notebooks
- **Real-time Streaming**: View AI responses as they are generated
- **Markdown Support**: Rich formatting in responses with code highlighting

## How It Works

The extension connects to your local Ollama service and provides two main interaction modes:

1. **Chat Interface**: A standalone chat widget where you can ask general questions
2. **Cell Context Actions**: Toolbar buttons that appear on notebook cells for code-specific questions

### Chat Widget

![Chat Interface Screenshot](https://raw.githubusercontent.com/bhumukul-raj/ollama-ai-assistant-project/main/screenshots/chat-widget.png)

The chat interface features:
- Full markdown support including code blocks
- Syntax highlighting for code
- Model selection dropdown
- Responsive design for all screen sizes
- Real-time streaming of responses

### Cell Context Analysis

![Cell Context Screenshot](https://raw.githubusercontent.com/bhumukul-raj/ollama-ai-assistant-project/main/screenshots/cell-context.png)

Cell toolbar buttons provide quick access to:
- Explain code in the current cell
- Optimize performance
- Debug issues
- Analyze data processing logic
- Custom questions about the cell content

## Prerequisites

- JupyterLab 4.0 or later
- [Ollama](https://ollama.ai/) installed and running locally
- Python 3.8+
- Node.js 14+ (for development)

## Installation

You can install the extension via pip:

```bash
pip install jupyterlab-ai-assistant
```

Or from source:

```bash
# Clone the repository
git clone https://github.com/bhumukul-raj/ollama-ai-assistant-project.git
cd ollama-ai-assistant-project/jupyterlab-ai-assistant

# Install using the provided script (recommended)
./build-dev.sh

# Or install manually
pip install -e .
jupyter labextension develop . --overwrite
```

### Ollama Setup

Make sure you have Ollama installed and running. You can download it from [ollama.ai](https://ollama.ai/).

1. Start the Ollama service:
   ```bash
   ollama serve
   ```

2. Pull at least one model to use with the extension:
   ```bash
   # Pull a model (example)
   ollama pull llama2
   ```

## Usage

### Chat Interface

1. Launch JupyterLab
2. Click on the "AI Assistant" icon in the sidebar or open it from the menu (AI Assistant > Open AI Assistant)
3. Select a model from the dropdown
4. Type your question and press Enter

### Cell-Specific Questions

1. Open a notebook in JupyterLab
2. Hover over any code or markdown cell
3. Click on one of the AI assistant buttons in the cell toolbar:
   - 🔍 Explain - Understand what the code does
   - 🔧 Optimize - Get suggestions for performance improvement
   - 🐞 Debug - Find and fix issues in your code
   - 💬 Chat - Ask a custom question about this cell
4. View the AI's response in the popup dialog

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

## Configuration

You can configure the extension in JupyterLab's Settings menu:

1. Go to Settings > Advanced Settings Editor
2. Select "AI Assistant" from the dropdown
3. Modify the settings as needed

Available settings:

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

## System Requirements

For the best experience, we recommend:
- A system with at least 8GB RAM
- Sufficient disk space for Ollama models (models range from 1GB to 10GB+ each)
- A modern web browser (Chrome, Firefox, Safari, Edge)

## Troubleshooting

### Common Issues

- **No models available**: 
  - Ensure Ollama is running (`ollama serve`)
  - Verify you've pulled at least one model (`ollama list`)
  - Check connection to the Ollama API: `curl http://localhost:11434/api/tags`

- **Connection errors**: 
  - Verify the Ollama API is accessible at http://localhost:11434
  - Check your network configuration if running on a remote system
  - Ensure there are no firewall rules blocking the connection

- **Extension not showing up**:
  - Run `jupyter labextension list` to verify the extension is installed
  - Try restarting the JupyterLab server: `jupyter lab --no-browser`

### Testing the Connection

The extension includes a test tool to verify connectivity:
1. From the JupyterLab menu, select: AI Assistant > Test Ollama Connection
2. A panel will open showing all available models if the connection is successful

## Development

For development setup:

```bash
# Clone the repository
git clone https://github.com/bhumukul-raj/ollama-ai-assistant-project.git
cd ollama-ai-assistant-project/jupyterlab-ai-assistant

# Run development setup
./build-dev.sh
```

Or manually:

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