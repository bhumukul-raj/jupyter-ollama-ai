from traitlets import Bool, Dict, Integer, List, Unicode
from traitlets.config import Configurable
import os
import socket
import logging

# Configure logging
logger = logging.getLogger("ollama_config")

class OllamaConfig(Configurable):
    """Configuration for the Ollama integration."""
    
    base_url = Unicode(
        os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434"),
        help="""
        Base URL for the Ollama API. Can be set with OLLAMA_BASE_URL environment variable.
        
        IMPORTANT FOR CONTAINER USERS:
        When running JupyterLab in a container with Ollama on the host machine, you CANNOT use
        localhost or 127.0.0.1 as these refer to the container itself, not the host.
        
        Instead, try one of these options:
        1. Use the host's IP address: http://<host-ip>:11434
        2. For Docker on macOS/Windows: http://host.docker.internal:11434
        3. For Docker on Linux (default bridge): http://172.17.0.1:11434
        4. For Podman: http://host.containers.internal:11434
        5. For other container engines, check their documentation for host access
        
        You can also try running your container with:
        docker run --network=host ... (to share the host network)
        """,
        config=True
    )
    
    enabled = Bool(
        os.environ.get("OLLAMA_ENABLED", "true").lower() == "true",
        help="Enable or disable the Ollama integration. Can be set with OLLAMA_ENABLED environment variable.",
        config=True
    )
    
    default_model = Unicode(
        os.environ.get("OLLAMA_DEFAULT_MODEL", "llama2"),
        help="Default model to use for Ollama requests. Can be set with OLLAMA_DEFAULT_MODEL environment variable.",
        config=True
    )
    
    allowed_models = List(
        Unicode(),
        default_value=None,
        help="""
        Ollama models to allow, as a list of model IDs.
        If None, all models are allowed.
        Can be set with OLLAMA_ALLOWED_MODELS environment variable (comma-separated list).
        """,
        allow_none=True,
        config=True
    )
    
    max_tokens = Integer(
        int(os.environ.get("OLLAMA_MAX_TOKENS", "4096")),
        help="Maximum number of tokens to generate. Can be set with OLLAMA_MAX_TOKENS environment variable.",
        config=True
    )
    
    default_temperature = Unicode(
        os.environ.get("OLLAMA_DEFAULT_TEMPERATURE", "0.7"),
        help="Default temperature for generation. Can be set with OLLAMA_DEFAULT_TEMPERATURE environment variable.",
        config=True
    )
    
    request_timeout = Integer(
        int(os.environ.get("OLLAMA_REQUEST_TIMEOUT", "60")),
        help="Timeout for Ollama API requests in seconds. Can be set with OLLAMA_REQUEST_TIMEOUT environment variable.",
        config=True
    )
    
    model_options = Dict(
        {},
        help="""
        Additional options for specific models.
        For example: {"llama2": {"temperature": 0.8}}
        """,
        config=True
    )
    
    debug_mode = Bool(
        os.environ.get("OLLAMA_DEBUG_MODE", "true").lower() == "true",
        help="Enable detailed debug logging for the Ollama integration. Can be set with OLLAMA_DEBUG_MODE environment variable.",
        config=True
    )
    
    # New options for large responses and memory management
    max_response_chunk_size = Integer(
        int(os.environ.get("OLLAMA_MAX_RESPONSE_CHUNK_SIZE", "4096")),
        help="Maximum size of response chunks in characters. Can be set with OLLAMA_MAX_RESPONSE_CHUNK_SIZE environment variable.",
        config=True
    )
    
    # New option for pagination of large responses
    enable_response_pagination = Bool(
        os.environ.get("OLLAMA_ENABLE_PAGINATION", "true").lower() == "true",
        help="Enable pagination for large responses to conserve memory. Can be set with OLLAMA_ENABLE_PAGINATION environment variable.",
        config=True
    )
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        
        # Parse allowed_models from environment if set
        if os.environ.get("OLLAMA_ALLOWED_MODELS"):
            allowed_models_env = os.environ.get("OLLAMA_ALLOWED_MODELS", "")
            if allowed_models_env:
                self.allowed_models = [model.strip() for model in allowed_models_env.split(",")]
        
        # Check if we're in a container and using localhost
        if self._is_in_container() and (
            "localhost" in self.base_url or "127.0.0.1" in self.base_url
        ):
            logger.warning(
                "Container environment detected with localhost in Ollama URL. "
                "This will not work for accessing Ollama on the host machine. "
                "Please set OLLAMA_BASE_URL to a host-accessible address."
            )
            logger.warning(
                "Suggested addresses to try: "
                "http://host.docker.internal:11434 (Docker for Mac/Windows), "
                "http://172.17.0.1:11434 (Docker for Linux), "
                "http://host.containers.internal:11434 (Podman)"
            )
        
        # Log configuration for debugging
        if self.debug_mode:
            logger.info(f"OllamaConfig initialized with:")
            logger.info(f"  - base_url: {self.base_url}")
            logger.info(f"  - default_model: {self.default_model}")
            logger.info(f"  - request_timeout: {self.request_timeout}")
            logger.info(f"  - enabled: {self.enabled}")
            logger.info(f"  - max_response_chunk_size: {self.max_response_chunk_size}")
            logger.info(f"  - enable_response_pagination: {self.enable_response_pagination}")
            
            # Check if we can connect to the configured URL
            try:
                import requests
                response = requests.head(f"{self.base_url}/api/tags", timeout=5)
                logger.info(f"  - Ollama API connection test: {'successful' if response.status_code < 400 else 'failed'} (status code {response.status_code})")
            except Exception as e:
                logger.info(f"  - Ollama API connection test: failed - {str(e)}")
                logger.info(f"  - NOTE: Please ensure Ollama is running at {self.base_url}")
    
    def _is_in_container(self) -> bool:
        """Check if we're running inside a container."""
        # Check for Docker
        if os.path.exists("/.dockerenv"):
            return True
            
        # Check cgroup
        if os.path.exists("/proc/1/cgroup"):
            try:
                with open("/proc/1/cgroup", 'r') as f:
                    return 'docker' in f.read() or 'kubepods' in f.read()
            except:
                pass
        
        # Additional container detection methods
        try:
            # Check for container-specific environment variables
            if os.environ.get("KUBERNETES_SERVICE_HOST") or os.environ.get("KUBERNETES_PORT"):
                return True
                
            # Check for container-specific filesystems
            if os.path.exists("/proc/self/cgroup"):
                with open("/proc/self/cgroup", 'r') as f:
                    content = f.read()
                    if any(x in content for x in ['docker', 'kubepods', 'containerd', 'lxc']):
                        return True
        except:
            pass
                
        return False 