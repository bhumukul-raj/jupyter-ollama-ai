# Changelog

All notable changes to the JupyterLab AI Assistant Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.2] - 2024-08-01

### Bug Fixes
- cell button response dialog is shifting its position [FIXED].

### Improvements
- **Modern UI Redesign**: Completely revamped cell analysis dialog with a stylish, contemporary look
- **Responsive Design**: 
  - Added responsive width handling with proper media queries for all screen sizes
  - Enhanced mobile and tablet support with flexible layouts
  - Improved scaling behavior for small screens
- **Theme Consistency**: 
  - Fixed hardcoded colors and implemented proper JupyterLab theme variable usage
  - Enhanced dark mode support with consistent styling
  - Resolved Bootstrap integration conflicts with JupyterLab's native styling
- **Loading Indicators**: 
  - Improved loading spinner with better visual feedback
  - Added estimated time remaining for data science operations
  - Enhanced progress indicators for long-running operations
- **Accessibility Enhancements**:
  - Added proper semantic structure to dialog components
  - Improved color contrast ratios for better readability
  - Enhanced focus states for interactive elements
- **UI Performance**:
  - Optimized animations for dialog display/hide with smooth transitions
  - Improved scrolling performance for large result sets
  - Added custom scrollbar styling for better usability
- **Browser Compatibility**:
  - Added fallbacks for CSS variables in older browsers
  - Fixed browser-specific CSS properties for cross-browser consistency
  - Added vendor prefixes where needed
- **Visual Polish**:
  - Enhanced code blocks with better highlighting and shadows
  - Improved table styling with sticky headers and better spacing
  - Added subtle hover effects and transitions for interactive elements
  - Refined typography with better spacing and readability
  - Enhanced button styling with modern hover effects

## [1.1.1] - 2024-07-31

### Features
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
- Live streaming of AI responses
- Syntax highlighting for code blocks in responses

### Configuration Options
- Configurable base URL for Ollama API (default: `http://localhost:11434`)
- Customizable default model setting (default: `llama2`)
- Ability to restrict allowed models via configuration
- Adjustable token limit settings (default: 4096)
- Configurable temperature setting (default: 0.7)
- Request timeout settings (default: 60 seconds)
- Model-specific configuration options
- Debug mode toggle

### UI/UX
- Modern Bootstrap-based responsive UI
- Dedicated sidebar icon for quick access
- Toolbar buttons on notebook cells for contextual assistance
- Seamless integration with JupyterLab light and dark themes
- Fully responsive design that works on all screen sizes
- Rich markdown formatting in responses
- Code block syntax highlighting
- Smooth animations for context menus
- User-friendly error messages

### Technical Details
- Python server extension connecting to Ollama API
- TypeScript/React frontend components
- Integration with JupyterLab notebook cells and UI components
- Streaming response support using SSE (Server-Sent Events)
- Embeddings API support for semantic analysis
- Cell context extraction and preprocessing
- Full support for JupyterLab v4.x (compatible with 4.0.0+)
- Bootstrap 5.3.3 integration for responsive UI
- React 18.2.0 components with React Markdown for rendering
- Syntax highlighting via react-syntax-highlighter
- Configurable via JupyterLab's advanced settings system

### Developer Tools
- Comprehensive build system with npm scripts
- Watch mode for development
- ESLint and Prettier integration
- TypeScript strict type checking
- Development installation scripts

### Documentation
- Detailed README with installation and usage instructions
- Troubleshooting guide
- Configuration documentation
- Example prompts and use cases 