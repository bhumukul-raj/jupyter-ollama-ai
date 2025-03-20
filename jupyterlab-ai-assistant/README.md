# JupyterLab AI Assistant Extension

[![PyPI version](https://img.shields.io/pypi/v/jupyterlab-ai-assistant.svg)](https://pypi.org/project/jupyterlab-ai-assistant/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![JupyterLab](https://img.shields.io/badge/JupyterLab-3.6.3-orange.svg)](https://jupyterlab.readthedocs.io/en/stable/)
[![Python](https://img.shields.io/badge/Python-3.7+-blue.svg)](https://www.python.org/downloads/)
[![TestPyPI](https://img.shields.io/badge/TestPyPI-available-brightgreen.svg)](https://test.pypi.org/project/jupyterlab-ai-assistant/)

A comprehensive JupyterLab extension that integrates Ollama-powered AI assistance directly into notebooks with cell-specific context awareness and responsive design.

---

## ✨ Features

- **Chat with Ollama Models**: Interact with locally-running Ollama AI models directly within JupyterLab
- **Cell-Contextual AI Assistance**: Ask questions about specific notebook cells with a simple click
- **Smart Responses**: Get syntax-highlighted, markdown-formatted responses
- **Responsive Design**: Clean, modern interface that adapts to your JupyterLab theme
- **Theme-Aware UI**: Seamless integration with JupyterLab's light/dark themes
- **Multi-Model Support**: Use any Ollama model installed on your system
- **Code Analysis**: Explain, optimize, or debug code directly from your notebooks

## 🔍 How It Works

The extension connects to your local Ollama service and provides two main interaction modes:

1. **Chat Interface**: A standalone chat widget where you can ask general questions
2. **Cell Context Actions**: Toolbar buttons that appear on notebook cells for code-specific questions

### Chat Widget

The chat interface features:
- Full markdown support including code blocks
- Syntax highlighting for code
- Model selection dropdown
- Responsive design for all screen sizes

### Cell Context Analysis

Cell toolbar buttons provide quick access to:
- 🔍 Explain code in the current cell
- 🔧 Optimize performance
- 🐞 Debug issues
- 📊 Analyze data processing logic
- 💬 Ask custom questions about the cell content

## 📋 Prerequisites

- JupyterLab 3.6.3 (recommended)
- [Ollama](https://ollama.ai/) installed and running locally
- Python 3.7+

### Detailed Dependencies

This extension has the following specific dependencies:

```
jupyterlab == 3.6.3
jupyter_server >= 2.0.0, < 3.0.0
jupyter-client >= 7.4.4, < 8.0.0
jupyter_server_terminals >= 0.5.0
aiohttp
requests >= 2.25.0
```

For development, additional dependencies are required:
```
hatchling
hatch-nodejs-version
hatch-jupyter-builder
jupyter_packaging
build
pip-tools
```

## 🚀 Quick Start

### Installation

Install from PyPI (recommended):

```bash
pip install jupyterlab-ai-assistant
```

Then restart JupyterLab or run:

```bash
jupyter lab build
```

### Ollama Setup

1. Install Ollama from [ollama.ai](https://ollama.ai/)
2. Start the Ollama service:
   ```bash
   ollama serve
   ```
3. Pull at least one model to use with the extension:
   ```bash
   ollama pull llama2
   ```

### Using the Extension

1. Launch JupyterLab
2. Click on the "AI Assistant" icon in the left sidebar
3. Select a model from the dropdown
4. Start asking questions!

## 📖 Usage Guide

### Chat Interface

1. Launch JupyterLab
2. Click on the "AI Assistant" icon in the sidebar or open it from the menu (AI Assistant > Open AI Assistant)
3. Select a model from the dropdown
4. Type your question and press Enter

### Cell-Specific Questions

1. Open a notebook in JupyterLab
2. Hover over any code or markdown cell
3. Click on one of the AI assistant buttons in the cell toolbar:
   - 🔍 **Explain** - Understand what the code does
   - 🔧 **Optimize** - Get suggestions for performance improvement
   - 🐞 **Debug** - Find and fix issues in your code
   - 💬 **Chat** - Ask a custom question about this cell
4. View the AI's response in the popup dialog

### Common Use Cases

- **Code Explanation**: "What does this pandas transformation do?"
- **Debugging Help**: "Why am I getting this ValueError in my function?"
- **Performance Optimization**: "How can I make this loop faster?"
- **Documentation**: "Generate docstrings for this class"
- **Learning**: "Explain this algorithm step by step"

## ⚙️ Configuration

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
  "defaultTemperature": 0.7,
  "requestTimeout": 60,
  "debugMode": false
}
```

## 💻 System Requirements

For the best experience, we recommend:
- A system with at least 8GB RAM
- Sufficient disk space for Ollama models (models range from 1GB to 10GB+ each)
- A modern web browser (Chrome, Firefox, Safari, Edge)

## 🔧 Troubleshooting

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

## 🛠️ Development

For developers who want to contribute to the project:

```bash
# Clone the repository
git clone https://github.com/bhumukul-raj/ollama-ai-assistant-project.git
cd ollama-ai-assistant-project/jupyterlab-ai-assistant

# Install dependencies
pip install -e .
jupyter labextension develop . --overwrite
```

### Publishing to PyPI

For maintainers who need to publish updates to PyPI:

1. Update version in `package.json` and `pyproject.toml`

2. Build the distribution packages:
   ```bash
   python -m build
   ```

3. Test your build with TestPyPI first:
   ```bash
   # Using the provided script
   ../pypi/upload_to_testpypi.sh ./dist
   
   # Or manually with twine
   python -m twine upload --repository-url https://test.pypi.org/legacy/ dist/*
   ```

4. Install from TestPyPI to verify:
   ```bash
   pip install --index-url https://test.pypi.org/simple/ --extra-index-url https://pypi.org/simple jupyterlab-ai-assistant
   ```

5. Upload to the real PyPI:
   ```bash
   python -m twine upload dist/*
   ```

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👤 Author

- **Bhumukul Raj** - [GitHub](https://github.com/bhumukul-raj) - [Email](mailto:bhumukulraj@gmail.com)

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check [issues page](https://github.com/bhumukul-raj/ollama-ai-assistant-project/issues). 