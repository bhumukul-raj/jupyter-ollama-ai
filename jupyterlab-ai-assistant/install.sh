#!/bin/bash

# Exit on error
set -e

# Create a virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    echo "Virtual environment created."
else
    echo "Virtual environment already exists."
fi

# Activate the virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Get the installed JupyterLab version
#JUPYTERLAB_VERSION=$(jupyter lab --version)
JUPYTERLAB_VERSION=3.6.3
echo "Detected JupyterLab version: $JUPYTERLAB_VERSION"

# Install matching dependencies
python3 -m pip install --upgrade pip setuptools wheel
python3 -m pip install "jupyterlab==$JUPYTERLAB_VERSION" \
    "hatchling>=1.4.0" \
    "hatch-nodejs-version" \
    "hatch-jupyter-builder>=0.5" \
    "jupyter_packaging~=0.10,<2" \
    "jupyter-server" \
    "build" \
    "pip-tools" \
    "aiohttp" \
    "requests"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "npm is not installed. Please install Node.js and npm first."
    echo "You can install them from: https://nodejs.org/"
    exit 1
fi

# Clean any previous build artifacts
echo "Cleaning previous builds..."
rm -rf lib/ || true
rm -rf jupyterlab_ai_assistant/labextension/ || true
rm -rf jupyterlab_ai_assistant/static/ || true
rm -f tsconfig.tsbuildinfo || true

# Uninstall any existing extension to ensure clean install
echo "Uninstalling any existing extension..."
pip uninstall -y jupyterlab_ai_assistant || true
jupyter labextension uninstall --no-build jupyterlab-ai-assistant 2>/dev/null || true

# Install Node.js dependencies using npm directly
echo "Installing frontend dependencies..."
npm install --legacy-peer-deps || { echo "Failed to install npm dependencies"; exit 1; }

# Build the TypeScript code 
echo "Building TypeScript code..."
npm run build:lib || { echo "Failed to build library"; exit 1; }
npm run build:labextension || { echo "Failed to build labextension"; exit 1; }

# Create static directory and ensure it has the necessary files
echo "Setting up labextension files..."
mkdir -p jupyterlab_ai_assistant/static
if [ -d "jupyterlab_ai_assistant/labextension" ]; then
    cp -r jupyterlab_ai_assistant/labextension/* jupyterlab_ai_assistant/static/ 2>/dev/null || true
fi

# Install the extension in development mode
echo "Installing extension in development mode..."
pip install -e .

# Link the extension for development
echo "Linking the extension for development..."
jupyter labextension develop --overwrite .

# Build JupyterLab with the extension
echo "Building JupyterLab with the extension..."
jupyter lab build

echo "Listing JupyterLab extensions..."
jupyter labextension list

echo "Installation complete!"
echo "now build wheel"
python -m build

echo "To use the extension:"
echo "1. Activate the virtual environment: source venv/bin/activate"
echo "2. Start JupyterLab: jupyter lab" 