from ._version import __version__
from .handlers import setup_handlers
from .ollama_client import OllamaClient
from .config import OllamaConfig
import sys
import traceback

def _jupyter_server_extension_paths():
    """Entry point for the server extension."""
    return [{
        "module": "jupyterlab_ai_assistant"
    }]

def _jupyter_labextension_paths():
    """Entry point for the lab extension."""
    return [{
        "name": "jupyterlab-ai-assistant",
        "src": "static",
        "dest": "jupyterlab-ai-assistant"
    }]

def _load_jupyter_server_extension(server_app):
    """Load the Jupyter server extension."""
    try:
        # Log startup
        server_app.log.info(f"Starting JupyterLab AI Assistant Extension v{__version__}")
        
        # Get configuration
        config = OllamaConfig(config=server_app.config)
        server_app.log.info(f"Ollama configuration: base_url={config.base_url}, default_model={config.default_model}")
        
        # Check if extension is enabled
        if not config.enabled:
            server_app.log.info("JupyterLab AI Assistant extension is disabled in configuration")
            return
        
        # Test Ollama API connection
        try:
            import requests
            server_app.log.info(f"Testing connection to Ollama API at {config.base_url}")
            response = requests.head(f"{config.base_url}/api/tags", timeout=5)
            if response.status_code < 400:
                server_app.log.info(f"Successfully connected to Ollama API at {config.base_url}")
            else:
                server_app.log.warning(f"Connection to Ollama API returned status code {response.status_code}")
        except Exception as e:
            server_app.log.warning(f"Failed to connect to Ollama API at {config.base_url}: {str(e)}")
            server_app.log.warning("Ensure Ollama is running and accessible from the server")
        
        # Initialize Ollama client
        try:
            ollama_client = OllamaClient(base_url=config.base_url)
            server_app.log.info(f"Ollama client initialized with base_url={config.base_url}")
        except Exception as e:
            server_app.log.error(f"Failed to initialize Ollama client: {str(e)}")
            server_app.log.error(traceback.format_exc())
            return
        
        # Set up the handlers
        try:
            setup_handlers(server_app.web_app, ollama_client)
            server_app.log.info("Registered JupyterLab AI Assistant API endpoints")
        except Exception as e:
            server_app.log.error(f"Failed to set up API handlers: {str(e)}")
            server_app.log.error(traceback.format_exc())
            return
        
        server_app.log.info(f"JupyterLab AI Assistant Extension v{__version__} successfully loaded")
        
    except Exception as e:
        server_app.log.error(f"Error loading JupyterLab AI Assistant extension: {str(e)}")
        server_app.log.error(traceback.format_exc())
