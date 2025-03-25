/**
 * WebSocketLogger
 * 
 * A specialized WebSocket-specific logger that extends the shared application Logger.
 * Provides convenient methods for WebSocket-related logging.
 */

import { 
  Logger, 
  LogLevel, 
  LogCategory,
  LogMessage,
  AudioLogger
} from '../../utils/Logger';

/**
 * WebSocket-specific logger class that extends the base Logger
 */
export class WebSocketLogger extends Logger {
  private static wsInstance: WebSocketLogger;
  
  /**
   * Gets the singleton WebSocketLogger instance
   */
  public static getInstance(): WebSocketLogger {
    if (!WebSocketLogger.wsInstance) {
      WebSocketLogger.wsInstance = new WebSocketLogger();
      WebSocketLogger.wsInstance.setServiceId('WebSocket');
    }
    return WebSocketLogger.wsInstance;
  }
  
  /**
   * Log a WebSocket connection-related message
   */
  public logConnection(level: LogLevel, message: string, data?: any): void {
    this.log(level, LogCategory.WS, message, data);
  }
  
  /**
   * Log a WebSocket message-related event
   */
  public logMessage(level: LogLevel, message: string, data?: any): void {
    this.log(level, LogCategory.WS, message, data);
  }
}

// Export the singleton instances for WebSocket usage
export const logger = WebSocketLogger.getInstance();
export const audioLogger = AudioLogger.getAudioInstance();

// Re-export types from the shared logger for convenience
export { LogLevel, LogCategory };
export type { LogMessage }; 