# Testing the Ollama JupyterLab AI Assistant

This directory contains tests for the Ollama JupyterLab AI Assistant extension. The tests are written using Jest and React Testing Library.

## Test Structure

The tests are organized into the following directories:

- `components/`: Tests for React components
- `services/`: Tests for service classes
- `utils/`: Tests for utility functions
- `mocks/`: Mock implementations used by tests

## Running Tests

To run the tests, you need to have the development dependencies installed:

```bash
# Install dependencies
yarn install
```

Then you can run the tests using the following commands:

### Run all tests

```bash
yarn test
```

### Run tests in watch mode (for development)

```bash
yarn test:watch
```

### Generate coverage report

```bash
yarn test:coverage
```

## Writing Tests

When writing tests, follow these guidelines:

1. **Component Tests**:
   - Test rendering, user interactions, and state changes
   - Isolate components from their dependencies using mocks
   - Focus on behavior, not implementation details

2. **Service Tests**:
   - Test the public API of service classes
   - Mock external dependencies (e.g., axios, browser APIs)
   - Test error handling and edge cases

3. **Utility Tests**:
   - Test each function with various inputs
   - Ensure edge cases are covered
   - Test with both valid and invalid inputs

## Mocking Guidelines

- Mock external services and APIs
- When testing components, mock context providers and service classes
- Use `jest.mock()` for module-level mocking
- Use Jest's timer mocks for testing time-dependent code

Example of mocking a service:

```typescript
// Mock the health service
jest.mock('../../ollama_jupyter_ai/labextension/src/services/OllamaHealthService');

// Set up mock implementations
(OllamaHealthService as jest.MockedClass<typeof OllamaHealthService>).mockImplementation(() => ({
  testConnection: jest.fn().mockResolvedValue({ isConnected: true }),
  // ...other methods
}));
```

## Test Coverage

The test suite aims to maintain high coverage of the codebase, focusing on:

1. **Functionality**: Ensure all features work as expected
2. **Error handling**: Properly handle edge cases and errors
3. **User interactions**: Test all possible user interactions

Coverage reports are generated with `yarn test:coverage` and can be found in the `coverage/` directory. 