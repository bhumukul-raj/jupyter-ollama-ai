import json
from typing import Dict, List, Any, Optional

import tornado
from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join
import requests
import datetime

from .ollama_client import OllamaClient

class OllamaBaseHandler(APIHandler):
    """Base handler for Ollama API requests."""
    
    @property
    def ollama_client(self) -> OllamaClient:
        """Get the Ollama client from the application settings."""
        return self.settings["ollama_client"]

class OllamaModelsHandler(OllamaBaseHandler):
    """Handler for listing available Ollama models."""
    
    @tornado.web.authenticated
    async def get(self):
        """Handle GET requests to list available models."""
        try:
            models = self.ollama_client.list_models()
            self.finish(json.dumps({"models": models}))
        except Exception as e:
            self.set_status(500)
            self.finish(json.dumps({"error": str(e)}))

class OllamaChatHandler(OllamaBaseHandler):
    """Handler for Ollama chat completions."""
    
    @tornado.web.authenticated
    async def post(self):
        """Handle POST requests for chat completions."""
        try:
            # Parse the request body
            body = json.loads(self.request.body.decode("utf-8"))
            model = body.get("model", "")
            messages = body.get("messages", [])
            temperature = body.get("temperature", 0.7)
            stream = body.get("stream", True)
            
            # Log request parameters for debugging
            print(f"OllamaChatHandler.post: model={model}, stream={stream}, messages={messages[:2]}...")
            
            if not model:
                self.set_status(400)
                self.finish(json.dumps({"error": "Model not specified"}))
                return
                
            if not messages:
                self.set_status(400)
                self.finish(json.dumps({"error": "No messages provided"}))
                return
            
            # Set appropriate headers for streaming if needed
            if stream:
                self.set_header("Content-Type", "text/event-stream")
                self.set_header("Cache-Control", "no-cache")
                self.set_header("Connection", "keep-alive")
                
                # Stream the response
                for chunk in self.ollama_client.chat_completion(
                    model=model,
                    messages=messages,
                    temperature=temperature,
                    stream=True
                ):
                    self.write(f"data: {json.dumps(chunk)}\n\n")
                    await self.flush()
                    
                    if chunk.get("done", False):
                        break
                        
                self.finish()
            else:
                # For non-streaming mode, call the Ollama API directly to avoid generator issues
                print("OllamaChatHandler.post: Using non-streaming mode with direct API call")
                try:
                    url = f"{self.ollama_client.base_url}/api/chat"
                    payload = {
                        "model": model,
                        "messages": messages,
                        "temperature": temperature,
                        "stream": False
                    }
                    
                    response = requests.post(url, json=payload)
                    response.raise_for_status()
                    result = response.json()
                    
                    print(f"OllamaChatHandler.post: Response type = {type(result)}, response = {str(result)[:100]}...")
                    self.finish(json.dumps(result))
                except Exception as inner_e:
                    print(f"OllamaChatHandler.post: Inner exception: {type(inner_e)} - {str(inner_e)}")
                    raise inner_e
                
        except Exception as e:
            print(f"OllamaChatHandler.post: Exception: {type(e)} - {str(e)}")
            self.set_status(500)
            self.finish(json.dumps({"error": str(e)}))

class OllamaEmbeddingsHandler(OllamaBaseHandler):
    """Handler for generating embeddings using Ollama."""
    
    @tornado.web.authenticated
    async def post(self):
        """Handle POST requests for generating embeddings."""
        try:
            # Parse the request body
            body = json.loads(self.request.body.decode("utf-8"))
            model = body.get("model", "")
            text = body.get("text", "")
            
            if not model:
                self.set_status(400)
                self.finish(json.dumps({"error": "Model not specified"}))
                return
                
            if not text:
                self.set_status(400)
                self.finish(json.dumps({"error": "No text provided"}))
                return
            
            # Generate embeddings
            embeddings = self.ollama_client.generate_embeddings(model=model, text=text)
            self.finish(json.dumps({"embeddings": embeddings}))
                
        except Exception as e:
            self.set_status(500)
            self.finish(json.dumps({"error": str(e)}))

