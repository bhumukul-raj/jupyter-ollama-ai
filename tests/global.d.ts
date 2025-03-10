// Global Jest declarations
import '@testing-library/jest-dom';

// Extend the Expect interface for testing-library matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveTextContent(text: string | RegExp): R;
      toHaveClass(className: string): R;
      toBeDisabled(): R;
      toBeEnabled(): R;
      toBeVisible(): R;
      toBeChecked(): R;
      toHaveValue(value: any): R;
      toHaveFocus(): R;
      toHaveStyle(style: Record<string, any>): R;
    }
    
    // For the timer mocks
    function useFakeTimers(): void;
    function useRealTimers(): void;
    function advanceTimersByTime(ms: number): void;
    function clearAllTimers(): void;
    
    // For mocking
    function mock(moduleName: string, factory?: any): void;
    function clearAllMocks(): void;
    function resetAllMocks(): void;
    function restoreAllMocks(): void;
    function fn<T = any>(): jest.Mock<T>;
    
    // For module mocking
    type MockedClass<T> = {
      [P in keyof T]: T[P] extends (...args: any[]) => any 
        ? jest.Mock<ReturnType<T[P]>, Parameters<T[P]>> 
        : T[P];
    } & {
      prototype: T;
      new (...args: any[]): T;
    };
    
    interface Mock<T = any, Y extends any[] = any[]> {
      (...args: Y): T;
      mock: {
        calls: Y[];
        instances: T[];
        invocationCallOrder: number[];
        results: { type: string; value: T }[];
        lastCall: Y;
      };
      mockClear(): void;
      mockReset(): void;
      mockRestore(): void;
      mockImplementation(fn: (...args: Y) => T): this;
      mockImplementationOnce(fn: (...args: Y) => T): this;
      mockReturnValue(value: T): this;
      mockReturnValueOnce(value: T): this;
      mockResolvedValue(value: Awaited<T>): this;
      mockResolvedValueOnce(value: Awaited<T>): this;
      mockRejectedValue(value: any): this;
      mockRejectedValueOnce(value: any): this;
    }
  }
} 