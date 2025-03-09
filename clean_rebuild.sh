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
pip install jupyter_packaging jupyterlab~=4.0 -U
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

echo "===== Installing the package ====="
# Install the package in development mode with proper extension installation
pip install -e . --no-deps

# Ensure the extension is properly linked
echo "===== Rebuilding JupyterLab to recognize the extension ====="
jupyter labextension develop --overwrite .

# Run JupyterLab build to incorporate the extension
jupyter lab build

echo "===== Verifying extension is installed ====="
jupyter labextension list | grep -i "ollama-jupyter-ai v1.0.0" || echo "Extension not found in jupyter labextension list"

echo "Done! Your extension has been cleaned and rebuilt."
echo "If it's still not appearing in JupyterLab, check the browser console for errors (F12)."