class OllamaCellContextHandler(OllamaBaseHandler):
    """Handler for analyzing cell code using Ollama."""
    
    @tornado.web.authenticated
    async def post(self):
        """Handle POST requests for analyzing cell code."""
        try:
            # Parse the request body
            body = json.loads(self.request.body.decode("utf-8"))
            model = body.get("model", "")
            cell_content = body.get("cell_content", "")
            cell_type = body.get("cell_type", "code")
            question = body.get("question", "Explain this code")
            
            # Enhanced request logging
            print(f"OllamaCellContextHandler.post: Processing request for model={model}, cell_type={cell_type}, content_length={len(cell_content)}")
            
            if not model:
                self.set_status(400)
                self.finish(json.dumps({"error": "Model not specified"}))
                print("OllamaCellContextHandler.post: Error - Model not specified")
                return
                
            if not cell_content:
                self.set_status(400)
                self.finish(json.dumps({"error": "No cell content provided"}))
                print("OllamaCellContextHandler.post: Error - No cell content provided")
                return
            
            # Create appropriate prompt based on cell type and question
            if cell_type == "markdown":
                system_prompt = "You are an AI assistant helping with Jupyter notebooks. Analyze the following markdown content."
            else:
                system_prompt = "You are an AI assistant helping with Jupyter notebooks. Analyze the following code."
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"{question}:\n\n{cell_content}"}
            ]
            
            # Log the prepared messages
            print(f"OllamaCellContextHandler.post: Prepared messages with system prompt and user question: {question}")
            
            try:
                # Use the OllamaClient to handle API compatibility
                client = self.ollama_client
                print(f"OllamaCellContextHandler.post: Using Ollama client with base_url={client.base_url}")
                
                # First test the Ollama API directly to verify it's responsive
                try:
                    print(f"OllamaCellContextHandler.post: Testing API connection...")
                    test_url = f"{client.base_url}/api/tags"
                    test_response = requests.get(test_url, timeout=5)
                    test_response.raise_for_status()
                    print(f"OllamaCellContextHandler.post: API connection test successful, found models: {len(test_response.json().get('models', []))}")
                except Exception as test_error:
                    print(f"OllamaCellContextHandler.post: API connection test failed: {str(test_error)}")
                    raise requests.RequestException(f"Ollama API connection test failed: {str(test_error)}")
                
                # Use a timeout to prevent long-running requests - increased to 60 seconds
                result = None
                try:
                    # For cell context, always use direct API call to avoid generator issues
                    print(f"OllamaCellContextHandler.post: Making direct API call to /api/chat...")
                    
                    # Direct API call with increased timeout
                    direct_url = f"{client.base_url}/api/chat"
                    direct_payload = {
                        "model": model,
                        "messages": messages,
                        "stream": False
                    }
                    
                    print(f"OllamaCellContextHandler.post: Sending request to {direct_url}")
                    direct_response = requests.post(
                        direct_url,
                        json=direct_payload,
                        timeout=60  # Increased timeout to 60 seconds
                    )
                    
                    # Check response status
                    if direct_response.status_code == 404:
                        print(f"OllamaCellContextHandler.post: Chat API not found (404), falling back to generate API")
                        # Fallback to generate API
                        generate_url = f"{client.base_url}/api/generate"
                        prompt = f"System: {system_prompt}\n\nUser: {question}:\n\n{cell_content}\n\nAssistant:"
                        
                        generate_payload = {
                            "model": model,
                            "prompt": prompt,
                            "stream": False
                        }
                        
                        print(f"OllamaCellContextHandler.post: Sending request to {generate_url}")
                        generate_response = requests.post(
                            generate_url,
                            json=generate_payload,
                            timeout=60
                        )
                        generate_response.raise_for_status()
                        generate_result = generate_response.json()
                        
                        print(f"OllamaCellContextHandler.post: Generate API response received: {str(generate_result)[:100]}...")
                        
                        # Convert the generate response to chat format
                        result = {
                            "message": {
                                "content": generate_result.get("response", "No response")
                            }
                        }
                    else:
                        # Handle normal chat API response
                        direct_response.raise_for_status()
                        result = direct_response.json()
                        print(f"OllamaCellContextHandler.post: Chat API response received: {str(result)[:100]}...")
                    
                except requests.Timeout as timeout_error:
                    print(f"OllamaCellContextHandler.post: Request timed out after 60 seconds: {str(timeout_error)}")
                    raise requests.Timeout("Request to Ollama API timed out after 60 seconds")
                    
                except requests.RequestException as request_error:
                    print(f"OllamaCellContextHandler.post: Request error: {str(request_error)}")
                    # If there's an error with the chat API, try the generate API as fallback
                    print(f"OllamaCellContextHandler.post: Error with chat API, trying generate API as fallback")
                    
                    # Properly format the prompt for the generate API
                    prompt = f"System: {system_prompt}\n\nUser: {question}:\n\n{cell_content}\n\nAssistant:"
                    
                    generate_url = f"{client.base_url}/api/generate"
                    generate_payload = {
                        "model": model,
                        "prompt": prompt,
                        "stream": False
                    }
                    
                    try:
                        print(f"OllamaCellContextHandler.post: Sending fallback request to {generate_url}")
                        generate_response = requests.post(
                            generate_url,
                            json=generate_payload,
                            timeout=60
                        )
                        generate_response.raise_for_status()
                        generate_result = generate_response.json()
                        
                        print(f"OllamaCellContextHandler.post: Generate API response received: {str(generate_result)[:100]}...")
                        
                        # Convert the generate response to chat format
                        result = {
                            "message": {
                                "content": generate_result.get("response", "No response")
                            }
                        }
                    except Exception as fallback_error:
                        print(f"OllamaCellContextHandler.post: Fallback request failed: {str(fallback_error)}")
                        raise requests.RequestException(f"Both primary and fallback requests to Ollama API failed: {str(fallback_error)}")
                
                if not result:
                    print("OllamaCellContextHandler.post: No result received from API calls")
                    raise ValueError("No response received from Ollama API")
                
                # Ensure consistent response format
                if isinstance(result, dict):
                    # Check if result has the expected structure
                    if "message" in result and isinstance(result["message"], dict):
                        message_content = result["message"].get("content", "No response")
                        print(f"OllamaCellContextHandler.post: Extracted message content (length: {len(message_content)})")
                    else:
                        message_content = result.get("response", "No response")
                        print(f"OllamaCellContextHandler.post: Extracted response content (length: {len(message_content)})")
                    
                    self.finish(json.dumps({
                        "message": {
                            "content": message_content
                        }
                    }))
                    print("OllamaCellContextHandler.post: Response sent successfully")
                else:
                    # For any other type, convert to string
                    print(f"OllamaCellContextHandler.post: Unexpected result type: {type(result)}")
                    self.finish(json.dumps({
                        "message": {
                            "content": str(result)
                        }
                    }))
                    print("OllamaCellContextHandler.post: Stringified response sent")
                
            except requests.Timeout as timeout_error:
                print(f"OllamaCellContextHandler.post: Timeout error: {str(timeout_error)}")
                self.set_status(504)
                self.finish(json.dumps({
                    "error": f"Request to Ollama API timed out: {str(timeout_error)}"
                }))
            except requests.RequestException as request_error:
                print(f"OllamaCellContextHandler.post: Request exception: {str(request_error)}")
                self.set_status(502)
                self.finish(json.dumps({
                    "error": f"Failed to communicate with Ollama API: {str(request_error)}"
                }))
                
        except json.JSONDecodeError as e:
            print(f"OllamaCellContextHandler.post: JSON decode error: {str(e)}")
            self.set_status(400)
            self.finish(json.dumps({
                "error": f"Invalid JSON in request body: {str(e)}"
            }))
        except Exception as e:
            print(f"OllamaCellContextHandler.post: Unexpected error: {type(e).__name__}: {str(e)}")
            self.set_status(500)
            self.finish(json.dumps({
                "error": f"Internal server error: {str(e)}"
            }))

