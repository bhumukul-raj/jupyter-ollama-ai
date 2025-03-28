# JupyterLab AI Assistant

[![PyPI version](https://img.shields.io/pypi/v/jupyterlab-ai-assistant.svg)](https://pypi.org/project/jupyterlab-ai-assistant/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![JupyterLab](https://img.shields.io/badge/JupyterLab-4.x-orange.svg)](https://jupyterlab.readthedocs.io/en/stable/)
[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/downloads/)

A comprehensive JupyterLab extension that integrates Ollama-powered AI assistance directly into notebooks with cell-specific context awareness and responsive design. Now with enhanced data science capabilities!

---

## ✨ Features

- **Chat with Ollama Models**: Interact with locally-running Ollama AI models directly within JupyterLab
- **Cell-Contextual AI Assistance**: Ask questions about specific notebook cells with a simple click
- **Smart Responses**: Get syntax-highlighted, markdown-formatted responses
- **Responsive Design**: Clean, modern interface that adapts to your JupyterLab theme
- **Theme-Aware UI**: Seamless integration with JupyterLab's light/dark themes
- **Multi-Model Support**: Use any Ollama model installed on your system
- **Code Analysis**: Explain, optimize, or debug code directly from your notebooks
- **Data Science Optimized**: Enhanced performance and analysis for pandas DataFrames, visualizations, and ML models
- **Smart Timeouts**: Intelligent timeout management for data science workloads
- **Beautiful Visualization Support**: Better rendering of tables, charts and data visualizations

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
- 📈 Analyze DataFrames (data science)
- 🎨 Suggest visualizations (data science)
- 🤖 Explain ML models (data science)

## 📋 Prerequisites

- JupyterLab 4.x (compatible with 4.0.0 and above)
- [Ollama](https://ollama.ai/) installed and running locally
- Python 3.8+

### Detailed Dependencies

This extension has the following specific dependencies:

```
jupyterlab >= 4.0.0, < 5.0.0
jupyter_server >= 2.0.0
jupyter-client >= 8.0.0
aiohttp
requests >= 2.25.0
```

### Frontend Dependencies

```
react >= 18.2.0
react-dom >= 18.2.0
react-markdown >= 8.0.0
bootstrap >= 5.3.3
```

## 🚀 Installation

### Method 1: Install from Source

Use the provided installation script which handles all dependencies and setup:

```bash
# Clone the repository
git clone https://github.com/bhumukul-raj/ollama-ai-assistant-project.git
cd ollama-ai-assistant-project/jupyterlab-ai-assistant

# Run the installation script (creates a virtual environment)
bash install-fixed.sh
```

### Method 2: Manual Installation

```bash
# Create a virtual environment (recommended)
python -m venv venv
source venv/bin/activate

# Install JupyterLab 4.x and dependencies
pip install "jupyterlab>=4.0.0,<5.0.0" "jupyter_server>=2.0.0,<3.0.0" "jupyter-client>=8.0.0"
pip install aiohttp "requests>=2.25.0"

# Install the extension in development mode
pip install -e .

# Build and link the extension
jupyter labextension develop . --overwrite
jupyter lab build
```

### Verify Installation

To verify the extension is properly installed:

```bash
jupyter labextension list
```

You should see `jupyterlab-ai-assistant` listed in the output.

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

### Running in Container Environments

When running JupyterLab in a container and accessing Ollama on the host machine, you need to configure the connection properly:

#### Container-to-Host Connection

In containerized environments, `localhost` refers to the container itself, not the host. To connect to Ollama running on your host machine:

1. **Configure the Base URL** using one of these approaches:

   - **For Docker on macOS/Windows**:
     ```bash
     export OLLAMA_BASE_URL=http://host.docker.internal:11434
     ```

   - **For Docker on Linux**:
     ```bash
     export OLLAMA_BASE_URL=http://172.17.0.1:11434
     ```

   - **For Podman**:
     ```bash
     export OLLAMA_BASE_URL=http://host.containers.internal:11434
     ```

   - **Using your host's actual IP address**:
     ```bash
     export OLLAMA_BASE_URL=http://<host-ip>:11434
     ```

2. **Container Network Options**:
   
   - Use the host network (simplest solution):
     ```bash
     docker run --network=host ...
     ```
     
   - For Docker on Linux, you may need to add:
     ```bash
     docker run --add-host=host.docker.internal:host-gateway ...
     ```

#### Testing Container-to-Host Connectivity

Use the included test script to automatically check and identify working host connections:

```bash
python container-test.py
```

This script will:
- Test multiple common host addresses
- Report which connections work
- Provide configuration guidance based on results

#### Troubleshooting

If you can't connect:
1. Ensure Ollama is running on the host
2. Check host firewall settings
3. Try running with `--network=host`
4. Set `OLLAMA_BASE_URL` to your host's actual IP address

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

### Data Science Features

The extension includes specialized support for data science workflows:

- **DataFrame Analysis**: Get instant insights on your pandas DataFrames
- **Visualization Recommendations**: Receive smart suggestions for best ways to visualize your data
- **ML Model Explanations**: Understand complex machine learning model code
- **Performance Optimization**: Get suggestions to speed up data processing operations
- **Adaptive Timeouts**: Smart handling of long-running data science operations
- **Progress Indicators**: See estimated time remaining for complex operations
- **Data-Aware UI**: Special rendering for data tables and visualizations

### Common Data Science Use Cases

- **Data Exploration**: "Analyze this DataFrame and show key statistics"
- **Visualization Help**: "Suggest appropriate visualizations for this dataset"
- **Model Understanding**: "Explain what this machine learning model is doing"
- **Data Cleaning**: "Suggest improvements for my data preprocessing"
- **Performance**: "Optimize these pandas operations for better performance"

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
  "debugMode": false,
  "dataScienceOptimization": true,
  "adaptiveTimeouts": true
}
```

## 💻 System Requirements

For the best experience, we recommend:
- A system with at least 8GB RAM (16GB+ recommended for data science workloads)
- Sufficient disk space for Ollama models (models range from 1GB to 10GB+ each)
- A modern web browser (Chrome, Firefox, Safari, Edge)
- Python 3.8 or newer
- For data science features: At least 4 CPU cores for optimal performance

## 🔧 Troubleshooting

### Common Issues

- **Extension visible in `jupyter labextension list` but not in JupyterLab UI**:
  - Clear JupyterLab caches with `jupyter lab clean`
  - Remove any conflicting configurations in `~/.jupyter/jupyter_server_config.json`
  - Run `jupyter server extension enable jupyterlab_ai_assistant`
  - Restart JupyterLab completely

- **"Module not found" error for jupyterlab_ai_assistant**:
  - Ensure you're running JupyterLab from the same virtual environment where you installed the extension
  - Try reinstalling: `pip install -e .` from the extension directory
  - Check that the module is in your Python path with `python -c "import sys; print(sys.path)"`

- **No models available**: 
  - Ensure Ollama is running (`ollama serve`)
  - Verify you've pulled at least one model (`ollama list`)
  - Check connection to the Ollama API: `curl http://localhost:11434/api/tags`

- **Connection errors**: 
  - Verify the Ollama API is accessible at http://localhost:11434
  - Check your network configuration if running on a remote system
  - Ensure there are no firewall rules blocking the connection

- **TypeScript build errors**:
  - Make sure you have Node.js installed (version 14 or higher recommended)
  - Run a clean build: `npm run clean && npm run build:prod`

### Testing the Connection

The extension includes a test tool to verify connectivity:
1. From the JupyterLab menu, select: AI Assistant > Test Ollama Connection
2. A panel will open showing all available models if the connection is successful

### Checking Server Logs

If experiencing issues, check the JupyterLab server logs for error messages:
```bash
jupyter lab --debug
```

## 🛠️ Development

For developers who want to contribute to the project:

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

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👤 Author

- **Bhumukul Raj** - [GitHub](https://github.com/bhumukul-raj) - [Email](mailto:bhumukulraj@gmail.com)

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check [issues page](https://github.com/bhumukul-raj/ollama-ai-assistant-project/issues).

## 📸 Screenshots

![JupyterLab AI Assistant Chat](https://raw.githubusercontent.com/bhumukul-raj/ollama-ai-assistant-project/main/screenshots/chat-widget.png)

![Cell Context Menu](https://raw.githubusercontent.com/bhumukul-raj/ollama-ai-assistant-project/main/screenshots/cell-context.png) 