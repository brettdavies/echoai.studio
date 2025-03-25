/**
 * Logger Factory
 * 
 * Provides factory functions for creating domain-specific loggers
 * that utilize the application's logging infrastructure.
 */

import { 
  LogCategory, 
  LogComponent, 
  logger 
} from './Logger';

/**
 * Create a domain-specific logger with predefined category and component
 * 
 * @param category The log category
 * @param component The component identifier
 * @returns Object with logging methods
 */
export function createDomainLogger(category: LogCategory, component: LogComponent) {
  return {
    trace: (message: string, data?: any) => 
      logger.trace(category, message, data, component),
    
    debug: (message: string, data?: any) => 
      logger.debug(category, message, data, component),
    
    info: (message: string, data?: any) => 
      logger.info(category, message, data, component),
    
    warn: (message: string, data?: any) => 
      logger.warn(category, message, data, component),
    
    error: (message: string, data?: any) => 
      logger.error(category, message, data, component),
    
    isEnabled: () => 
      logger.isComponentEnabled(component)
  };
}

// Pre-created loggers for audio-related components
export const audioLoggers = {
  session: createDomainLogger(LogCategory.AUDIO, LogComponent.AUDIO_PROCESSOR),
  processor: createDomainLogger(LogCategory.PROCESSOR, LogComponent.AUDIO_PROCESSOR),
  worklet: createDomainLogger(LogCategory.WORKLET, LogComponent.AUDIO_WORKLET),
  resampler: createDomainLogger(LogCategory.RESAMPLER, LogComponent.RESAMPLER),
  media: createDomainLogger(LogCategory.AUDIO, LogComponent.MISC),
  dashPlayer: createDomainLogger(LogCategory.AUDIO, LogComponent.DASH_PLAYER),
  audioCapture: createDomainLogger(LogCategory.AUDIO, LogComponent.AUDIO_PROCESSOR),
  orchestrator: createDomainLogger(LogCategory.AUDIO, LogComponent.ORCHESTRATOR),
};

// Pre-created loggers for networking components
export const networkLoggers = {
  websocket: createDomainLogger(LogCategory.WS, LogComponent.WEBSOCKET),
  http: createDomainLogger(LogCategory.HTTP, LogComponent.HTTP_CLIENT),
};

// Pre-created loggers for UI components
export const uiLoggers = {
  controls: createDomainLogger(LogCategory.UI, LogComponent.UI_CONTROLS),
  general: createDomainLogger(LogCategory.UI, LogComponent.MISC),
};

// General application logger
export const appLogger = createDomainLogger(LogCategory.APP, LogComponent.MISC); 