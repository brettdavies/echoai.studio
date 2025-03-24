/**
 * LoggingControl Component
 * 
 * A development-only component for controlling application logging settings.
 * This component allows developers to toggle logging for different components
 * and categories during development/debugging.
 */

import React, { useState, useEffect } from 'react';
import { 
  logger, 
  LogLevel, 
  LogCategory, 
  LogComponent, 
  DEFAULT_LOGGING_CONFIG 
} from '../../utils/Logger';
import { audioLoggers, uiLoggers } from '../../utils/LoggerFactory';

// Component styles
const styles = {
  container: {
    position: 'fixed' as const,
    bottom: '20px',
    right: '20px',
    background: 'rgba(0, 0, 0, 0.8)',
    color: 'white',
    padding: '10px',
    borderRadius: '5px',
    zIndex: 9999,
    maxWidth: '400px',
    maxHeight: '80vh',
    overflowY: 'auto' as const,
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
    fontSize: '14px',
    fontFamily: 'monospace'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '16px',
    fontWeight: 'bold' as const
  },
  section: {
    marginBottom: '12px'
  },
  sectionTitle: {
    fontSize: '14px',
    marginBottom: '4px',
    fontWeight: 'bold' as const
  },
  switchRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: '4px 0',
    padding: '4px 0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
  },
  switchLabel: {
    flex: 1
  },
  button: {
    background: '#444',
    border: 'none',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '12px',
    margin: '0 4px'
  },
  activeButton: {
    background: '#007bff',
  },
  iconButton: {
    background: 'none',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    fontSize: '16px'
  }
};

// Toggle switch component
const ToggleSwitch: React.FC<{
  label: string;
  checked: boolean;
  onChange: () => void;
}> = ({ label, checked, onChange }) => (
  <div style={styles.switchRow}>
    <span style={styles.switchLabel}>{label}</span>
    <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '20px' }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{ opacity: 0, width: 0, height: 0 }}
      />
      <span style={{
        position: 'absolute',
        cursor: 'pointer',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: checked ? '#2196F3' : '#ccc',
        transition: '.4s',
        borderRadius: '34px',
      }}>
        <span style={{
          position: 'absolute',
          height: '16px',
          width: '16px',
          left: checked ? '22px' : '2px',
          bottom: '2px',
          backgroundColor: 'white',
          transition: '.4s',
          borderRadius: '50%'
        }}></span>
      </span>
    </label>
  </div>
);

/**
 * Logging Control Component
 */
