#!/bin/bash

# Exit on error
set -e

echo "========== Installing JupyterLab AI Assistant (from Test PyPI) =========="

# Create and activate virtual environment if it doesn't exist
if [ ! -d "text-venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv text-venv
else
    echo "Virtual environment already exists."
fi

echo "Activating virtual environment..."
source text-venv/bin/activate

# Clean previous installation
echo "Uninstalling any existing extension..."
pip uninstall -y jupyterlab-ai-assistant || true
jupyter labextension uninstall jupyterlab-ai-assistant 2>/dev/null || true

# Install JupyterLab and dependencies
echo "Installing JupyterLab and dependencies..."
pip install --upgrade pip setuptools wheel
pip install "jupyterlab==3.6.3" "jupyter_server>=2.0.0,<3.0.0" "jupyter-client>=7.4.4,<8.0.0" "jupyter_server_terminals>=0.5.0"

# Add additional dependencies that are in the install-fixed.sh script
pip install hatchling hatch-nodejs-version hatch-jupyter-builder jupyter_packaging build pip-tools
pip install aiohttp "requests>=2.25.0"

# Install jupyterlab-ai-assistant from Test PyPI
echo "Installing jupyterlab-ai-assistant from Test PyPI..."
pip install -i https://test.pypi.org/simple/ jupyterlab_ai_assistant==0.1.4

# Verify installation
echo "Verifying installation..."
jupyter labextension list

echo "========== Installation complete =========="
echo "To start JupyterLab with the AI Assistant:"
echo "1. Activate the virtual environment: source text-venv/bin/activate"
echo "2. Start JupyterLab: jupyter lab"

# Ask if user wants to start JupyterLab in debug mode
echo ""
echo "Would you like to start JupyterLab in debug mode to verify the extension? (y/n)"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo "Starting JupyterLab in debug mode..."
    export JUPYTERLAB_LOGLEVEL=DEBUG
    jupyter lab --debug
fi 