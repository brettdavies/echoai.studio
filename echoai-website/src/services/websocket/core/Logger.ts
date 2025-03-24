/**
 * Websocket Logger
 * 
 * A utility for consistent logging of WebSocket-related information
 * with configurable log levels.
 */

// Log levels in ascending order of verbosity
export enum LogLevel {
  NONE = 0,
  ERROR = 1,
  WARN = 2, 
  INFO = 3,
  DEBUG = 4,
  TRACE = 5
}

// Log message categories for grouping related logs
export enum LogCategory {
  CONNECTION = 'connection',
  MESSAGE = 'message',
  STATE = 'state',
  ERROR = 'error',
  DATA = 'data'
}

// Log message format for structured logging
export interface LogMessage {
  category: LogCategory;
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: number;
}

/**
 * WebSocket Logger class
 */
export class WebSocketLogger {
  private static instance: WebSocketLogger;
  private logLevel: LogLevel = LogLevel.DEBUG; // Default to DEBUG in development
  private logs: LogMessage[] = [];
  private maxLogSize: number = 1000;
  private serviceId: string = '';
  
  /**
   * Gets the singleton logger instance
   */
  public static getInstance(): WebSocketLogger {
    if (!WebSocketLogger.instance) {
      WebSocketLogger.instance = new WebSocketLogger();
    }
    return WebSocketLogger.instance;
  }
  
  /**
   * Private constructor to prevent direct instantiation
   */
  private constructor() {
    // Set default log level based on environment
    // Check for Vite's import.meta.env (browser-compatible)
    try {
      if (import.meta.env?.MODE === 'production') {
        this.logLevel = LogLevel.ERROR;
      } else if (import.meta.env?.MODE === 'test') {
        this.logLevel = LogLevel.WARN;
      }
    } catch (e) {
      // Fallback to default DEBUG level if import.meta is not available
      console.debug('Using default log level: DEBUG');
    }
  }
  
  /**
   * Set the log level
   * @param level The log level to set
   */
  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }
  
  /**
   * Get the current log level
   * @returns The current log level
   */
  public getLogLevel(): LogLevel {
    return this.logLevel;
  }
  
  /**
   * Set the service identifier for distinguishing logs from different services
   * @param id The service identifier
   */
  public setServiceId(id: string): void {
    this.serviceId = id;
  }
  
  /**
   * Log a trace message (most verbose)
   * @param category Log category
   * @param message The message to log
   * @param data Additional data
   */
  public trace(category: LogCategory, message: string, data?: any): void {
    this.log(LogLevel.TRACE, category, message, data);
  }
  
  /**
   * Log a debug message
   * @param category Log category
   * @param message The message to log
   * @param data Additional data
   */
  public debug(category: LogCategory, message: string, data?: any): void {
    this.log(LogLevel.DEBUG, category, message, data);
  }
  
  /**
   * Log an info message
   * @param category Log category
   * @param message The message to log
   * @param data Additional data
   */
  public info(category: LogCategory, message: string, data?: any): void {
    this.log(LogLevel.INFO, category, message, data);
  }
  
  /**
   * Log a warning message
   * @param category Log category
   * @param message The message to log
   * @param data Additional data
   */
  public warn(category: LogCategory, message: string, data?: any): void {
    this.log(LogLevel.WARN, category, message, data);
  }
  
  /**
   * Log an error message
   * @param category Log category
   * @param message The message to log
   * @param data Additional data
   */
  public error(category: LogCategory, message: string, data?: any): void {
    this.log(LogLevel.ERROR, category, message, data);
  }
  
  /**
   * Get all stored logs
   * @returns Array of log messages
   */
  public getLogs(): LogMessage[] {
    return [...this.logs];
  }
  
  /**
   * Clear all stored logs
   */
  public clearLogs(): void {
    this.logs = [];
  }
  
  /**
   * Internal log method
   * @param level Log level
   * @param category Log category
   * @param message The message to log
   * @param data Additional data
   */
  private log(level: LogLevel, category: LogCategory, message: string, data?: any): void {
    if (level > this.logLevel) return;
    
    const logMessage: LogMessage = {
      category,
      level,
      message,
      timestamp: Date.now(),
      data
    };
    
    // Add to in-memory logs with size limit
    this.logs.push(logMessage);
    if (this.logs.length > this.maxLogSize) {
      this.logs.shift();
    }
    
    // Format for console output
    const prefix = this.serviceId ? `[WebSocket:${this.serviceId}]` : '[WebSocket]';
    const timestamp = new Date(logMessage.timestamp).toISOString();
    const levelName = LogLevel[level];
    const formattedMessage = `${prefix} ${timestamp} [${levelName}] [${category}]: ${message}`;
    
    // Log to console with appropriate level
    switch (level) {
      case LogLevel.ERROR:
        console.error(formattedMessage, data || '');
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, data || '');
        break;
      case LogLevel.INFO:
        console.info(formattedMessage, data || '');
        break;
      case LogLevel.DEBUG:
      case LogLevel.TRACE:
      default:
        console.log(formattedMessage, data || '');
        break;
    }
  }
}

// Export a singleton instance for shared usage
export const logger = WebSocketLogger.getInstance(); 