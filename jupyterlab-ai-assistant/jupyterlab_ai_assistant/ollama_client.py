import json
import requests
from typing import Dict, List, Optional, Any, Generator

class OllamaClient:
    """Client for interacting with the Ollama API."""
    
    def __init__(self, base_url: str = "http://localhost:11434"):
        """Initialize the Ollama client.
        
        Args:
            base_url: Base URL for the Ollama API. Default is http://localhost:11434.
        """
        self.base_url = base_url.rstrip('/')
        self._supports_chat_api = None  # Flag to cache whether chat API is supported
        
    def list_models(self) -> List[Dict[str, Any]]:
        """List all available models.
        
        Returns:
            List of model information dictionaries.
        """
        url = f"{self.base_url}/api/tags"
        response = requests.get(url)
        response.raise_for_status()
        return response.json().get('models', [])
    
    def _check_chat_api_support(self) -> bool:
        """Check if the Ollama instance supports the chat API.
        
        Returns:
            Boolean indicating whether the /api/chat endpoint is supported.
        """
        if self._supports_chat_api is not None:
            return self._supports_chat_api
            
        # Try a simple HEAD request to check if the endpoint exists
        try:
            url = f"{self.base_url}/api/chat"
            response = requests.head(url)
            self._supports_chat_api = response.status_code != 404
            return self._supports_chat_api
        except Exception:
            # Default to False on any error
            self._supports_chat_api = False
            return False
    
    def _format_generate_payload(self, messages: List[Dict[str, str]]) -> Dict[str, Any]:
        """Format messages for the generate API.
        
        Args:
            messages: List of chat messages.
            
        Returns:
            Dictionary with prompt formatted for the generate API.
        """
        # Convert chat messages to a single prompt string
        prompt = ""
        for msg in messages:
            role = msg.get("role", "").lower()
            content = msg.get("content", "")
            
            if role == "system":
                prompt += f"System: {content}\n\n"
            elif role == "user":
                prompt += f"User: {content}\n\n"
            elif role == "assistant":
                prompt += f"Assistant: {content}\n\n"
                
        if not prompt.endswith("Assistant: "):
            prompt += "Assistant: "
            
        return {"prompt": prompt}
    
    def chat_completion(
        self, 
        model: str,
        messages: List[Dict[str, str]],
        stream: bool = True,
        temperature: float = 0.7,
        context: Optional[List[int]] = None,
        **kwargs
    ) -> Generator[Dict[str, Any], None, None] or Dict[str, Any]:
        """Generate a chat completion using the specified model.
        
        Args:
            model: The name of the model to use.
            messages: A list of messages in the conversation history.
            stream: Whether to stream the response. Default is True.
            temperature: Controls randomness of the output. Default is 0.7.
            context: Optional list of integers for context window.
            **kwargs: Additional parameters to pass to the API.
            
        Returns:
            If stream is True, returns a generator yielding response chunks.
            If stream is False, returns the complete response as a dictionary.
        """
        # First try the chat API if it exists
        if self._check_chat_api_support():
            url = f"{self.base_url}/api/chat"
            
            payload = {
                "model": model,
                "messages": messages,
                "stream": stream,
                "temperature": temperature,
                **kwargs
            }
            
            if context is not None:
                payload["context"] = context
                
            try:
                if stream:
                    response = requests.post(url, json=payload, stream=True)
                    response.raise_for_status()
                    
                    for line in response.iter_lines():
                        if line:
                            chunk = json.loads(line)
                            yield chunk
                            
                            # Check if this is the last chunk
                            if chunk.get("done", False):
                                break
                else:
                    # For non-streaming responses, don't use streaming mode
                    response = requests.post(url, json=payload)
                    response.raise_for_status()
                    return response.json()
            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 404:
                    # Chat API not supported, fallback to generate API
                    self._supports_chat_api = False
                    print(f"Chat API not supported, falling back to generate API")
                else:
                    # Other HTTP error, re-raise
                    raise
        
        # Fallback to the generate API if chat API is not supported or failed with 404
        if not self._supports_chat_api:
            url = f"{self.base_url}/api/generate"
            
            # Generate requires a prompt not messages, so we need to format them
            generate_payload = self._format_generate_payload(messages)
            
            payload = {
                "model": model,
                "stream": stream,
                "temperature": temperature,
                **generate_payload,
                **kwargs
            }
            
            if context is not None:
                payload["context"] = context
                
            if stream:
                response = requests.post(url, json=payload, stream=True)
                response.raise_for_status()
                
                for line in response.iter_lines():
                    if line:
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
            else:
                # For non-streaming responses, don't use streaming mode
                response = requests.post(url, json=payload)
                response.raise_for_status()
                result = response.json()
                
                # Convert generate response format to chat format
                return {
                    "message": {
                        "content": result.get("response", "")
                    }
                }
    
    def generate_embeddings(self, model: str, text: str) -> List[float]:
        """Generate embeddings for the given text using the specified model.
        
        Args:
            model: The name of the model to use.
            text: The text to generate embeddings for.
            
        Returns:
            A list of floats representing the embedding vector.
        """
        url = f"{self.base_url}/api/embeddings"
        
        payload = {
            "model": model,
            "prompt": text
        }
        
        response = requests.post(url, json=payload)
        response.raise_for_status()
        return response.json().get('embedding', []) 