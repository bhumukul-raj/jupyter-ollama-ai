from traitlets import Bool, Dict, Integer, List, Unicode
from traitlets.config import Configurable

class OllamaConfig(Configurable):
    """Configuration for the Ollama integration."""
    
    base_url = Unicode(
        "http://localhost:11434",
        help="Base URL for the Ollama API.",
        config=True
    )
    
    enabled = Bool(
        True,
        help="Enable or disable the Ollama integration.",
        config=True
    )
    
    default_model = Unicode(
        "llama2",
        help="Default model to use for Ollama requests.",
        config=True
    )
    
    allowed_models = List(
        Unicode(),
        default_value=None,
        help="""
        Ollama models to allow, as a list of model IDs.
        If None, all models are allowed.
        """,
        allow_none=True,
        config=True
    )
    
    max_tokens = Integer(
        4096,
        help="Maximum number of tokens to generate.",
        config=True
    )
    
    default_temperature = Unicode(
        "0.7",
        help="Default temperature for generation.",
        config=True
    )
    
    request_timeout = Integer(
        60,
        help="Timeout for Ollama API requests in seconds.",
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
        True,
        help="Enable detailed debug logging for the Ollama integration.",
        config=True
    )
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
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