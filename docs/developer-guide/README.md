# Developer Guide

This guide provides information for developers who want to understand, modify, or contribute to the Ollama JupyterLab AI Assistant extension.

## Contents

- [Architecture Overview](architecture.md): High-level overview of the extension's architecture
- [Project Structure](project-structure.md): Explanation of the project's directory and file structure
- [Development Environment](development-environment.md): Setting up a development environment
- [Building and Testing](building-testing.md): How to build and test the extension
- [Component Reference](component-reference.md): Detailed information about React components
- [State Management](state-management.md): How state is managed in the application
- [API Integration](api-integration.md): How the extension interacts with Ollama API
- [Styling Guide](styling-guide.md): CSS architecture and styling approach
- [Contributing](contributing.md): Guidelines for contributing to the project
- [Performance Optimizations](performance-optimizations.md): Utilities for improving performance
- [Error Handling & Recovery](error-handling.md): Robust error handling mechanisms

## Recent Improvements

The extension has been enhanced with several new features:

1. **Performance Optimizations**: 
   - Debouncing for API requests
   - Batch processing for multiple operations
   - Web Worker support for heavy computations
   - Progressive loading for large datasets
   
2. **Error Handling & Recovery**:
   - Connection health monitoring
   - Automatic reconnection
   - Detailed error diagnostics
   - User-friendly recovery options
   
3. **User Experience Enhancements**:
   - Setup wizard for first-time users
   - Code preview with syntax highlighting
   - Diff view for code changes
   - Progress indicators for long operations
   - Undo/redo functionality

## Tech Stack

The Ollama JupyterLab AI Assistant is built using the following technologies:

- **TypeScript**: The primary programming language
- **React**: For building the user interface
- **JupyterLab Extension API**: For integrating with JupyterLab
- **Ollama API**: For interacting with Ollama models

## Architecture Overview

The extension follows a component-based architecture with these main parts:

1. **Extension Core**: Handles JupyterLab integration (widget.tsx, index.ts)
2. **React Components**: The UI components (components/*.tsx)
3. **Context Provider**: Manages state and business logic (context/AIAssistantContext.tsx)
4. **Service Layer**: Communicates with Ollama (services/OllamaService.ts)
5. **Hooks**: Custom React hooks for data and behavior (hooks/*.ts)
6. **Utilities**: Helper functions and formatting tools (utils/*.ts)

## Getting Started with Development

To get started with development:

1. Set up your development environment following the [Development Environment](development-environment.md) guide.
2. Understand the [Project Structure](project-structure.md) to navigate the codebase.
3. Make changes following the guidelines in [Contributing](contributing.md).
4. Build and test your changes as described in [Building and Testing](building-testing.md).

## Code Style and Conventions

The project follows these conventions:

- **Component Files**: Each React component is in its own file, named after the component
- **Context Files**: Context providers are in the `context` directory
- **Service Files**: Service classes are in the `services` directory
- **Hook Files**: Custom hooks are in the `hooks` directory
- **Style Files**: CSS files are in the `style` directory
- **Type Definitions**: TypeScript interfaces and types are defined near where they're used

## Pull Request Guidelines

When submitting a pull request:

1. Ensure it addresses a specific issue or adds a well-defined feature
2. Include tests for new functionality
3. Update documentation as needed
4. Follow the code style of the project
5. Keep changes focused and minimal

For more details, see the [Contributing](contributing.md) guide. 