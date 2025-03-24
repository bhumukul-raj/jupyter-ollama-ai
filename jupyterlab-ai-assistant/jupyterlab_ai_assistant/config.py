from traitlets import Bool, Dict, Integer, List, Unicode
from traitlets.config import Configurable
import os

class OllamaConfig(Configurable):
    """Configuration for the Ollama integration."""
    
    base_url = Unicode(
        os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434"),
        help="Base URL for the Ollama API. Can be set with OLLAMA_BASE_URL environment variable.",
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
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        
        # Parse allowed_models from environment if set
        if os.environ.get("OLLAMA_ALLOWED_MODELS"):
            allowed_models_env = os.environ.get("OLLAMA_ALLOWED_MODELS", "")
            if allowed_models_env:
                self.allowed_models = [model.strip() for model in allowed_models_env.split(",")]
        
        # Log configuration for debugging
        if self.debug_mode:
            print(f"OllamaConfig initialized with:")
            print(f"  - base_url: {self.base_url}")
            print(f"  - default_model: {self.default_model}")
            print(f"  - request_timeout: {self.request_timeout}")
            print(f"  - enabled: {self.enabled}")
            
            # Check if we can connect to the configured URL
            try:
                import requests
                response = requests.head(f"{self.base_url}/api/tags", timeout=5)
                print(f"  - Ollama API connection test: {'successful' if response.status_code < 400 else 'failed'} (status code {response.status_code})")
            except Exception as e:
                print(f"  - Ollama API connection test: failed - {str(e)}")
                print(f"  - NOTE: Please ensure Ollama is running at {self.base_url}") 