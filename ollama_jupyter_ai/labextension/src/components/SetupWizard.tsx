import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheck,
  faTimes,
  faSpinner,
  faDownload,
  faPlay,
  faRobot
} from '@fortawesome/free-solid-svg-icons';
import { OllamaHealthService } from '../services/OllamaHealthService';

interface SetupWizardProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface SetupStep {
  title: string;
  description: string;
  action?: () => Promise<void>;
  isComplete: boolean;
  isLoading: boolean;
  error?: string;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<SetupStep[]>([]);
  const healthService = new OllamaHealthService();
  
  useEffect(() => {
    const initializeSteps = async () => {
      const initialSteps: SetupStep[] = [
        {
          title: 'Check Ollama Installation',
          description: 'Verifying if Ollama is installed and running...',
          action: async () => {
            const result = await healthService.testConnection();
            if (!result.isConnected) {
              throw new Error(result.error || 'Ollama is not running');
            }
          },
          isComplete: false,
          isLoading: false
        },
        {
          title: 'Check Available Models',
          description: 'Checking for available Ollama models...',
          action: async () => {
            const result = await healthService.testConnection();
            if (!result.details?.models?.length) {
              throw new Error('No models found. Please pull a model first.');
            }
          },
          isComplete: false,
          isLoading: false
        },
        {
          title: 'Verify API Connection',
          description: 'Testing connection to Ollama API...',
          action: async () => {
            await healthService.waitForHealthy(5000);
          },
          isComplete: false,
          isLoading: false
        }
      ];
      
      setSteps(initialSteps);
    };
    
    initializeSteps();
  }, []);
  
  const executeStep = async (index: number) => {
    if (!steps[index]?.action) return;
    
    setSteps(prev => prev.map((step, i) => 
      i === index ? { ...step, isLoading: true, error: undefined } : step
    ));
    
    try {
      await steps[index].action!();
      setSteps(prev => prev.map((step, i) => 
        i === index ? { ...step, isComplete: true, isLoading: false } : step
      ));
      
      if (index < steps.length - 1) {
        setCurrentStep(index + 1);
      } else {
        onComplete();
      }
    } catch (error) {
      setSteps(prev => prev.map((step, i) => 
        i === index ? { 
          ...step, 
          isLoading: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        } : step
      ));
    }
  };
  
  const renderStepStatus = (step: SetupStep) => {
    if (step.isLoading) {
      return <FontAwesomeIcon icon={faSpinner} spin className="fa-icon-md" />;
    }
    if (step.isComplete) {
      return <FontAwesomeIcon icon={faCheck} className="fa-icon-md text-success" />;
    }
    if (step.error) {
      return <FontAwesomeIcon icon={faTimes} className="fa-icon-md text-error" />;
    }
    return null;
  };
  
  return (
    <div className="jp-AIAssistant-setup-wizard">
      <div className="jp-AIAssistant-setup-wizard-header">
        <FontAwesomeIcon icon={faRobot} className="fa-icon-lg" />
        <h2>Welcome to Ollama AI Assistant</h2>
        <p>Let's get you set up with Ollama</p>
      </div>
      
      <div className="jp-AIAssistant-setup-wizard-steps">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`jp-AIAssistant-setup-wizard-step ${
              index === currentStep ? 'active' : ''
            } ${step.isComplete ? 'complete' : ''}`}
          >
            <div className="jp-AIAssistant-setup-wizard-step-header">
              <h3>{step.title}</h3>
              {renderStepStatus(step)}
            </div>
            
            <p>{step.description}</p>
            
            {step.error && (
              <div className="jp-AIAssistant-setup-wizard-error">
                <FontAwesomeIcon icon={faTimes} className="fa-icon-sm" />
                {step.error}
              </div>
            )}
            
            {index === currentStep && !step.isComplete && (
              <div className="jp-AIAssistant-setup-wizard-actions">
                <button
                  className="jp-AIAssistant-setup-wizard-button"
                  onClick={() => executeStep(index)}
                  disabled={step.isLoading}
                >
                  {step.isLoading ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} spin />
                      Checking...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faPlay} />
                      Start Check
                    </>
                  )}
                </button>
                
                {step.error && (
                  <button
                    className="jp-AIAssistant-setup-wizard-button secondary"
                    onClick={() => window.open('https://ollama.ai', '_blank')}
                  >
                    <FontAwesomeIcon icon={faDownload} />
                    Install Ollama
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="jp-AIAssistant-setup-wizard-footer">
        <button
          className="jp-AIAssistant-setup-wizard-button secondary"
          onClick={onSkip}
        >
          Skip Setup
        </button>
        
        <button
          className="jp-AIAssistant-setup-wizard-button"
          onClick={() => executeStep(currentStep)}
          disabled={currentStep >= steps.length}
        >
          {currentStep >= steps.length - 1 ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  );
}; 