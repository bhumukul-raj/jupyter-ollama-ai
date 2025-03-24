import json
import re
import html
from typing import Dict, List, Any, Optional
import concurrent.futures
import asyncio

import tornado
from tornado import web
from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join
import requests
import datetime

from .ollama_client import OllamaClient, DEFAULT_TIMEOUT, DEFAULT_LONG_TIMEOUT
from .config import OllamaConfig

MAX_MESSAGE_LENGTH = 32000  # Limit message length to prevent excessive resource usage
MAX_RESPONSE_CHUNK_SIZE = 4096  # Split large responses into chunks
CELL_CONTEXT_TIMEOUT = 180  # 3 minutes for cell context analysis

# Thread pool for background processing
executor = concurrent.futures.ThreadPoolExecutor(max_workers=4)

class OllamaBaseHandler(APIHandler):
    """Base handler for Ollama API requests."""
    
    def initialize(self, ollama_client=None):
        if ollama_client is not None:
            self.settings["ollama_client"] = ollama_client
        elif "ollama_client" not in self.settings and hasattr(self.application, "settings"):
            # Try to get the ollama_client from application settings as fallback
            self.settings["ollama_client"] = self.application.settings.get("ollama_client")
        
        # Get config from application
        self.settings["ollama_config"] = OllamaConfig(config=self.application.settings.get('config', {}))
        
        # Store config values in settings
        self.settings["max_response_chunk_size"] = self.config.max_response_chunk_size
        self.settings["enable_response_pagination"] = self.config.enable_response_pagination
    
    @property
    def ollama_client(self) -> OllamaClient:
        """Get the Ollama client from the application settings."""
        return self.settings["ollama_client"]
        
    @property
    def config(self) -> OllamaConfig:
        """Get the Ollama configuration."""
        return self.settings.get("ollama_config", OllamaConfig(config=self.application.settings.get('config', {})))
    
    @property
    def max_response_chunk_size(self) -> int:
        """Get the maximum response chunk size from config."""
        return self.settings.get("max_response_chunk_size", MAX_RESPONSE_CHUNK_SIZE)
    
    @property
    def enable_response_pagination(self) -> bool:
        """Check if response pagination is enabled."""
        return self.settings.get("enable_response_pagination", True)
    
    def validate_input(self, data, required_fields=None):
        """Validate input data and sanitize it.
        
        Args:
            data: The input data to validate
            required_fields: List of required field names
            
        Returns:
            Sanitized data
            
        Raises:
            ValueError: If required fields are missing or validation fails
        """
        if required_fields:
            for field in required_fields:
                if field not in data:
                    raise ValueError(f"Missing required field: {field}")
                    
        # Create a copy of data for sanitization
        sanitized = {}
        
        for key, value in data.items():
            # Sanitize string values
            if isinstance(value, str):
                # Trim excessively long inputs
                if len(value) > MAX_MESSAGE_LENGTH:
                    print(f"Warning: Truncating excessively long input for field {key} from {len(value)} to {MAX_MESSAGE_LENGTH} characters")
                    value = value[:MAX_MESSAGE_LENGTH]
                
                # Escape HTML to prevent injection
                value = html.escape(value)
                
            # Recursively sanitize lists and dictionaries
            elif isinstance(value, list):
                value = [self.validate_input(item) if isinstance(item, dict) else item for item in value]
            elif isinstance(value, dict):
                value = self.validate_input(value)
                
            sanitized[key] = value
            
        return sanitized
        
    def paginate_response(self, content, chunk_size=MAX_RESPONSE_CHUNK_SIZE):
        """Split large responses into chunks to avoid memory issues.
        
        Args:
            content: The content to paginate
            chunk_size: Maximum size of each chunk
            
        Returns:
            List of content chunks
        """
        # Use the configured chunk size if available
        if hasattr(self, 'max_response_chunk_size'):
            chunk_size = self.max_response_chunk_size
            
        # Skip pagination if it's disabled or content is small enough
        if hasattr(self, 'enable_response_pagination') and not self.enable_response_pagination:
            return [content]
            
        if not isinstance(content, str) or len(content) <= chunk_size:
            return [content]
            
        # Split into chunks, maintaining paragraph integrity where possible
        chunks = []
        current_pos = 0
        
        while current_pos < len(content):
            end_pos = min(current_pos + chunk_size, len(content))
            
            # Try to break at paragraph
            if end_pos < len(content):
                paragraph_break = content.rfind("\n\n", current_pos, end_pos)
                if paragraph_break != -1 and paragraph_break > current_pos + chunk_size // 2:
                    end_pos = paragraph_break + 2  # Include the newlines
                else:
                    # Try to break at sentence
                    sentence_break = content.rfind(". ", current_pos, end_pos)
                    if sentence_break != -1 and sentence_break > current_pos + chunk_size // 2:
                        end_pos = sentence_break + 2  # Include the period and space
            
            chunks.append(content[current_pos:end_pos])
            current_pos = end_pos
            
        return chunks
    
    def is_data_science_content(self, content, cell_type="code"):
        """Check if the content is related to data science.
        
        Args:
            content: The content to check
            cell_type: The type of cell (code or markdown)
            
        Returns:
            Boolean indicating if content is data science related
        """
        # For markdown cells, use a simpler check
        if cell_type == "markdown":
            return False
            
        # Keywords that suggest data science code
        ds_keywords = [
            'pandas', 'numpy', 'matplotlib', 'seaborn', 'sklearn', 'tensorflow', 
            'pytorch', 'keras', 'pd.', 'np.', 'plt.', 'sns.', 'tf.', 
            'dataframe', 'series', 'array', 'plot(', 'scatterplot', 'heatmap',
            'model.fit', 'predict', 'train_test_split'
        ]
        
        content_lower = content.lower()
        # Check for data science imports
        has_ds_import = any(f"import {lib}" in content_lower for lib in ['pandas', 'numpy', 'matplotlib', 'seaborn', 'sklearn', 'tensorflow', 'keras'])
        # Check for common data science aliases
        has_ds_alias = any(f"import {lib} as " in content_lower for lib in ['pandas', 'numpy', 'matplotlib', 'seaborn', 'sklearn', 'tensorflow'])
        # Check for direct use of data science functions
        has_ds_functions = any(kw in content_lower for kw in ds_keywords)
        
        return has_ds_import or has_ds_alias or has_ds_functions

