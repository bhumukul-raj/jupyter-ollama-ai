# Installation Guide

This guide will walk you through the process of installing the Ollama JupyterLab AI Assistant extension and setting up Ollama on your system.

## Requirements

- JupyterLab >= 4.0.0
- Python >= 3.8
- Ollama (for local AI processing)

## Installing the Extension

### Method 1: Installing from PyPI (Recommended)

The easiest way to install the extension is using pip:

```bash
pip install bhumukul-ollama-jupyter-ai
```

### Method 2: Installing from TestPyPI

For the development version:

```bash
pip install -i https://test.pypi.org/simple/ bhumukul-ollama-jupyter-ai
```

### Method 2: Installing from Source

For the latest development version or to customize the extension, you can install from source:

1. Clone the repository:
   ```bash
   git clone https://github.com/bhumukul-raj/ollama-ai-assistant-project.git
   cd ollama-ai-assistant-project
   ```

2. Create and activate a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install in development mode:
   ```bash
   pip install -e .
   jupyter labextension develop --overwrite .
   jupyter lab build
   ```

## Setting Up Ollama

The extension requires Ollama to be installed and running on your system.

### 1. Install Ollama

Visit [Ollama's official website](https://ollama.ai) for installation instructions specific to your operating system.

#### Linux
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

#### macOS
Download the app from https://ollama.ai/download/mac.

#### Windows
Download the installer from https://ollama.ai/download/win.

### 2. Download a Model

After installing Ollama, you need to download at least one model. The extension works best with the "mistral" model by default:

```bash
ollama pull mistral
```

Other recommended models:
```bash
ollama pull llama2
ollama pull codellama
```

### 3. Start Ollama Service

For the extension to connect to Ollama, the Ollama service needs to be running:

```bash
ollama serve
```

On macOS, the Ollama application will start the service automatically. On Windows, the service should start automatically after installation.

## Verifying the Installation

1. Start JupyterLab:
   ```bash
   jupyter lab
   ```

2. Look for the "Ollama AI Assistant" icon in the right sidebar of JupyterLab.

3. Click the icon to open the assistant panel.

4. Select a model from the dropdown menu at the top of the panel.

5. Type a message in the input box and press Enter to test the connection to Ollama.

## Troubleshooting

If you encounter issues during installation or setup:

- Ensure JupyterLab is version 4.0.0 or later
- Verify that Ollama is running with `ps aux | grep ollama`
- Check that the selected model has been downloaded using `ollama list`
- Look for error messages in the browser console (F12)
- Try restarting Ollama and JupyterLab

For more troubleshooting help, see the [Troubleshooting](troubleshooting.md) section. 