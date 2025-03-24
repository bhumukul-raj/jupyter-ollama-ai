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
        
        # Check for container environment early
        in_container = config._is_in_container()
        if in_container:
            server_app.log.info("Container environment detected")
            
            # Check if using localhost in container
            if "localhost" in config.base_url or "127.0.0.1" in config.base_url:
                server_app.log.warning(
                    "CONTAINER CONFIGURATION ISSUE: Using localhost in container environment."
                    " This might not work for connecting to Ollama on the host machine."
                )
                server_app.log.warning(
                    "To fix this, restart JupyterLab with one of these environment variables:"
                )
                server_app.log.warning("  - For Docker on macOS/Windows: OLLAMA_BASE_URL=http://host.docker.internal:11434")
                server_app.log.warning("  - For Docker on Linux: OLLAMA_BASE_URL=http://172.17.0.1:11434")
                server_app.log.warning("  - For Podman: OLLAMA_BASE_URL=http://host.containers.internal:11434")
                server_app.log.warning("  - Or use your host's actual IP address: OLLAMA_BASE_URL=http://<host-ip>:11434")
                server_app.log.warning("Alternatively, run your container with --network=host")
        
        # Test Ollama API connection
        try:
            import requests
            server_app.log.info(f"Testing connection to Ollama API at {config.base_url}")
            response = requests.head(f"{config.base_url}/api/tags", timeout=5)
            if response.status_code < 400:
                server_app.log.info(f"Successfully connected to Ollama API at {config.base_url}")
            else:
                server_app.log.warning(f"Connection to Ollama API returned status code {response.status_code}")
                
                # If in container with localhost, provide more guidance
                if in_container and ("localhost" in config.base_url or "127.0.0.1" in config.base_url):
                    server_app.log.warning(
                        "Connection failed: This is expected when using 'localhost' in a container."
                        " See previous warnings for solution."
                    )
        except Exception as e:
            server_app.log.warning(f"Failed to connect to Ollama API at {config.base_url}: {str(e)}")
            server_app.log.warning("Ensure Ollama is running and accessible from the server")
            
            # Try providing more helpful information if in container
            if in_container:
                server_app.log.warning(
                    "Since you're in a container, make sure you're using the correct host address"
                    " to reach Ollama on the host machine."
                )
        
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
            setup_handlers(server_app.web_app, ollama_client, config)
            server_app.log.info("Registered JupyterLab AI Assistant API endpoints")
        except Exception as e:
            server_app.log.error(f"Failed to set up API handlers: {str(e)}")
            server_app.log.error(traceback.format_exc())
            return
        
        server_app.log.info(f"JupyterLab AI Assistant Extension v{__version__} successfully loaded")
        
    except Exception as e:
        server_app.log.error(f"Error loading JupyterLab AI Assistant extension: {str(e)}")
        server_app.log.error(traceback.format_exc())