class OllamaModelsHandler(OllamaBaseHandler):
    """Handler for listing available Ollama models."""
    
    @tornado.web.authenticated
    async def get(self):
        """Handle GET requests for listing models."""
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
            print("OllamaChatHandler.post: Starting handler with new message")
            # Parse request body
            body = json.loads(self.request.body)
            
            # Validate and sanitize input
            try:
                body = self.validate_input(body, required_fields=["model", "messages"])
            except ValueError as validation_error:
                self.set_status(400)
                self.finish(json.dumps({"error": str(validation_error)}))
                return
            
            # Extract parameters
            model = body.get("model", "")
            messages = body.get("messages", [])
            temperature = float(body.get("temperature", 0.7))
            stream = body.get("stream", False)
            
            print(f"OllamaChatHandler.post: Processing request for model={model}, stream={stream}, msgs={len(messages)}")
            
            # Validate model name to prevent injection
            if not re.match(r'^[a-zA-Z0-9_\-:.]+$', model):
                self.set_status(400)
                self.finish(json.dumps({"error": "Invalid model name format"}))
                return
                
            # Validate messages structure
            filtered_messages = []
            for msg in messages:
                if not isinstance(msg, dict) or "role" not in msg or "content" not in msg:
                    self.set_status(400)
                    self.finish(json.dumps({"error": "Invalid message format: each message must have 'role' and 'content'"}))
                    return
                    
                role = msg.get("role", "")
                if role not in ["system", "user", "assistant"]:
                    self.set_status(400)
                    self.finish(json.dumps({"error": f"Invalid role: {role}. Must be one of 'system', 'user', or 'assistant'"}))
                    return
                
                # Only include messages with content
                if msg.get("content", "").strip():
                    filtered_messages.append(msg)
                else:
                    # For empty assistant messages, exclude them to avoid issues
                    if role != "assistant":
                        filtered_messages.append(msg)
                        
            # Use filtered messages for the actual API call
            if not filtered_messages:
                self.set_status(400)
                self.finish(json.dumps({"error": "No valid messages provided after filtering empty content"}))
                return
                
            print(f"OllamaChatHandler.post: Using {len(filtered_messages)} filtered messages out of {len(messages)} original messages")
            
            # For debugging, log the first and last message content (truncated)
            if filtered_messages:
                first_msg = filtered_messages[0]
                print(f"OllamaChatHandler.post: First message - role={first_msg.get('role')}, content={first_msg.get('content', '')[:30]}...")
                
                if len(filtered_messages) > 1:
                    last_msg = filtered_messages[-1]
                    print(f"OllamaChatHandler.post: Last message - role={last_msg.get('role')}, content={last_msg.get('content', '')[:30]}...")
            
            # Check if this is likely a data science query to adjust timeouts
            is_data_science = False
            for msg in reversed(filtered_messages):
                if msg.get('role') == 'user':
                    content = msg.get('content', '')
                    is_data_science = self.is_data_science_content(content)
                    break
                    
            # Set appropriate timeout based on content type
            timeout = DEFAULT_LONG_TIMEOUT if is_data_science else DEFAULT_TIMEOUT
            print(f"OllamaChatHandler.post: Using timeout of {timeout}s (data science: {is_data_science})")
            
            # Set appropriate headers for streaming if needed
            if stream:
                self.set_header("Content-Type", "text/event-stream")
                self.set_header("Cache-Control", "no-cache")
                self.set_header("Connection", "keep-alive")
                
                # Stream the response
                for chunk in self.ollama_client.chat_completion(
                    model=model,
                    messages=filtered_messages,
                    temperature=temperature,
                    stream=True,
                    timeout=timeout
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
                    result = None
                    try:
                        print("OllamaChatHandler.post: Calling chat_completion with filtered messages")
                        result = self.ollama_client.chat_completion(
                            model=model,
                            messages=filtered_messages,
                            temperature=temperature,
                            stream=False,
                            timeout=timeout
                        )
                        print(f"OllamaChatHandler.post: Initial result received with type={type(result)}")
                    except Exception as api_error:
                        print(f"OllamaChatHandler.post: API error: {type(api_error)} - {str(api_error)}")
                        # Try a direct API call if needed
                        try:
                            print(f"OllamaChatHandler.post: Attempting direct API call as fallback")
                            url = f"{self.ollama_client.base_url}/api/chat"
                            payload = {
                                "model": model,
                                "messages": filtered_messages,
                                "stream": False,
                                "temperature": temperature
                            }
                            response = requests.post(url, json=payload, timeout=timeout)
                            response.raise_for_status()
                            result = response.json()
                            print(f"OllamaChatHandler.post: Direct API call successful, got result type={type(result)}")
                        except requests.exceptions.Timeout:
                            print(f"OllamaChatHandler.post: Direct API call timed out after {timeout}s")
                            result = {
                                "message": {
                                    "content": "[The model took too long to respond. For complex data science queries, try using the 'Analyze cell' feature which is optimized for longer processing times.]"
                                }
                            }
                        except Exception as direct_error:
                            print(f"OllamaChatHandler.post: Direct API fallback failed: {str(direct_error)}")
                            raise ValueError(f"Both client and direct API calls failed: {str(direct_error)}")
                    
                    # Check if result is a generator (which would be an error for non-streaming)
                    if hasattr(result, '__iter__') and hasattr(result, '__next__'):
                        print("OllamaChatHandler.post: Warning - received generator when stream=False")
                        # Consume the generator to get the final result
                        final_content = ""
                        try:
                            for chunk in result:
                                if isinstance(chunk, dict):
                                    if 'message' in chunk and 'content' in chunk['message']:
                                        content = chunk['message']['content']
                                        if content is not None:
                                            final_content += content
                            
                            print(f"OllamaChatHandler.post: Successfully consumed generator, got content length: {len(final_content)}")
                            result = {
                                "message": {
                                    "content": final_content
                                }
                            }
                        except Exception as gen_error:
                            print(f"OllamaChatHandler.post: Error consuming generator: {str(gen_error)}")
                            self.set_status(500)
                            self.finish(json.dumps({"error": f"Failed to process response generator: {str(gen_error)}"}))
                            return
                    
                    # Ensure we always have a valid result structure
                    if result is None:
                        print("OllamaChatHandler.post: Result is None, providing empty response")
                        result = {
                            "message": {
                                "content": ""
                            }
                        }
                    elif not isinstance(result, dict) or 'message' not in result:
                        print(f"OllamaChatHandler.post: Invalid result structure: {str(result)[:100]}...")
                        result = {
                            "message": {
                                "content": str(result) if result is not None else ""
                            }
                        }
                    
                    # Ensure message always has content field
                    if 'message' in result:
                        if not isinstance(result['message'], dict) or 'content' not in result['message']:
                            print(f"OllamaChatHandler.post: Invalid message structure: {str(result)[:100]}...")
                            result['message'] = {
                                "content": str(result.get('message', "")) if result.get('message') is not None else ""
                            }
                        elif result['message'].get('content') is None:
                            result['message']['content'] = ""
                    
                    print(f"OllamaChatHandler.post: Final response type = {type(result)}, content length = {len(str(result.get('message', {}).get('content', '')))}")
                    self.finish(json.dumps(result))
                except Exception as inner_e:
                    print(f"OllamaChatHandler.post: Inner exception: {type(inner_e)} - {str(inner_e)}")
                    self.set_status(500)
                    self.finish(json.dumps({"error": str(inner_e)}))
                
        except json.JSONDecodeError as e:
            self.set_status(400)
            self.finish(json.dumps({"error": f"Invalid JSON in request body: {str(e)}"}))
        except Exception as e:
            print(f"OllamaChatHandler.post: Exception: {type(e)} - {str(e)}")
            self.set_status(500)
            self.finish(json.dumps({"error": str(e)}))

class OllamaEmbeddingsHandler(OllamaBaseHandler):
    """Handler for generating embeddings with Ollama."""
    
    @tornado.web.authenticated
    async def post(self):
        """Handle POST requests for generating embeddings."""
        try:
            # Parse request body
            body = json.loads(self.request.body)
            
            # Validate and sanitize input
            try:
                body = self.validate_input(body, required_fields=["model", "text"])
            except ValueError as validation_error:
                self.set_status(400)
                self.finish(json.dumps({"error": str(validation_error)}))
                return
            
            # Extract parameters
            model = body.get("model", "")
            text = body.get("text", "")
            
            # Validate model name to prevent injection
            if not re.match(r'^[a-zA-Z0-9_\-:.]+$', model):
                self.set_status(400)
                self.finish(json.dumps({"error": "Invalid model name format"}))
                return
            
            # Generate embeddings
            try:
                embeddings = self.ollama_client.generate_embeddings(model, text)
                self.finish(json.dumps({"embedding": embeddings}))
            except Exception as e:
                self.set_status(500)
                self.finish(json.dumps({"error": f"Failed to generate embeddings: {str(e)}"}))
                
        except json.JSONDecodeError as e:
            self.set_status(400)
            self.finish(json.dumps({"error": f"Invalid JSON in request body: {str(e)}"}))
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
            
            # Check if content is data science related to adjust timeout
            is_data_science = self.is_data_science_content(cell_content, cell_type)
            timeout = CELL_CONTEXT_TIMEOUT if is_data_science else DEFAULT_LONG_TIMEOUT
            print(f"OllamaCellContextHandler.post: Using timeout of {timeout}s (data science: {is_data_science})")
            
            # Create appropriate prompt based on cell type and question
            if cell_type == "markdown":
                system_prompt = "You are an AI assistant helping with Jupyter notebooks. Analyze the following markdown content."
            else:
                if is_data_science:
                    system_prompt = "You are an AI assistant specializing in data science and Jupyter notebooks. Analyze the following code with focus on data science libraries like pandas, numpy, matplotlib, scikit-learn, etc."
                else:
                    system_prompt = "You are an AI assistant helping with Jupyter notebooks. Analyze the following code."
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"{question}:\n\n{cell_content}"}
            ]
            
            # Log the prepared messages
            print(f"OllamaCellContextHandler.post: Prepared messages with system prompt and user question: {question}")
            
            # Process in a separate thread to avoid blocking the event loop
            def process_request():
                try:
                    # Use the OllamaClient to handle API compatibility
                    client = self.ollama_client
                    print(f"OllamaCellContextHandler.post: Using Ollama client with base_url={client.base_url}")
                    
                    # First test the Ollama API directly to verify it's responsive
                    try:
                        test_url = f"{client.base_url}/api/tags"
                        test_response = requests.get(test_url, timeout=10)
                        test_response.raise_for_status()
                        
                        # Direct API call with optimized session
                        session = requests.Session()
                        direct_url = f"{client.base_url}/api/chat"
                        direct_payload = {
                            "model": model,
                            "messages": messages,
                            "stream": False
                        }
                        
                        try:
                            # First try the chat API
                            direct_response = session.post(
                                direct_url,
                                json=direct_payload,
                                timeout=timeout
                            )
                            
                            # Check response status
                            if direct_response.status_code == 404:
                                # Fallback to generate API
                                generate_url = f"{client.base_url}/api/generate"
                                prompt = f"System: {system_prompt}\n\nUser: {question}:\n\n{cell_content}\n\nAssistant:"
                                
                                generate_payload = {
                                    "model": model,
                                    "prompt": prompt,
                                    "stream": False
                                }
                                
                                generate_response = session.post(
                                    generate_url,
                                    json=generate_payload,
                                    timeout=timeout
                                )
                                generate_response.raise_for_status()
                                generate_result = generate_response.json()
                                
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
                        
                            # Ensure consistent response format
                            if isinstance(result, dict):
                                # Check if result has the expected structure
                                if "message" in result and isinstance(result["message"], dict):
                                    message_content = result["message"].get("content", "No response")
                                else:
                                    message_content = result.get("response", "No response")
                                    
                                return {"message": {"content": message_content}}
                            else:
                                # For any other type, convert to string
                                return {"message": {"content": str(result)}}
                                
                        except requests.exceptions.Timeout:
                            return {
                                "error": "Request timed out. This may be due to complex code or high server load. Try simplifying your query or try again later."
                            }
                        except Exception as e:
                            return {"error": str(e)}
                    except Exception as e:
                        return {"error": f"Failed to connect to Ollama API: {str(e)}"}
                except Exception as e:
                    return {"error": str(e)}
            
            # Run the API request in a background thread
            result = await tornado.ioloop.IOLoop.current().run_in_executor(
                executor, process_request
            )
            
            # Handle any errors
            if "error" in result:
                self.set_status(500)
                self.finish(json.dumps({"error": result["error"]}))
                return
                
            # Return the result
            self.finish(json.dumps(result))
                
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
            timeout = int(self.get_argument("timeout", "30"))  # Increased default timeout
            
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
                session = requests.Session()
                head_response = session.head(head_url, timeout=timeout)
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
                session = requests.Session()
                list_response = session.get(list_url, timeout=timeout)
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
                    session = requests.Session()
                    chat_response = session.post(chat_url, json=chat_payload, timeout=timeout)
                    
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
                    session = requests.Session()
                    generate_response = session.post(generate_url, json=generate_payload, timeout=timeout)
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
            
            # Call the Ollama API directly with increased timeout
            url = f"{self.ollama_client.base_url}/api/chat"
            payload = {
                "model": model,
                "messages": messages,
                "stream": False
            }
            
            session = requests.Session()
            response = session.post(url, json=payload, timeout=60)
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

