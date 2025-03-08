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
- jupyter_packaging (for extension installation)

## Installation

### Using pip (for end users)

1. Install jupyter_packaging first (required for building the extension):
```bash
pip install jupyter_packaging
```

2. Install the extension:
```bash
pip install ollama-jupyter-ai
```

3. Install and start Ollama:
```bash
# Install Ollama (visit https://ollama.ai for installation instructions)
# Pull a compatible model (like mistral)
ollama pull mistral
# Start the Ollama service
ollama serve
```

4. Restart JupyterLab:
```bash
jupyter lab
```

### Manual Installation (if pip install doesn't work)

If the standard installation doesn't register the extension properly, follow these steps:

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

3. Install required dependencies:
```bash
pip install jupyter_packaging jupyterlab>=4.0.0
```

4. Build the extension:
```bash
cd ollama_jupyter_ai/labextension
yarn install
yarn build:prod
```

5. Install the package in development mode:
```bash
cd ../../
pip install -e .
```

6. Manually add the extension to JupyterLab (workaround for registration issues):
```bash
mkdir -p venv/share/jupyter/labextensions/ollama-jupyter-ai
cp -r ollama_jupyter_ai/labextension/dist/* venv/share/jupyter/labextensions/ollama-jupyter-ai/
```

7. Rebuild JupyterLab:
```bash
jupyter lab build
```

8. Verify the extension is installed:
```bash
jupyter labextension list
# Should show "ollama-jupyter-ai" in the list
```

9. Start JupyterLab:
```bash
jupyter lab
```

## Troubleshooting

### Extension Not Appearing in JupyterLab

If the extension doesn't appear after standard installation:

1. Check if the extension is listed:
```bash
jupyter labextension list
```

2. If it's not listed, try manual installation steps above.

3. Check browser console for errors (F12 or right-click > Inspect > Console)

### Directory Structure Issues

The extension relies on a specific directory structure. If you encounter build errors:

1. Check `outputDir` settings in package.json files to avoid recursive nesting:
   - Root package.json should point to appropriate output location
   - labextension/package.json should have `"outputDir": "dist"`

2. Ensure proper Python package registration in `__init__.py`:
   - `_jupyter_labextension_paths()` should return the correct path

3. Manually copy the built extension to JupyterLab's extension directory (as in installation step 6)

### Dependency Version Conflicts

If you encounter version conflicts:

1. Update @jupyterlab/services in package.json:
```
"@jupyterlab/services": "^7.0.0"
```

2. Rebuild with compatible versions.

## Usage Guide

### Working with the Assistant

1. **Opening the Assistant**:
   - The assistant panel will appear in the right sidebar of JupyterLab
   - If it doesn't appear, click on the "Ollama AI Assistant" icon in the right sidebar

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

### Configuration Options

The extension uses default settings that can be adjusted in the source code:

- **Ollama Model**: Change the default model in `OllamaService.ts` (default is mistral)
- **Ollama URL**: Modify the base URL if Ollama is running on a different port or host
- **AI Parameters**: Adjust temperature, max tokens, and other generation parameters

## Development Guide

### Project Structure

```
project-ollama/
├── ollama_jupyter_ai/           # Main Python package
│   ├── __init__.py              # Package initialization and extension path registration
│   └── labextension/            # JupyterLab extension directory
│       ├── src/                 # TypeScript source code
│       │   ├── components/      # React components
│       │   │   └── AIAssistantPanel.tsx  # Main chat interface component
│       │   │   └── Icons.tsx    # FontAwesome icon components
│       │   ├── services/        # Service modules
│       │   │   ├── OllamaService.ts      # Ollama API integration
│       │   │   └── NotebookService.ts    # Notebook manipulation service
│       │   ├── types/           # TypeScript type definitions
│       │   ├── index.ts         # Extension entry point
│       │   └── widget.tsx       # JupyterLab widget implementation
│       ├── style/               # CSS styling
│       ├── package.json         # Node.js package configuration
│       └── tsconfig.json        # TypeScript configuration
├── setup.py                     # Python package setup script
├── pyproject.toml               # Python build system configuration
├── install.json                 # JupyterLab extension metadata
└── README.md                    # This documentation file
```

### Development Tips

1. **Clean Before Rebuilding**: Always clean before rebuilding to avoid stale files:
```bash
cd ollama_jupyter_ai/labextension
yarn clean:all
```

2. **Check Directory Paths**: When making changes, verify all directory paths are consistent

3. **Monitor Build Output**: Check build logs for any errors that might prevent proper installation

4. **Browser Dev Tools**: Use browser developer tools to check for console errors

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.