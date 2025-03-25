/**
 * Utilities module
 */

// Export WebSocket test utilities
export * from './testWebSocket';
import { appLogger } from './LoggerFactory';
import { isDevelopmentMode } from './environment';

// Initialize browser testing utilities in development
if (isDevelopmentMode()) {
  // Import and initialize test utilities
  import('./testWebSocket').then(module => {
    appLogger.info('WebSocket test utilities loaded in development mode');
  }).catch(error => {
    appLogger.error('Failed to load WebSocket test utilities:', error);
  });
}

/**
 * Utility module exports
 */

// Export utilities - import the default export correctly
export { default as testWebSocket } from './testWebSocket';

// Export environment utilities
export * from './environment';

// Export Logger module
export {
  Logger,
  AudioLogger,
  LogLevel,
  LogCategory,
  LogComponent,
  logger,
  audioLogger
} from './Logger';

export type { LogMessage, LoggingConfig } from './Logger'; 