#!/bin/bash

# Don't exit on error - safer for interactive environment
set +e

echo "===== Creating backup directory ====="
BACKUP_DIR=~/jupyterlab_backup_$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
echo "Backup directory created at: $BACKUP_DIR"

echo "===== Backing up important configuration files ====="
# Backup jupyter config
if [ -d ~/.jupyter ]; then
    cp -r ~/.jupyter $BACKUP_DIR/
    echo "Backed up ~/.jupyter"
fi

echo "===== IMPORTANT: This script will not kill existing Jupyter processes ====="
echo "If you're running this from within JupyterLab or a related environment,"
echo "you should restart your terminal after this script completes."
echo ""
echo "Press Enter to continue..."
read

echo "===== Uninstalling JupyterLab ====="
pip uninstall -y jupyterlab jupyterlab-server notebook-shim || echo "Uninstall failed, but continuing..."

echo "===== Removing JupyterLab data directories ====="
# Remove JupyterLab configuration directories
rm -rf ~/.jupyter/lab || echo "Failed to remove ~/.jupyter/lab, but continuing..."
# Remove cached JupyterLab data
find ~/.cache -name "*jupyterlab*" -type d -exec rm -rf {} \; 2>/dev/null || echo "Cache removal partially failed, but continuing..."
find ~/.local/share/jupyter -name "*lab*" -type d -exec rm -rf {} \; 2>/dev/null || echo "Local share removal partially failed, but continuing..."
# Remove JupyterLab extension directories
rm -rf ~/Desktop/ollama-ai-assistant-project/venv/share/jupyter/lab || echo "Failed to remove lab dir from venv, but continuing..."
rm -rf ~/Desktop/ollama-ai-assistant-project/venv/share/jupyter/labextensions || echo "Failed to remove labextensions from venv, but continuing..."

echo "===== Reinstalling JupyterLab ====="
pip install jupyterlab==4.3.5

echo "===== Verifying JupyterLab installation ====="
jupyter --version || echo "Failed to get Jupyter version, but continuing..."
jupyter lab --version || echo "Failed to get JupyterLab version, but continuing..."

echo "===== Reinstall Ollama JupyterLab extension? ====="
read -p "Do you want to reinstall the Ollama JupyterLab extension? (y/n): " choice
if [[ "$choice" =~ ^[Yy]$ ]]; then
    echo "===== Running clean_rebuild.sh to reinstall the extension ====="
    bash ./clean_rebuild.sh || echo "Extension installation failed, but script completed"
else
    echo "Skipping Ollama JupyterLab extension installation"
fi

echo "===== Complete! ====="
echo "JupyterLab has been reinstalled."
echo "Your previous configuration was backed up to: $BACKUP_DIR"
echo ""
echo "IMPORTANT: You should restart your terminal session now."
echo "To start JupyterLab after restarting terminal, run: jupyter lab" 