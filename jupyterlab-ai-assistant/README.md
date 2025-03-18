# JupyterLab AI Assistant Extension

A comprehensive JupyterLab extension that integrates Ollama-powered AI assistance directly into notebooks with cell-specific context awareness and responsive design.

## Features

- **Chat with Ollama Models**: Interact with locally-running Ollama AI models directly within JupyterLab
- **Cell-Contextual AI Assistance**: Ask questions about specific notebook cells with a simple click
- **Smart Responses**: Get syntax-highlighted, markdown-formatted responses
- **Responsive Design**: Clean, modern interface that adapts to your JupyterLab theme

## Prerequisites

- JupyterLab 3.0 or later
- [Ollama](https://ollama.ai/) installed and running locally
- Python 3.7+

## Installation

You can install the extension via pip:

```bash
pip install jupyterlab-ai-assistant
```

Or from source:

```bash
# Clone the repository
git clone https://github.com/yourusername/jupyterlab-ai-assistant.git
cd jupyterlab-ai-assistant

# Install the package
pip install -e .

# Install the extension
jupyter labextension develop . --overwrite
```

### Ollama Setup

Make sure you have Ollama installed and running. You can download it from [ollama.ai](https://ollama.ai/).

You'll need to pull at least one model to use with the extension:

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

1. Hover over any code or markdown cell
2. Click on the "Ask" button that appears in the cell toolbar
3. Select from the predefined questions or enter a custom question
4. View the AI's response in the popup

## Configuration

You can configure the extension in JupyterLab's Settings menu:

1. Go to Settings > Advanced Settings Editor
2. Select "AI Assistant" from the dropdown
3. Modify the settings as needed

Available settings:

- `default_model`: The default Ollama model to use
- `ollama_base_url`: URL for the Ollama API (default: http://localhost:11434)
- `allowed_models`: List of models to allow, if you want to restrict models

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/jupyterlab-ai-assistant.git
cd jupyterlab-ai-assistant

# Install dependencies
pip install -e ".[dev]"
jlpm install

# Build and install the extension
jlpm build
jupyter labextension develop . --overwrite
```

### Develop Mode

```bash
# In one terminal, watch TypeScript source files
jlpm watch

# In another terminal, run JupyterLab in watch mode
jupyter lab --watch
```

## Troubleshooting

- **No models available**: Make sure Ollama is running (`ollama serve`) and you have pulled at least one model
- **Connection errors**: Check that the Ollama API is accessible at http://localhost:11434

## License

This project is licensed under the MIT License - see the LICENSE file for details. 