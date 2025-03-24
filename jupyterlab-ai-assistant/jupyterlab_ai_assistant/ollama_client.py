import json
import requests
import time
import os
import socket
from typing import Dict, List, Optional, Any, Generator, Union
import threading
from functools import lru_cache
import re
import logging
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import hashlib

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("ollama_client")

# Increase default timeout values for data science workloads
DEFAULT_TIMEOUT = 120  # Increase to 2 minutes
DEFAULT_LONG_TIMEOUT = 300  # 5 minutes for complex analysis
CONNECTION_TIMEOUT = 10  # Connection timeout

# Cache for model responses to reduce duplicate requests
RESPONSE_CACHE_SIZE = 100
response_cache = {}
response_cache_lock = threading.Lock()

class OllamaClient:
    """Client for interacting with the Ollama API."""
    
    def __init__(self, base_url: str = "http://localhost:11434"):
        """Initialize the Ollama client.
        
        Args:
            base_url: Base URL for the Ollama API. Default is http://localhost:11434.
        """
        self.base_url = base_url.rstrip('/')
        self._supports_chat_api = None  # Flag to cache whether chat API is supported
        self._api_version = None  # Cache for API version
        self._connection_verified = False  # Flag to track if we've verified connection
        self._models_cache = {}  # Cache for models to reduce API calls
        self._models_cache_time = 0  # Last time models were cached
        self._lock = threading.RLock()  # Thread lock for thread safety
        self._verify_connection()
        
    def _verify_connection(self, timeout=CONNECTION_TIMEOUT):
        """Verify connectivity to the Ollama API and gather API information.
        
        Args:
            timeout: Timeout in seconds for the verification request.
            
        Returns:
            bool: True if connection is successful, False otherwise.
        """
        with self._lock:
            if self._connection_verified:
                return True
                
            try:
                # Try to resolve hostname first to detect network isolation issues
                if self.base_url.startswith("http://") or self.base_url.startswith("https://"):
                    host = self.base_url.split("://")[1].split(":")[0]
                    if host == "localhost":
                        # Check if we're in a container by looking for .dockerenv file
                        if os.path.exists("/.dockerenv"):
                            print("Warning: Running in a container but using localhost. This may not work properly.")
                            print("Consider using host.docker.internal or the container's IP address instead.")
                        # Try to connect to the socket
                        try:
                            port = int(self.base_url.split(":")[-1].split("/")[0])
                            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                            s.settimeout(2)  # Increase socket timeout
                            s.connect((host, port))
                            s.close()
                        except Exception as e:
                            print(f"Warning: Could not connect to socket {host}:{port} - {str(e)}")
                            
                # Check API version and capabilities
                url = f"{self.base_url}/api/version"
                try:
                    response = requests.get(url, timeout=timeout)
                    if response.status_code == 200:
                        try:
                            version_info = response.json()
                            self._api_version = version_info.get("version", "unknown")
                            print(f"Connected to Ollama API version: {self._api_version}")
                        except Exception:
                            print("Connected to Ollama API, but could not parse version information")
                    else:
                        print(f"Connected to Ollama API, but version endpoint returned status {response.status_code}")
                except Exception:
                    # Fall back to checking the tags endpoint
                    pass
                    
                # Check the tags endpoint which should always exist
                url = f"{self.base_url}/api/tags"
                # Use a session for connection pooling
                session = requests.Session()
                response = session.get(url, timeout=timeout)
                response.raise_for_status()
                
                # Cache the models
                try:
                    models_data = response.json()
                    if 'models' in models_data:
                        self._models_cache = models_data
                        self._models_cache_time = time.time()
                except Exception:
                    pass
                
                # If we get here, connection is verified
                self._connection_verified = True
                return True
                
            except requests.RequestException as e:
                print(f"Failed to connect to Ollama API at {self.base_url}: {str(e)}")
                return False
        
    def list_models(self) -> List[Dict[str, Any]]:
        """List all available models.
        
        Returns:
            List of model information dictionaries.
        """
        # Check cache first (valid for 5 minutes)
        current_time = time.time()
        if self._models_cache and current_time - self._models_cache_time < 300:
            return self._models_cache.get('models', [])
            
        # Retry up to 3 times with exponential backoff
        max_retries = 3
        retry_delay = 1
        
        for attempt in range(max_retries):
            try:
                # Use a session for connection pooling
                session = requests.Session()
                url = f"{self.base_url}/api/tags"
                response = session.get(url, timeout=DEFAULT_TIMEOUT)
                response.raise_for_status()
                
                # Update the cache
                result = response.json()
                self._models_cache = result
                self._models_cache_time = current_time
                
                return result.get('models', [])
            except requests.RequestException as e:
                if attempt < max_retries - 1:
                    print(f"Error listing models (attempt {attempt+1}/{max_retries}): {str(e)}")
                    time.sleep(retry_delay)
                    retry_delay *= 2
                else:
                    print(f"Failed to list models after {max_retries} attempts: {str(e)}")
                    raise
    
    @lru_cache(maxsize=8)  # Cache the API support check
    def _check_chat_api_support(self) -> bool:
        """Check if the Ollama instance supports the chat API.
        
        Returns:
            Boolean indicating whether the /api/chat endpoint is supported.
        """
        if self._supports_chat_api is not None:
            return self._supports_chat_api
            
        # Try a simple HEAD request to check if the endpoint exists
        try:
            # Use a session for connection pooling
            session = requests.Session()
            url = f"{self.base_url}/api/chat"
            response = session.head(url, timeout=CONNECTION_TIMEOUT)
            self._supports_chat_api = response.status_code != 404
            
            if not self._supports_chat_api:
                print("Warning: Chat API not supported by this Ollama instance. Will use generate API instead.")
            
            return self._supports_chat_api
        except Exception as e:
            # Default to False on any error
            print(f"Error checking chat API support: {str(e)}")
            self._supports_chat_api = False
            return False
            
    def _format_generate_payload(self, messages: List[Dict[str, str]]) -> Dict[str, Any]:
        """Format chat messages into a prompt for the generate API.
        
        Args:
            messages: List of message dictionaries with role and content.
            
        Returns:
            Dict with prompt and other parameters for the generate API.
        """
        # Create a formatted prompt from the messages
        formatted_lines = []
        
        for msg in messages:
            role = msg.get("role", "").capitalize()
            content = msg.get("content", "")
            
            if role.lower() == "system" and len(formatted_lines) == 0:
                # System message at the start
                formatted_lines.append(f"<s>[INST] <<SYS>>\n{content}\n<</SYS>>\n\n")
            elif role.lower() == "user":
                if formatted_lines and formatted_lines[-1].endswith("[/INST]"):
                    # Start a new conversation turn
                    formatted_lines.append(f"<s>[INST] {content} [/INST]")
                else:
                    # First user message after system or continuing conversation
                    formatted_lines.append(f"{content} [/INST]")
            elif role.lower() == "assistant":
                formatted_lines.append(f"{content} </s>")
        
        # If the last message is from a user, make sure it has the proper format
        if formatted_lines and not formatted_lines[-1].endswith("[/INST]") and not formatted_lines[-1].endswith("</s>"):
            formatted_lines[-1] += " [/INST]"
            
        prompt = "".join(formatted_lines)
        
        return {"prompt": prompt}
        
    def chat_completion(
        self, 
        model: str,
        messages: List[Dict[str, str]],
        stream: bool = True,
        temperature: float = 0.7,
        context: Optional[List[int]] = None,
        **kwargs
    ) -> Union[Generator[Dict[str, Any], None, None], Dict[str, Any]]:
        """Generate a chat completion using the specified model.
        
        Args:
            model: The model to use for the chat completion.
            messages: A list of message dictionaries with role and content.
            stream: Whether to stream the response or return it all at once.
            temperature: The temperature to use for generation.
            context: Optional context for the chat completion.
            **kwargs: Additional arguments to pass to the API.
            
        Returns:
            Generator yielding response chunks, or a complete response dictionary.
        """
        # Ensure connection is verified before proceeding
        if not self._verify_connection():
            raise requests.RequestException(f"Could not connect to Ollama API at {self.base_url}")
        
        # Filter out any messages with empty content to avoid API issues
        filtered_messages = [msg for msg in messages if msg.get("content", "").strip() or msg.get("role") != "assistant"]
        if not filtered_messages:
            # Ensure we have at least one message
            return {"message": {"content": ""}}
        
        # Determine if this is likely a data science query
        is_data_science = self._is_data_science_query(filtered_messages)
        timeout = kwargs.get("timeout", DEFAULT_LONG_TIMEOUT if is_data_science else DEFAULT_TIMEOUT)
            
        # Create a session for connection pooling
        session = requests.Session()
        
        # First try the chat API if it exists
        if self._check_chat_api_support():
            url = f"{self.base_url}/api/chat"
            
            payload = {
                "model": model,
                "messages": filtered_messages,
                "stream": stream,
                "temperature": temperature,
                **kwargs
            }
            
            if context is not None:
                payload["context"] = context
                
            try:
                if stream:
                    response = session.post(url, json=payload, stream=True, timeout=timeout)
                    response.raise_for_status()
                    
                    for line in response.iter_lines():
                        if line:
                            try:
                                chunk = json.loads(line)
                                yield chunk
                                
                                # Check if this is the last chunk
                                if chunk.get("done", False):
                                    break
                            except json.JSONDecodeError as e:
                                print(f"Error decoding JSON from stream: {str(e)}")
                                print(f"Raw line: {line}")
                                continue
                else:
                    # For non-streaming responses, don't use streaming mode
                    response = session.post(url, json=payload, timeout=timeout)
                    response.raise_for_status()
                    result = response.json()
                    
                    # Ensure we return a properly formatted response
                    if not isinstance(result, dict) or 'message' not in result:
                        result = {
                            "message": {
                                "content": str(result) if result else ""
                            }
                        }
                    elif not isinstance(result['message'], dict) or 'content' not in result['message']:
                        result['message'] = {
                            "content": str(result['message']) if result['message'] else ""
                        }
                        
                    return result
            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 404:
                    # Chat API not supported, fallback to generate API
                    self._supports_chat_api = False
                    print(f"Chat API not supported, falling back to generate API")
                else:
                    # Other HTTP error, re-raise
                    raise
            except requests.exceptions.Timeout:
                print(f"Request to chat API timed out after {timeout} seconds")
                # Return partial or empty response rather than failing
                return {
                    "message": {
                        "content": "[The model took too long to respond. Please try again with a shorter query or try the 'Analyze cell' function for complex code.]"
                    }
                }
        
        # Fallback to the generate API if chat API is not supported or failed with 404
        if not self._supports_chat_api:
            url = f"{self.base_url}/api/generate"
            
            # Generate requires a prompt not messages, so we need to format them
            generate_payload = self._format_generate_payload(filtered_messages)
            
            payload = {
                "model": model,
                "stream": stream,
                "temperature": temperature,
                **generate_payload,
                **kwargs
            }
            
            if context is not None:
                payload["context"] = context
                
            try:
                if stream:
                    response = session.post(url, json=payload, stream=True, timeout=timeout)
                    response.raise_for_status()
                    
                    for line in response.iter_lines():
                        if line:
                            try:
                                chunk = json.loads(line)
                                # Convert generate response format to chat format
                                chat_chunk = {
                                    "message": {"content": chunk.get("response", "")},
                                    "done": chunk.get("done", False)
                                }
                                yield chat_chunk
                                
                                # Check if this is the last chunk
                                if chunk.get("done", False):
                                    break
                            except json.JSONDecodeError as e:
                                print(f"Error decoding JSON from stream: {str(e)}")
                                print(f"Raw line: {line}")
                                continue
                else:
                    # For non-streaming responses, don't use streaming mode
                    response = session.post(url, json=payload, timeout=timeout)
                    response.raise_for_status()
                    result = response.json()
                    
                    # Check if result is valid
                    response_text = result.get("response", "")
                    if response_text is None:
                        response_text = ""
                    
                    # Convert generate response format to chat format and ensure we return a dictionary, not a generator
                    full_response = {
                        "message": {
                            "content": response_text
                        }
                    }
                    return full_response
            except requests.exceptions.Timeout:
                print(f"Request to generate API timed out after {timeout} seconds")
                # Return partial or empty response rather than failing
                return {
                    "message": {
                        "content": "[The model took too long to respond. Please try again with a shorter query or try breaking your request into smaller parts.]"
                    }
                }
                
    def _is_data_science_query(self, messages: List[Dict[str, str]]) -> bool:
        """Determine if the messages are likely related to data science.
        
        Args:
            messages: List of message dictionaries with role and content.
            
        Returns:
            Boolean indicating if the query is likely data science related.
        """
        # Keywords that suggest data science content
        ds_keywords = [
            'pandas', 'numpy', 'matplotlib', 'seaborn', 'sklearn', 'tensorflow', 
            'pytorch', 'keras', 'data frame', 'dataframe', 'jupyter', 
            'machine learning', 'neural network', 'deep learning', 'plot', 
            'visualization', 'statistics', 'regression', 'classification', 
            'clustering', 'array', 'matrix', 'dataset', 'data set'
        ]
        
        # Check last user message for keywords
        for msg in reversed(messages):
            if msg.get('role') == 'user':
                content = msg.get('content', '').lower()
                if any(keyword in content for keyword in ds_keywords):
                    return True
                # Check for code patterns
                if 'import' in content and any(lib in content for lib in ['pd', 'np', 'plt', 'sns', 'tf']):
                    return True
                break
                
        return False
                
    def generate_embeddings(self, model: str, text: str) -> List[float]:
        """Generate embeddings for the given text using the specified model.
        
        Args:
            model: The model to use for generating embeddings.
            text: The text to embed.
            
        Returns:
            List of embedding values.
        """
        url = f"{self.base_url}/api/embeddings"
        payload = {
            "model": model,
            "prompt": text
        }
        
        try:
            session = requests.Session()
            response = session.post(url, json=payload, timeout=DEFAULT_TIMEOUT)
            response.raise_for_status()
            result = response.json()
            return result.get("embedding", [])
        except requests.RequestException as e:
            print(f"Error generating embeddings: {str(e)}")
            raise 