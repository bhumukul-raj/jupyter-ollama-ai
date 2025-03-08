# Ollama JupyterLab AI Assistant

A powerful AI-powered assistant extension for JupyterLab that uses Ollama for local LLM integration. This extension enhances your notebook experience with intelligent code generation, natural language editing, and context-aware assistance.

## Features

- **Natural Language Code Editing**: Write code using natural language instructions
- **Smart Cell Generation**: Generate code cells based on text descriptions
- **Automatic Error Handling**: Get suggestions for fixing code errors
- **Context-Aware Chat Interface**: AI understands the context of your current notebook
- **Local AI Processing**: Uses Ollama for private, local LLM capabilities
- **Modern, Responsive UI**: Clean interface that works well with JupyterLab's design
- **Dark/Light Theme Support**: Adapts to your JupyterLab theme preferences

## Prerequisites

- JupyterLab >= 4.0.0
- Node.js >= 18.0.0
- Python >= 3.8
- Ollama (for local AI processing)

## Installation

### Using pip (for end users)

1. Install the extension:
```bash
pip install ollama-jupyter-ai
```

2. Install and start Ollama:
```bash
# Install Ollama (visit https://ollama.ai for installation instructions)
# Pull a compatible model (llama3 is the default in our configuration)
ollama pull llama3
# Start the Ollama service
ollama serve
```

3. Restart JupyterLab:
```bash
jupyter lab
```

### Development Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ollama-jupyter-ai.git
cd ollama-jupyter-ai
```

2. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install JupyterLab:
```bash
pip install jupyterlab>=4.0.0
```

4. Navigate to the labextension directory:
```bash
cd ollama_jupyter_ai/labextension
```

5. Install Node.js dependencies:
```bash
yarn install
```

6. Build the extension:
```bash
yarn build:prod
```

7. Go back to the root directory and install the package in development mode:
```bash
cd ../..
pip install -e .
```

8. Build JupyterLab with the extension:
```bash
jupyter lab build
```

9. Start JupyterLab:
```bash
jupyter lab
```

## Build Process Explained

The build process involves several steps:

1. **TypeScript Compilation**: Converts TypeScript code to JavaScript
   ```bash
   yarn build:lib  # Runs tsc to compile TypeScript
   ```

2. **JupyterLab Extension Build**: Bundles the extension for JupyterLab
   ```bash
   yarn build:labextension  # Creates the final extension bundle
   ```

3. **Python Package Build**: Sets up the Python package structure
   ```bash
   pip install -e .  # Installs the Python package in development mode
   ```

4. **JupyterLab Integration**: Registers and enables the extension with JupyterLab
   ```bash
   jupyter lab build  # Builds JupyterLab with the new extension
   ```

## Project Structure

```
project-ollama/
├── ollama_jupyter_ai/           # Main Python package
│   ├── __init__.py              # Package initialization and extension path registration
│   └── labextension/            # JupyterLab extension directory
│       ├── src/                 # TypeScript source code
│       │   ├── components/      # React components
│       │   │   └── AIAssistantPanel.tsx  # Main chat interface component
│       │   ├── services/        # Service modules
│       │   │   ├── OllamaService.ts      # Ollama API integration
│       │   │   └── NotebookService.ts    # Notebook manipulation service
│       │   ├── types/           # TypeScript type definitions
│       │   ├── index.ts         # Extension entry point
│       │   └── widget.tsx       # JupyterLab widget implementation
│       ├── style/               # CSS styling
│       │   ├── base.css         # Core component styles
│       │   └── index.css        # Style entry point
│       ├── package.json         # Node.js package configuration
│       ├── tsconfig.json        # TypeScript configuration
│       └── [other build files]  # Various build configuration files
├── setup.py                     # Python package setup script
├── pyproject.toml               # Python build system configuration
├── install.json                 # JupyterLab extension metadata
└── README.md                    # This documentation file
```

## GitHub Integration

### Setting Up a GitHub Repository

1. Create a new repository on GitHub:
   - Go to github.com and click "New repository"
   - Name it "ollama-jupyter-ai" (or your preferred name)
   - Add a description
   - Choose public or private visibility
   - Click "Create repository"

2. Initialize your local repository:
```bash
git init
git add .
git commit -m "Initial commit"
```

3. Connect and push to GitHub:
```bash
git remote add origin https://github.com/yourusername/ollama-jupyter-ai.git
git branch -M main
git push -u origin main
```

### Making Changes and Pushing Updates

1. Make your changes to the codebase

2. Commit and push changes:
```bash
git add .
git commit -m "Description of your changes"
git push origin main
```

### Creating Releases

1. Tag a release version:
```bash
git tag -a v0.1.0 -m "Version 0.1.0"
git push origin v0.1.0
```

2. On GitHub, go to "Releases" and create a new release from your tag

## Usage Guide

### Starting the Extension

1. Ensure Ollama is running:
```bash
ollama serve
```

2. Launch JupyterLab:
```bash
jupyter lab
```

3. The "Ollama AI Assistant" tab should appear in the left sidebar

### Working with the Assistant

1. **Opening the Assistant**:
   - Click on the "Ollama AI Assistant" tab in the left sidebar
   - The assistant panel will open, showing a chat interface

2. **Asking Questions**:
   - Type your question in the input box at the bottom of the panel
   - Press Enter or click the send button
   - The AI will analyze your current notebook context and provide a response

3. **Code Generation**:
   - Ask for code examples like "Generate a function to calculate the Fibonacci sequence"
   - The assistant will provide code that you can copy into your notebook

4. **Notebook Analysis**:
   - Ask "What does this notebook do?" to get an overview of your current notebook
   - The assistant can analyze variables, imports, and the flow of your code

5. **Error Help**:
   - Paste error messages to get troubleshooting assistance
   - The assistant can suggest fixes for common Python and data science errors

6. **Data Analysis Help**:
   - Ask for help with data manipulation, visualization, or statistical analysis
   - Get suggestions for the best libraries and approaches for your specific task

### Troubleshooting

If the extension doesn't appear or work correctly:

1. Check if Ollama is running:
```bash
curl http://localhost:11434/api/version
```

2. Verify the extension is installed:
```bash
jupyter labextension list
```

3. Check browser console for errors (F12 or right-click > Inspect > Console)

4. Rebuild the extension if needed:
```bash
jupyter lab clean
jupyter lab build
```

5. Restart JupyterLab after rebuilding

## Configuration Options

The extension uses default settings that can be adjusted in the source code:

- **Ollama Model**: Change the default model in `OllamaService.ts`
- **Ollama URL**: Modify the base URL if Ollama is running on a different port
- **AI Parameters**: Adjust temperature, max tokens, and other generation parameters

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request