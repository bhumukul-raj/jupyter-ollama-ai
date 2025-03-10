#!/bin/bash

# Exit on error
set -e

echo "===== Cleaning extension files ====="
# Remove any existing build files
rm -rf ollama_jupyter_ai/static/
rm -rf ollama_jupyter_ai/labextension/lib/
rm -rf ollama_jupyter_ai/labextension/tsconfig.tsbuildinfo
rm -rf node_modules/
rm -rf dist/
rm -rf build/
rm -rf ollama_jupyter_ai.egg-info/

# Also clean up any potential JupyterLab extensions cache
jupyter lab clean --all

# Remove existing extension directory if it exists
rm -rf ~/Desktop/ollama-ai-assistant-project/venv/share/jupyter/labextensions/ollama-jupyter-ai

echo "===== Installing dependencies ====="
# Install build dependencies
pip install jupyter_packaging jupyterlab~=4.0 build twine -U
# Install node dependencies
yarn install

echo "===== Building extension ====="
# Build the extension
yarn build:prod

echo "===== Checking files in static directory ====="
ls -la ollama_jupyter_ai/static/
if [ -d "ollama_jupyter_ai/static/static" ]; then
    ls -la ollama_jupyter_ai/static/static/
fi

echo "===== Building Python package ====="
# Build the Python package with the wheel
python -m build

echo "===== Installing the wheel package ====="
# Find the latest wheel file and install it (this works better than development mode)
WHEEL_FILE=$(ls -t dist/*.whl | head -1)
if [ -n "$WHEEL_FILE" ]; then
    echo "Installing wheel: $WHEEL_FILE"
    pip uninstall -y ollama-jupyter-ai
    pip install "$WHEEL_FILE"
else
    echo "No wheel file found in dist directory!"
    exit 1
fi

# Run JupyterLab build to incorporate the extension
#jupyter lab build

echo "===== Verifying extension is installed ====="
jupyter labextension list | grep -i "ollama-jupyter-ai" || echo "Extension not found in jupyter labextension list"

echo "Done! Your extension has been cleaned and rebuilt."
echo "If it's still not appearing in JupyterLab, check the browser console for errors (F12)."