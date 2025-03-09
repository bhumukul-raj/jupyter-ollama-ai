"""
Ollama JupyterLab AI Assistant
"""
import json
import os
import os.path as osp
import logging
import sys
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger('ollama_jupyter_ai')

HERE = osp.abspath(osp.dirname(__file__))

# Try to load package.json, but don't fail if not available
try:
    with open(osp.join(HERE, 'labextension', 'package.json')) as fid:
        data = json.load(fid)
except (FileNotFoundError, json.JSONDecodeError):
    logger.warning("Could not load package.json from labextension directory")
    data = {}

# Set version explicitly to 1.0.0
__version__ = "1.0.0"

def _jupyter_labextension_paths():
    """
    Returns a list of dictionaries with metadata about the labextension.
    This function is critical for extension discovery.
    """
    logger.debug("Loading extension paths for ollama-jupyter-ai")
    
    # Check if the static directory exists
    static_dir = osp.join(HERE, 'static')
    if not osp.exists(static_dir):
        logger.warning(f"Static directory not found: {static_dir}")
        # Let's check if we have files inside the directory
        try:
            os.makedirs(static_dir, exist_ok=True)
            logger.debug(f"Created static directory: {static_dir}")
        except Exception as e:
            logger.error(f"Error creating static directory: {e}")
    
    # Check what files are in the static directory
    if osp.exists(static_dir):
        try:
            files = os.listdir(static_dir)
            logger.debug(f"Files in static directory: {files}")
        except Exception as e:
            logger.error(f"Error listing files in static directory: {e}")
            files = []
    
    # This is the critical path information that JupyterLab uses to find your extension
    return [{
        'src': 'static',  # Source directory relative to the ollama_jupyter_ai package
        'dest': 'ollama-jupyter-ai'  # Extension name as defined in package.json's name field
    }] 