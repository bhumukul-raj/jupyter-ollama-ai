import { debounce, BatchProcessor, ProgressiveLoader } from '../../ollama_jupyter_ai/labextension/src/utils/performanceUtils';

// Mock timers for testing debounce and other time-based functions
jest.useFakeTimers();

describe('Performance Utils', () => {
  // Tests for debounce function
  describe('debounce', () => {
    test('should call the function after the specified wait time', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 1000);
      
      // Call debounced function
      debouncedFn();
      
      // Function should not be called immediately
      expect(mockFn).not.toHaveBeenCalled();
      
      // Fast-forward time
      jest.advanceTimersByTime(1000);
      
      // Now the function should have been called
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
    
    test('should only call the function once if called multiple times within wait period', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 1000);
      
      // Call debounced function multiple times
      debouncedFn();
      debouncedFn();
      debouncedFn();
      
      // Fast-forward time, but not completely
      jest.advanceTimersByTime(500);
      
      // Call again
      debouncedFn();
      
      // Fast-forward remaining time
      jest.advanceTimersByTime(1000);
      
      // The function should have been called only once
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
    
    test('should pass arguments to the original function', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 1000);
      
      // Call with arguments
      debouncedFn('test', 123);
      
      // Fast-forward time
      jest.advanceTimersByTime(1000);
      
      // Check if arguments were passed
      expect(mockFn).toHaveBeenCalledWith('test', 123);
    });
  });
  
  // Tests for BatchProcessor
  describe('BatchProcessor', () => {
    test('should process items in batches', async () => {
      const mockProcessor = jest.fn().mockResolvedValue(undefined);
      const batchProcessor = new BatchProcessor(mockProcessor, 3, 100);
      
      // Add items
      await batchProcessor.add('item1');
      await batchProcessor.add('item2');
      await batchProcessor.add('item3');
      
      // Should have processed the batch immediately when it reached maxBatchSize
      expect(mockProcessor).toHaveBeenCalledWith(['item1', 'item2', 'item3']);
      expect(mockProcessor).toHaveBeenCalledTimes(1);
    });
    
    test('should process remaining items after delay', async () => {
      const mockProcessor = jest.fn().mockResolvedValue(undefined);
      const batchProcessor = new BatchProcessor(mockProcessor, 3, 100);
      
      // Add items but not enough to trigger immediate processing
      await batchProcessor.add('item1');
      await batchProcessor.add('item2');
      
      // Should not process immediately
      expect(mockProcessor).not.toHaveBeenCalled();
      
      // Fast-forward time to trigger delayed processing
      jest.advanceTimersByTime(100);
      
      // Now it should have processed the batch
      expect(mockProcessor).toHaveBeenCalledWith(['item1', 'item2']);
      expect(mockProcessor).toHaveBeenCalledTimes(1);
    });
  });
  
  // Tests for ProgressiveLoader
  describe('ProgressiveLoader', () => {
    test('should load items in batches', () => {
      const items = ['item1', 'item2', 'item3', 'item4', 'item5'];
      const mockLoadCallback = jest.fn();
      const loader = new ProgressiveLoader(items, 2, mockLoadCallback);
      
      // Load first batch
      const hasMore1 = loader.loadNext();
      
      // Should have called the callback with first batch
      expect(mockLoadCallback).toHaveBeenCalledWith(['item1', 'item2']);
      expect(hasMore1).toBe(true);
      
      // Load second batch
      const hasMore2 = loader.loadNext();
      
      // Should have called the callback with second batch
      expect(mockLoadCallback).toHaveBeenCalledWith(['item3', 'item4']);
      expect(hasMore2).toBe(true);
      
      // Load third batch
      const hasMore3 = loader.loadNext();
      
      // Should have called the callback with third batch
      expect(mockLoadCallback).toHaveBeenCalledWith(['item5']);
      expect(hasMore3).toBe(false); // No more items
    });
    
    test('should report correct progress', () => {
      const items = ['item1', 'item2', 'item3', 'item4'];
      const mockLoadCallback = jest.fn();
      const loader = new ProgressiveLoader(items, 2, mockLoadCallback);
      
      // Initial progress should be 0
      expect(loader.progress).toBe(0);
      
      // Load first batch
      loader.loadNext();
      
      // Progress should be 0.5 (2/4)
      expect(loader.progress).toBe(0.5);
      
      // Load second batch
      loader.loadNext();
      
      // Progress should be 1.0 (4/4)
      expect(loader.progress).toBe(1);
    });
    
    test('should reset correctly', () => {
      const items = ['item1', 'item2', 'item3', 'item4'];
      const mockLoadCallback = jest.fn();
      const loader = new ProgressiveLoader(items, 2, mockLoadCallback);
      
      // Load first batch
      loader.loadNext();
      
      // Progress should be 0.5
      expect(loader.progress).toBe(0.5);
      
      // Reset
      loader.reset();
      
      // Progress should be 0 again
      expect(loader.progress).toBe(0);
      
      // Should be able to load from the beginning
      loader.loadNext();
      expect(mockLoadCallback).toHaveBeenCalledWith(['item1', 'item2']);
    });
  });
}); 