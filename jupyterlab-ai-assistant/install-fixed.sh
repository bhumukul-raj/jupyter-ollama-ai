#!/bin/bash

# Exit on error
set -e

echo "========== Installing JupyterLab AI Assistant (fixed version) =========="

# Create and activate virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
else
    echo "Virtual environment already exists."
fi

echo "Activating virtual environment..."
source venv/bin/activate

# Clean previous installation
echo "Uninstalling any existing extension..."
pip uninstall -y jupyterlab-ai-assistant || true
jupyter labextension uninstall jupyterlab-ai-assistant 2>/dev/null || true

# Install JupyterLab and dependencies
echo "Installing JupyterLab and dependencies..."
pip install --upgrade pip setuptools wheel
pip install "jupyterlab==3.6.3" "jupyter_server>=2.0.0,<3.0.0" "jupyter-client>=7.4.4,<8.0.0" "jupyter_server_terminals>=0.5.0"
pip install hatchling hatch-nodejs-version hatch-jupyter-builder jupyter_packaging build pip-tools
pip install aiohttp "requests>=2.25.0"

# Clean npm cache and install dependencies
echo "Setting up frontend dependencies..."
npm cache clean --force
npm install

# Build TypeScript code and extension
echo "Building the extension..."
npm run build:prod

# Build and install wheel
echo "Building and installing wheel..."
python -m build
pip install dist/*.whl --force-reinstall

# The post-install script now handles copying assets automatically
# No need to manually run: python setup.py copy_assets

# Verify installation
echo "Verifying installation..."
jupyter labextension list

echo "========== Installation complete =========="
echo "To start JupyterLab with the AI Assistant:"
echo "1. Activate the virtual environment: source venv/bin/activate"
echo "2. Start JupyterLab: jupyter lab" 