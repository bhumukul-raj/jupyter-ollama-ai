import { useState, useEffect, useCallback } from 'react';
import { OllamaService } from '../services/OllamaService';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  status?: 'loading' | 'error' | 'complete';
  timestamp?: {
    start?: number;
    end?: number;
  };
  fromCache?: boolean;
  requestId?: string;
}

interface UseOllamaApiOptions {
  baseUrl?: string;
  defaultModel?: string;
  cacheTTL?: number;
}

export const useOllamaApi = (options: UseOllamaApiOptions = {}) => {
  const [ollamaService] = useState(() => new OllamaService(
    options.baseUrl,
    options.defaultModel
  ));
  
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(options.defaultModel || 'mistral');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch available models
  const fetchModels = useCallback(async () => {
    try {
      setError(null);
      const availableModels = await ollamaService.getAvailableModels();
      setModels(availableModels);
      
      // If the currently selected model is not available, select the first one
      if (availableModels.length > 0 && !availableModels.includes(selectedModel)) {
        setSelectedModel(availableModels[0]);
      }
    } catch (err) {
      console.error('Error fetching models:', err);
      setError('Failed to fetch available models');
      setModels([]);
    }
  }, [ollamaService, selectedModel]);
  
  // Initial model fetch
  useEffect(() => {
    fetchModels();
  }, [fetchModels]);
  
  // Generate chat response
  const generateChatResponse = useCallback(async (
    userMessage: string,
    notebookContent?: string,
    onUpdate?: (partialResponse: string, done: boolean) => void,
    requestId?: string
  ): Promise<{ requestId: string; response: string; fromCache: boolean }> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Generate a unique request ID if not provided
      const actualRequestId = requestId || `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      
      // Start streaming the response
      const response = await ollamaService.generateResponse(
        userMessage,
        selectedModel,
        notebookContent,
        onUpdate,
        actualRequestId
      );
      
      // Check if response came from cache
      const fromCache = response.includes('__FROM_CACHE__');
      const cleanResponse = response.replace('__FROM_CACHE__', '');
      
      return { requestId: actualRequestId, response: cleanResponse, fromCache: !!fromCache };
    } catch (err) {
      console.error('Error generating response:', err);
      setError('Failed to generate response');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [ollamaService, selectedModel]);
  
  // Analyze code
  const analyzeCode = useCallback(async (
    code: string,
    onUpdate?: (partialResponse: string, done: boolean) => void
  ): Promise<{ requestId: string; analysis: string; fromCache: boolean }> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Generate a unique request ID
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      
      // Call the analyze code method
      const analysis = await ollamaService.analyzeCode(
        code,
        selectedModel,
        onUpdate,
        requestId
      );
      
      // Check if response came from cache
      const fromCache = analysis.includes('__FROM_CACHE__');
      const cleanAnalysis = analysis.replace('__FROM_CACHE__', '');
      
      return { requestId, analysis: cleanAnalysis, fromCache: !!fromCache };
    } catch (err) {
      console.error('Error analyzing code:', err);
      setError('Failed to analyze code');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [ollamaService, selectedModel]);
  
  // Improve code
  const improveCode = useCallback(async (
    code: string,
    onUpdate?: (partialResponse: string, done: boolean) => void
  ): Promise<{ requestId: string; improvement: string; fromCache: boolean }> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Generate a unique request ID
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      
      // Call the improve code method
      const improvement = await ollamaService.suggestCodeImprovements(
        code,
        selectedModel,
        onUpdate,
        requestId
      );
      
      // Check if response came from cache
      const fromCache = improvement.includes('__FROM_CACHE__');
      const cleanImprovement = improvement.replace('__FROM_CACHE__', '');
      
      return { requestId, improvement: cleanImprovement, fromCache: !!fromCache };
    } catch (err) {
      console.error('Error improving code:', err);
      setError('Failed to generate code improvements');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [ollamaService, selectedModel]);
  
  // Cancel an ongoing request
  const cancelRequest = useCallback((requestId?: string) => {
    if (!requestId) {
      // Avoid excessive logging
      setIsLoading(false);
      return;
    }
    
    // Use minimal logging
    try {
      ollamaService.cancelRequest(requestId);
      setIsLoading(false);
    } catch (error) {
      console.error('Error canceling request');
      setIsLoading(false);
    }
  }, [ollamaService]);
  
  // Get active requests
  const getActiveRequests = useCallback((): string[] => {
    return ollamaService.getActiveRequests();
  }, [ollamaService]);
  
  return {
    models,
    selectedModel,
    setSelectedModel,
    isLoading,
    error,
    fetchModels,
    generateChatResponse,
    analyzeCode,
    improveCode,
    cancelRequest,
    getActiveRequests
  };
};

export default useOllamaApi; 