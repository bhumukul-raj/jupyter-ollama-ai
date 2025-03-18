/**
 * Entry point for the JupyterLab AI Assistant Extension
 */

// Export components
export * from './components/OllamaTestWidget';
export * from './components/ChatWidget';

// Export services
export * from './services/ollama';

// Export the plugin
export { default } from './plugin'; 