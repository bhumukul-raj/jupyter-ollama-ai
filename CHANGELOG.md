# Changelog

All notable changes to the JupyterLab AI Assistant Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-07-31

### Added
- Initial release of JupyterLab AI Assistant Extension
- Chat interface for interacting with Ollama models
- Cell toolbar buttons for contextual AI assistance
- Support for multiple Ollama models
- Theme-aware UI that adapts to JupyterLab light/dark themes
- Responsive design for all screen sizes
- Markdown and code highlighting in AI responses
- Cell-specific contextual analysis:
  - Code explanation
  - Code optimization suggestions
  - Debugging assistance
  - Custom questions about cell content
- Model selector dropdown
- Connection testing utility

### Technical
- Python server extension connecting to Ollama API
- TypeScript/React frontend components
- Bootstrap-based responsive UI
- Full markdown support in responses
- Support for JupyterLab v3.x 