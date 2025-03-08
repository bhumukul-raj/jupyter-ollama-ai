# Ollama Jupyter AI Extension Project Requirements

This document outlines all the dependencies and requirements needed to build and develop the Ollama Jupyter AI extension.

## Python Environment

### Python Version
- Python 3.8 or higher (recommended: 3.10+)

### Core Python Dependencies
- jupyterlab >= 4.0.0, < 5.0.0
- jupyter_packaging >= 0.10.0
- setuptools >= 42.0.0

### Development Dependencies
- pip
- wheel
- twine (for publishing)
- build

## Node.js Environment

### Node.js Version
- Node.js >= 16.0.0 (recommended: 18.x)

### Yarn
- Yarn >= 3.0.0 (required for package management)

### TypeScript
- TypeScript >= 4.5.0

### React
- React >= 17.0.0
- React DOM >= 17.0.0

### JupyterLab Frontend Dependencies
- @jupyterlab/application
- @jupyterlab/apputils
- @jupyterlab/notebook
- @jupyterlab/cells
- @jupyterlab/ui-components
- @lumino/widgets
- @lumino/disposable

### UI/UX Dependencies
- highlight.js (for code syntax highlighting)
- lucide-react (for icons)

## Ollama

- Ollama locally installed and running
- At least one LLM model downloaded via Ollama (e.g., mistral, llama2)

## Build Tools

- jupyter-packaging (for building JupyterLab extensions)
- webpack (bundled with JupyterLab extension development)
- npm or yarn (for package management)

## Installation Process

1. Set up a Python virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install the package in development mode:
   ```bash
   pip install -e .
   ```

3. Build and install the JupyterLab extension:
   ```bash
   # If using pip
   pip install -e .
   jupyter labextension develop . --overwrite
   
   # If using jupyter extension commands
   jupyter labextension build
   jupyter labextension install
   ```

4. For frontend development, run:
   ```bash
   # In the labextension directory
   cd ollama_jupyter_ai/labextension
   yarn install
   yarn build
   ```

## Development Workflow

1. Start JupyterLab in watch mode:
   ```bash
   jupyter lab --watch
   ```

2. In a separate terminal, start the TypeScript build in watch mode:
   ```bash
   cd ollama_jupyter_ai/labextension
   yarn watch
   ```

3. Ensure Ollama service is running locally:
   ```bash
   ollama serve
   ```

## Runtime Requirements

- Ollama service running on http://localhost:11434 (default)
- JupyterLab running with the extension enabled
- At least one LLM model available in Ollama 