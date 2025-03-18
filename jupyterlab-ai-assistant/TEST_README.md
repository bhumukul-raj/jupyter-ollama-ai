# Testing the JupyterLab AI Assistant Extension

This document provides instructions for testing the minimal version of the JupyterLab AI Assistant Extension to verify the core architecture works correctly.

## Prerequisites

1. Install JupyterLab:
   ```bash
   pip install jupyterlab
   ```

2. Install Ollama and start it:
   ```bash
   # Follow installation instructions at https://ollama.ai/download
   # Then start the Ollama service:
   ollama serve
   ```

3. Pull at least one model:
   ```bash
   # In a separate terminal
   ollama pull llama2
   ```

## Installation for Testing

1. Install the extension in development mode:
   ```bash
   # From the jupyterlab-ai-assistant directory
   ./install.sh
   ```

2. Start JupyterLab:
   ```bash
   jupyter lab
   ```

## Testing Steps

### Test 1: Check Extension Activation
1. Open JupyterLab in your browser 
2. Open the browser's developer console (F12 or Ctrl+Shift+I)
3. You should see a message: "JupyterLab AI Assistant extension is activated!"

### Test 2: Verify Ollama API Connection
1. In JupyterLab, open the Command Palette (Ctrl+Shift+C)
2. Type "Ollama" and select "Show Ollama Connection Test"
3. A new panel should open showing:
   - If Ollama is running correctly: A list of your installed models
   - If there's an error: An error message about failing to connect

### Known Issues
- If no models appear, ensure Ollama is running with `ollama serve` and you've pulled at least one model
- Connection issues might be related to CORS. The extension expects Ollama to be running at http://localhost:11434

### Manual Debug Steps
If the testing doesn't work, you can manually check:

1. Ollama API access:
   ```bash
   curl http://localhost:11434/api/tags
   ```
   This should return a JSON with your available models

2. JupyterLab extension installation:
   ```bash
   jupyter labextension list
   ```
   You should see `jupyterlab-ai-assistant` listed as installed and enabled

## Next Steps

After verifying this minimal functionality works:
1. You can iteratively add more features from the full architecture
2. Fix any TypeScript linting errors
3. Implement the cell-context awareness features 