const LoggingControl: React.FC = () => {
  // State for UI
  const [isOpen, setIsOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<'component' | 'level'>('component');

  // State for log levels
  const [logLevel, setLogLevel] = useState(logger.getLogLevel());
  
  // State for component filters
  const [componentFilters, setComponentFilters] = useState<Record<LogComponent, boolean>>({} as Record<LogComponent, boolean>);
  
  // Modified function to copy logging config without alerts
  const [copyStatus, setCopyStatus] = useState<string>('');
  
  // Load component states
  useEffect(() => {
    const components = Object.values(LogComponent);
    const filters: Record<LogComponent, boolean> = {} as Record<LogComponent, boolean>;
    
    components.forEach(component => {
      filters[component] = logger.isComponentEnabled(component);
    });
    
    setComponentFilters(filters);
  }, []);
  
  // Toggle component logging
  const toggleComponent = (component: LogComponent) => {
    const newState = !componentFilters[component];
    
    if (newState) {
      logger.enableComponents(component);
    } else {
      logger.disableComponents(component);
    }
    
    setComponentFilters(prev => ({
      ...prev,
      [component]: newState
    }));
  };
  
  // Set log level
  const setGlobalLogLevel = (level: LogLevel) => {
    logger.setLogLevel(level);
    setLogLevel(level);
  };
  
  // Reset to defaults
  const resetToDefaults = () => {
    logger.resetLoggingConfig();
    logger.setLogLevel(process.env.NODE_ENV === 'production' ? LogLevel.ERROR : LogLevel.DEBUG);
    
    // Refresh state
    setLogLevel(logger.getLogLevel());
    
    const components = Object.values(LogComponent);
    const filters: Record<LogComponent, boolean> = {} as Record<LogComponent, boolean>;
    
    components.forEach(component => {
      filters[component] = logger.isComponentEnabled(component);
    });
    
    setComponentFilters(filters);
  };

  // Update the copyConfigToClipboard function
  const copyConfigToClipboard = () => {
    try {
      const config = localStorage.getItem('echoai_logging_config') || JSON.stringify({ components: {} });
      navigator.clipboard.writeText(config);
      setCopyStatus('Copied!');
      setTimeout(() => setCopyStatus(''), 2000);
    } catch (error) {
      uiLoggers.controls.error('Failed to copy config:', error);
      setCopyStatus('Failed to copy');
      setTimeout(() => setCopyStatus(''), 2000);
    }
  };

  // Only render in development mode
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  // Render minimized state
  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          padding: '8px',
          cursor: 'pointer',
          zIndex: 9999
        }}
      >
        📋 Logging
      </button>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Logging Controls</h3>
        <button 
          style={styles.iconButton}
          onClick={() => setIsOpen(false)}
        >
          ✕
        </button>
      </div>
      
      {/* Tab buttons */}
      <div style={{ display: 'flex', marginBottom: '10px' }}>
        <button 
          style={{ 
            ...styles.button, 
            ...(activePanel === 'component' ? styles.activeButton : {})
          }}
          onClick={() => setActivePanel('component')}
        >
          Components
        </button>
        <button 
          style={{ 
            ...styles.button, 
            ...(activePanel === 'level' ? styles.activeButton : {})
          }}
          onClick={() => setActivePanel('level')}
        >
          Log Levels
        </button>
      </div>
      
      {/* Component panel */}
      {activePanel === 'component' && (
        <div>
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Audio Components</div>
            <ToggleSwitch 
              label="Resampler" 
              checked={componentFilters[LogComponent.RESAMPLER] || false}
              onChange={() => toggleComponent(LogComponent.RESAMPLER)}
            />
            <ToggleSwitch 
              label="Audio Worklet" 
              checked={componentFilters[LogComponent.AUDIO_WORKLET] || false}
              onChange={() => toggleComponent(LogComponent.AUDIO_WORKLET)}
            />
            <ToggleSwitch 
              label="Audio Processor" 
              checked={componentFilters[LogComponent.AUDIO_PROCESSOR] || false}
              onChange={() => toggleComponent(LogComponent.AUDIO_PROCESSOR)}
            />
          </div>
          
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Media Components</div>
            <ToggleSwitch 
              label="DASH Player" 
              checked={componentFilters[LogComponent.DASH_PLAYER] || false}
              onChange={() => toggleComponent(LogComponent.DASH_PLAYER)}
            />
          </div>
          
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Network Components</div>
            <ToggleSwitch 
              label="WebSocket" 
              checked={componentFilters[LogComponent.WEBSOCKET] || false}
              onChange={() => toggleComponent(LogComponent.WEBSOCKET)}
            />
            <ToggleSwitch 
              label="HTTP Client" 
              checked={componentFilters[LogComponent.HTTP_CLIENT] || false}
              onChange={() => toggleComponent(LogComponent.HTTP_CLIENT)}
            />
          </div>
          
          <div style={styles.section}>
            <div style={styles.sectionTitle}>UI Components</div>
            <ToggleSwitch 
              label="UI Controls" 
              checked={componentFilters[LogComponent.UI_CONTROLS] || false}
              onChange={() => toggleComponent(LogComponent.UI_CONTROLS)}
            />
          </div>
          
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Quick Actions</div>
            <div style={{ marginTop: '8px' }}>
              <button 
                style={styles.button}
                onClick={resetToDefaults}
              >
                Reset All
              </button>
              <button 
                style={{
                  ...styles.button,
                  position: 'relative'
                }}
                onClick={copyConfigToClipboard}
              >
                {copyStatus || 'Copy Config'}
                {copyStatus && (
                  <span style={{
                    position: 'absolute',
                    bottom: '-20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '10px',
                    whiteSpace: 'nowrap'
                  }}>
                    {copyStatus}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Log level panel */}
      {activePanel === 'level' && (
        <div>
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Global Log Level</div>
            {Object.keys(LogLevel)
              .filter(key => !isNaN(Number(key)))
              .map(level => (
                <div key={level} style={styles.switchRow}>
                  <span style={styles.switchLabel}>
                    {LogLevel[Number(level)]}
                  </span>
                  <input 
                    type="radio"
                    name="logLevel"
                    checked={logLevel === Number(level)}
                    onChange={() => setGlobalLogLevel(Number(level))}
                  />
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoggingControl; 