class OllamaTestHandler(OllamaBaseHandler):
    """Handler for testing direct Ollama API calls."""
    
    @tornado.web.authenticated
    async def get(self):
        """Handle GET requests for direct Ollama API testing."""
        try:
            model = self.get_argument("model", "")
            timeout = int(self.get_argument("timeout", "10"))
            
            # Enhanced diagnostic information
            diagnostics = {
                "ollama_base_url": self.ollama_client.base_url,
                "timestamp": str(datetime.datetime.now()),
                "test_results": {}
            }
            
            # Test basic connectivity with HEAD request
            try:
                head_url = f"{self.ollama_client.base_url}/api/tags"
                print(f"OllamaTestHandler.get: Testing connection to {head_url}")
                head_response = requests.head(head_url, timeout=timeout)
                diagnostics["test_results"]["head_request"] = {
                    "success": head_response.status_code < 400,
                    "status_code": head_response.status_code,
                    "url": head_url
                }
            except Exception as head_error:
                print(f"OllamaTestHandler.get: HEAD request failed: {str(head_error)}")
                diagnostics["test_results"]["head_request"] = {
                    "success": False,
                    "error": str(head_error),
                    "url": head_url
                }
            
            # Test GET request to list models
            try:
                list_url = f"{self.ollama_client.base_url}/api/tags"
                print(f"OllamaTestHandler.get: Testing GET request to {list_url}")
                list_response = requests.get(list_url, timeout=timeout)
                list_response.raise_for_status()
                models_json = list_response.json()
                diagnostics["test_results"]["list_models"] = {
                    "success": True,
                    "models_found": len(models_json.get("models", [])),
                    "response_time_ms": list_response.elapsed.total_seconds() * 1000,
                    "models": [m.get("name") for m in models_json.get("models", [])][:5]  # Just show the first 5
                }
            except Exception as list_error:
                print(f"OllamaTestHandler.get: Model list request failed: {str(list_error)}")
                diagnostics["test_results"]["list_models"] = {
                    "success": False,
                    "error": str(list_error)
                }
            
            # Test chat API if model is provided
            if model:
                try:
                    chat_url = f"{self.ollama_client.base_url}/api/chat"
                    chat_payload = {
                        "model": model,
                        "messages": [{"role": "user", "content": "Hello, can you respond with a short greeting?"}],
                        "stream": False
                    }
                    print(f"OllamaTestHandler.get: Testing chat endpoint with model {model}")
                    chat_response = requests.post(chat_url, json=chat_payload, timeout=timeout)
                    
                    if chat_response.status_code == 404:
                        print(f"OllamaTestHandler.get: Chat API not found (404)")
                        diagnostics["test_results"]["chat_request"] = {
                            "success": False,
                            "status_code": 404,
                            "error": "Chat API endpoint not found (404)"
                        }
                    else:
                        chat_response.raise_for_status()
                        chat_result = chat_response.json()
                        diagnostics["test_results"]["chat_request"] = {
                            "success": True,
                            "response_time_ms": chat_response.elapsed.total_seconds() * 1000,
                            "response_preview": str(chat_result)[:100] + "..."
                        }
                except Exception as chat_error:
                    print(f"OllamaTestHandler.get: Chat request failed: {str(chat_error)}")
                    diagnostics["test_results"]["chat_request"] = {
                        "success": False,
                        "error": str(chat_error)
                    }
                    
                # Also test generate API
                try:
                    generate_url = f"{self.ollama_client.base_url}/api/generate"
                    generate_payload = {
                        "model": model,
                        "prompt": "Hello, can you respond with a short greeting?",
                        "stream": False
                    }
                    print(f"OllamaTestHandler.get: Testing generate endpoint with model {model}")
                    generate_response = requests.post(generate_url, json=generate_payload, timeout=timeout)
                    generate_response.raise_for_status()
                    generate_result = generate_response.json()
                    diagnostics["test_results"]["generate_request"] = {
                        "success": True,
                        "response_time_ms": generate_response.elapsed.total_seconds() * 1000,
                        "response_preview": generate_result.get("response", "")[:100] + "..."
                    }
                except Exception as generate_error:
                    print(f"OllamaTestHandler.get: Generate request failed: {str(generate_error)}")
                    diagnostics["test_results"]["generate_request"] = {
                        "success": False,
                        "error": str(generate_error)
                    }
            
            # Return all diagnostic information
            self.finish(json.dumps(diagnostics))
                
        except Exception as e:
            print(f"OllamaTestHandler.get: Unexpected error: {str(e)}")
            self.set_status(500)
            self.finish(json.dumps({"error": str(e)}))
    
    @tornado.web.authenticated
    async def post(self):
        """Handle POST requests for direct chat testing."""
        try:
            # Parse the request body
            body = json.loads(self.request.body.decode("utf-8"))
            model = body.get("model", "llama3.1:8b")
            messages = body.get("messages", [{"role": "user", "content": "Hello, how are you?"}])
            
            # Call the Ollama API directly
            url = f"{self.ollama_client.base_url}/api/chat"
            payload = {
                "model": model,
                "messages": messages,
                "stream": False
            }
            
            response = requests.post(url, json=payload)
            response.raise_for_status()
            
            # Return the raw response
            self.finish(json.dumps({
                "direct_response": response.json(),
                "call_info": {
                    "url": url,
                    "payload": payload
                }
            }))
                
        except Exception as e:
            self.set_status(500)
            self.finish(json.dumps({"error": str(e)}))

def setup_handlers(web_app, ollama_client):
    """Set up the handlers for the Ollama API."""
    host_pattern = ".*$"
    base_url = web_app.settings["base_url"]
    
    # Add the Ollama client to the application settings
    web_app.settings["ollama_client"] = ollama_client
    
    # Define the routes
    handlers = [
        (url_path_join(base_url, "api", "ollama", "models"), OllamaModelsHandler),
        (url_path_join(base_url, "api", "ollama", "chat"), OllamaChatHandler),
        (url_path_join(base_url, "api", "ollama", "embeddings"), OllamaEmbeddingsHandler),
        (url_path_join(base_url, "api", "ollama", "cell-context"), OllamaCellContextHandler),
        (url_path_join(base_url, "api", "ollama", "test"), OllamaTestHandler),
    ]
    
    # Add the handlers to the web app
    web_app.add_handlers(host_pattern, handlers) 