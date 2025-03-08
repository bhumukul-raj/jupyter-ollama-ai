"""
Ollama JupyterLab AI Assistant
"""
import json
import os.path as osp
import logging
import sys

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

with open(osp.join(HERE, 'labextension', 'package.json')) as fid:
    data = json.load(fid)

__version__ = data['version']

def _jupyter_labextension_paths():
    """
    Returns a list of dictionaries with metadata about the labextension.
    """
    logger.debug("Loading extension paths for ollama-jupyter-ai")
    return [{
        'src': 'labextension',
        'dest': data['name']
    }] 