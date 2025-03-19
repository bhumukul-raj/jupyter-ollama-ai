#!/bin/bash

# Exit on error
set -e

# Create and activate virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
else
    echo "Virtual environment already exists."
fi

echo "Activating virtual environment..."
source venv/bin/activate

# Clean previous environment
echo "Cleaning previous installation..."
pip uninstall -y jupyterlab jupyterlab_pygments jupyter_server jupyter_server_terminals

# Completely uninstall the extension
echo "Completely uninstalling the extension..."
pip uninstall jupyterlab-ai-assistant -y
jupyter labextension uninstall jupyterlab-ai-assistant 2>/dev/null || true

# Clean previous builds
echo "Cleaning previous builds..."
rm -rf dist/
rm -rf build/
rm -rf *.egg-info
rm -rf lib/
rm -rf jupyterlab_ai_assistant/labextension
rm -rf node_modules/

# Clean jupyter directories
echo "Cleaning jupyter extension directories..."
rm -rf ~/.local/share/jupyter/labextensions/jupyterlab_ai_assistant
rm -rf ~/.local/share/jupyter/lab/schemas/jupyterlab_ai_assistant
rm -rf $(dirname $(which python))/share/jupyter/labextensions/jupyterlab_ai_assistant
rm -rf $(dirname $(which python))/share/jupyter/lab/schemas/jupyterlab_ai_assistant

# Install dependencies with specific versions
echo "Installing dependencies with specific versions..."
pip install --upgrade pip setuptools wheel

# Install JupyterLab and core dependencies
pip install "jupyterlab==3.6.3" \
    "jupyter_server<2,>=1.6" \
    "jupyter_server_terminals" \
    "jupyterlab_pygments>=0.3.0" \
    "jupyter-core>=5.3.0" \
    "jupyter-client>=8.3.0" \
    "notebook<7" \
    "nbclassic>=1.0.0" \
    "nbconvert>=7.8.0" \
    "nbformat>=5.9.0"

# Install build dependencies
pip install hatchling \
    hatch-nodejs-version \
    hatch-jupyter-builder \
    jupyter_packaging \
    build \
    pip-tools

# Install runtime dependencies
pip install aiohttp \
    requests

# Verify installations
pip list | grep -E "jupyterlab|jupyter-server|jupyterlab-pygments|hatch|build|aiohttp|requests"

# Clean npm cache and node_modules
echo "Cleaning npm cache and node_modules..."
npm cache clean --force


# Install frontend dependencies
echo "Installing frontend dependencies..."
npm install

# Build TypeScript code and extension
echo "Building the extension..."
npm run build:prod

# Build wheel
echo "Building wheel..."
python -m build

pip uninstall jupyterlab-ai-assistant -y

jupyter labextension list

echo "To use the extension:"
echo "1. Activate the virtual environment: source venv/bin/activate"
echo "2. Uninstall any existing version: pip uninstall jupyterlab-ai-assistant -y"
echo "3. Install the new wheel: pip install dist/*.whl"
echo "4. Start JupyterLab: jupyter lab" 