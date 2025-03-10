// Set up DOM environment for React testing
require('@testing-library/jest-dom');

// Mock for requestAnimationFrame
global.requestAnimationFrame = (callback) => {
  setTimeout(callback, 0);
};

// Mock for matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock for clipboard API
Object.defineProperty(window.navigator, 'clipboard', {
  writable: true,
  value: {
    writeText: jest.fn(),
    readText: jest.fn(),
  },
});

// Mock for JupyterLab modules
jest.mock('@jupyterlab/application', () => ({}));
jest.mock('@jupyterlab/apputils', () => ({}));
jest.mock('@jupyterlab/notebook', () => ({
  NotebookPanel: class {},
  Notebook: class {},
  CodeCell: class {},
  MarkdownCell: class {},
  INotebookTracker: {
    currentChanged: {
      connect: jest.fn()
    }
  }
}));
jest.mock('@jupyterlab/services', () => ({}));
jest.mock('@jupyterlab/ui-components', () => ({}));
jest.mock('@lumino/widgets', () => ({}));

// Mock for the global fetch
global.fetch = jest.fn();

// Mock console methods to reduce noise during tests
const originalConsoleError = console.error;
console.error = (...args) => {
  // Ignore React-specific warnings
  if (typeof args[0] === 'string' && 
      (args[0].includes('React does not recognize the') || 
       args[0].includes('Invalid prop'))) {
    return;
  }
  originalConsoleError(...args);
}; 