import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPaperPlane, 
  faSync, 
  faStop,
  faExpand,
  faCompress
} from '@fortawesome/free-solid-svg-icons';

interface InputAreaProps {
  inputValue: string;
  isLoading: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onStopRequest: () => void;
  onRegenerate: () => void;
  isCompact?: boolean;
}

export const InputArea: React.FC<InputAreaProps> = ({
  inputValue,
  isLoading,
  onInputChange,
  onSubmit,
  onStopRequest,
  onRegenerate,
  isCompact = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [inputValue]);

  // Handle Ctrl+Enter for submission
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (!isLoading && inputValue.trim()) {
        onSubmit(e as unknown as React.FormEvent);
      }
    }
  };

  // Adjust styles based on compact mode
  const inputStyle = React.useMemo(() => {
    if (isCompact) {
      return {
        padding: '6px'
      };
    }
    return {};
  }, [isCompact]);

  const buttonStyle = React.useMemo(() => {
    if (isCompact) {
      return {
        padding: '4px 8px',
        fontSize: '12px'
      };
    }
    return {};
  }, [isCompact]);

  // Handle stop request with proper logging
  const handleStopRequest = () => {
    console.log("Stop button clicked in InputArea - stopping active generation");
    // This will trigger the parent component to find and stop the active request
    onStopRequest();
  };

  return (
    <div className={`jp-AIAssistant-input ${isExpanded ? 'jp-AIAssistant-input-expanded' : ''} ${isCompact ? 'jp-AIAssistant-input-compact' : ''}`} style={inputStyle}>
      <form className="jp-AIAssistant-input-form" onSubmit={onSubmit}>
        <textarea
          ref={textareaRef}
          className="jp-AIAssistant-input-textarea"
          value={inputValue}
          onChange={onInputChange}
          onKeyDown={handleKeyDown}
          placeholder={isCompact ? "Ask..." : "Ask a question or type a command..."}
          disabled={isLoading}
          rows={1}
          style={isCompact ? { minHeight: '36px' } : {}}
        />
        
        <div className="jp-AIAssistant-input-actions">
          {!isCompact && (
            <button
              type="button"
              className="jp-AIAssistant-message-control-button"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? "Collapse input" : "Expand input"}
            >
              <FontAwesomeIcon 
                icon={isExpanded ? faCompress : faExpand} 
                className="fa-icon-sm" 
              />
            </button>
          )}
          
          {isLoading ? (
            <button
              type="button"
              className="jp-AIAssistant-input-button jp-AIAssistant-action-button-stop"
              onClick={handleStopRequest}
              title="Stop generation"
              style={buttonStyle}
            >
              <FontAwesomeIcon icon={faStop} className="fa-icon-sm" />
              <span>Stop</span>
            </button>
          ) : (
            <>
              {/* Regenerate button */}
              {!isCompact && (
                <button
                  type="button"
                  className="jp-AIAssistant-input-button jp-AIAssistant-action-button-refresh"
                  onClick={onRegenerate}
                  disabled={isLoading}
                  title="Regenerate last response"
                  style={buttonStyle}
                >
                  <FontAwesomeIcon icon={faSync} className="fa-icon-sm" />
                  <span>Regenerate</span>
                </button>
              )}
              
              {/* Submit button */}
              <button
                type="submit"
                className="jp-AIAssistant-input-button"
                disabled={isLoading || !inputValue.trim()}
                title="Send message (Ctrl+Enter)"
                style={buttonStyle}
              >
                <FontAwesomeIcon icon={faPaperPlane} className="fa-icon-sm" />
                <span>Send</span>
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
};

export default InputArea; 