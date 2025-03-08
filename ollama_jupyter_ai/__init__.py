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
    
    # Verify the static directory exists
    static_dir = osp.join(HERE, "static")
    if not osp.exists(static_dir):
        logger.warning(f"Static directory not found at {static_dir}")
    else:
        logger.debug(f"Found static directory at {static_dir}")
        logger.debug(f"Static directory contents: {os.listdir(static_dir)}")
    
    return [{
        'src': 'static',
        'dest': 'ollama-jupyter-ai',
    }] 