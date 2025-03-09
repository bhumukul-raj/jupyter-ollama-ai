import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconProp } from '@fortawesome/fontawesome-svg-core';

interface Tab {
  id: string;
  label: string;
  icon: IconProp;
}

interface TabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  isLoading: boolean;
  isCompact?: boolean;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  activeTab,
  onTabChange,
  isLoading,
  isCompact = false
}) => {
  return (
    <div className={`jp-AIAssistant-tabs ${isCompact ? 'jp-AIAssistant-tabs-compact' : ''}`} role="tablist">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`jp-AIAssistant-tab ${activeTab === tab.id ? 'jp-AIAssistant-tab-active' : ''} ${isCompact ? 'jp-AIAssistant-tab-compact' : ''}`}
          onClick={() => !isLoading && onTabChange(tab.id)}
          disabled={isLoading}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`jp-AIAssistant-tab-panel-${tab.id}`}
          id={`jp-AIAssistant-tab-${tab.id}`}
          tabIndex={activeTab === tab.id ? 0 : -1}
        >
          <FontAwesomeIcon icon={tab.icon} className="fa-icon-sm" style={{ marginRight: isCompact ? '4px' : '8px' }} />
          {isCompact ? '' : tab.label}
        </button>
      ))}
    </div>
  );
};

export default TabNavigation; 