def setup_handlers(web_app, ollama_client, config=None):
    """Set up the handlers for the Ollama API.
    
    Args:
        web_app: The Jupyter web application
        ollama_client: The Ollama client instance
        config: The Ollama configuration (optional)
    """
    host_pattern = ".*$"
    base_url = web_app.settings["base_url"]
    
    # Add the Ollama client to the application settings
    web_app.settings["ollama_client"] = ollama_client
    
    # Add the Ollama configuration if provided
    if config:
        web_app.settings["ollama_config"] = config
    
    # Define the routes
    handlers = [
        (url_path_join(base_url, "api", "ollama", "models"), OllamaModelsHandler, dict(ollama_client=ollama_client)),
        (url_path_join(base_url, "api", "ollama", "chat"), OllamaChatHandler, dict(ollama_client=ollama_client)),
        (url_path_join(base_url, "api", "ollama", "embeddings"), OllamaEmbeddingsHandler, dict(ollama_client=ollama_client)),
        (url_path_join(base_url, "api", "ollama", "cell-context"), OllamaCellContextHandler, dict(ollama_client=ollama_client)),
        (url_path_join(base_url, "api", "ollama", "test"), OllamaTestHandler, dict(ollama_client=ollama_client)),
    ]
    
    # Add the handlers to the web app
    web_app.add_handlers(host_pattern, handlers) 