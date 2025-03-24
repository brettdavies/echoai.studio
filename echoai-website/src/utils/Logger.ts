/**
 * Application Logger
 * 
 * A utility for consistent logging across the application with configurable log levels.
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
  // General categories
  APP = 'app',
  API = 'api',
  UI = 'ui',
  STATE = 'state',
  ERROR = 'error',
  PERFORMANCE = 'performance',
  NAVIGATION = 'navigation',
  
  // Networking categories
  NETWORK = 'network',
  WS = 'websocket',
  HTTP = 'http',
  
  // Audio processing categories
  AUDIO = 'audio',
  WASM = 'wasm',
  PROCESSOR = 'processor',
  RESAMPLER = 'resampler',
  WORKLET = 'worklet',
  
  // Storage categories
  STORAGE = 'storage',
  CACHE = 'cache',
  
  // Other
  MISC = 'misc'
}

// Application components for fine-grained logging control
export enum LogComponent {
  // Audio components
  RESAMPLER = 'resampler',
  AUDIO_WORKLET = 'audio_worklet',
  AUDIO_PROCESSOR = 'audio_processor',
  
  // Network components
  WEBSOCKET = 'websocket',
  HTTP_CLIENT = 'http_client',
  
  // UI components
  UI_CONTROLS = 'ui_controls',
  
  // Media components
  DASH_PLAYER = 'dash_player',
  
  // Other
  MISC = 'misc'
}

// Default config for component logging - determines which components have logging enabled
export interface LoggingConfig {
  components: {
    [key in LogComponent]?: boolean;
  };
}

// Default logging configuration - all components enabled by default
export const DEFAULT_LOGGING_CONFIG: LoggingConfig = {
  components: Object.values(LogComponent).reduce((config, component) => {
    config[component] = true;
    return config;
  }, {} as { [key in LogComponent]: boolean })
};

// Log message format for structured logging
export interface LogMessage {
  category: LogCategory;
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: number;
  component?: LogComponent;
}

/**
 * Base Logger class
 */
export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.DEBUG; // Default to DEBUG in development
  private logs: LogMessage[] = [];
  private maxLogSize: number = 1000;
  private serviceId: string = '';
  
  // Add category filters to control which categories are logged
  private categoryFilters: Set<LogCategory> = new Set(Object.values(LogCategory));
  
  // Add component filters to control which components are logged
  private componentFilters: Map<LogComponent, boolean> = new Map(
    Object.values(LogComponent).map(component => [component, true])
  );
  
  /**
   * Gets the singleton logger instance
   */
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }
  
  /**
   * Protected constructor to allow extension but prevent direct instantiation
   */
  protected constructor() {
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
    
    // Try to load logging config from localStorage in browser environments
    this.loadConfigFromStorage();
  }
  
  /**
   * Load logging configuration from localStorage if available
   */
  private loadConfigFromStorage(): void {
    try {
      // Only try to access localStorage in browser environments
      if (typeof localStorage !== 'undefined') {
        const storedConfig = localStorage.getItem('echoai_logging_config');
        if (storedConfig) {
          const config = JSON.parse(storedConfig) as LoggingConfig;
          this.applyLoggingConfig(config);
        }
      }
    } catch (e) {
      console.debug('Failed to load logging config from storage:', e);
    }
  }
  
  /**
   * Save current logging configuration to localStorage
   */
  private saveConfigToStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const config: LoggingConfig = {
          components: {}
        };
        
        // Convert map to object
        this.componentFilters.forEach((enabled, component) => {
          config.components[component] = enabled;
        });
        
        localStorage.setItem('echoai_logging_config', JSON.stringify(config));
      }
    } catch (e) {
      console.debug('Failed to save logging config to storage:', e);
    }
  }
  
  /**
   * Apply a logging configuration
   * @param config The logging configuration to apply
   */
  public applyLoggingConfig(config: LoggingConfig): void {
    if (config.components) {
      Object.entries(config.components).forEach(([component, enabled]) => {
        this.componentFilters.set(component as LogComponent, enabled);
      });
    }
    
    // Save the updated configuration
    this.saveConfigToStorage();
  }
  
  /**
   * Reset logging configuration to defaults
   */
  public resetLoggingConfig(): void {
    this.applyLoggingConfig(DEFAULT_LOGGING_CONFIG);
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
   * Enable logging for specific categories
   * @param categories Categories to enable
   */
  public enableCategories(...categories: LogCategory[]): void {
    categories.forEach(category => this.categoryFilters.add(category));
  }
  
  /**
   * Disable logging for specific categories
   * @param categories Categories to disable
   */
  public disableCategories(...categories: LogCategory[]): void {
    categories.forEach(category => this.categoryFilters.delete(category));
  }
  
  /**
   * Enable logging for specific components
   * @param components Components to enable
   */
  public enableComponents(...components: LogComponent[]): void {
    components.forEach(component => this.componentFilters.set(component, true));
    this.saveConfigToStorage();
  }
  
  /**
   * Disable logging for specific components
   * @param components Components to disable
   */
  public disableComponents(...components: LogComponent[]): void {
    components.forEach(component => this.componentFilters.set(component, false));
    this.saveConfigToStorage();
  }
  
  /**
   * Check if a category is enabled
   * @param category Category to check
   * @returns Whether the category is enabled
   */
  public isCategoryEnabled(category: LogCategory): boolean {
    return this.categoryFilters.has(category);
  }
  
  /**
   * Check if a component is enabled
   * @param component Component to check
   * @returns Whether the component is enabled
   */
  public isComponentEnabled(component?: LogComponent): boolean {
    if (!component) return true; // If no component specified, logging is enabled
    return this.componentFilters.get(component) ?? true;
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
   * @param component Optional component identifier
   */
  public trace(category: LogCategory, message: string, data?: any, component?: LogComponent): void {
    this.log(LogLevel.TRACE, category, message, data, component);
  }
  
  /**
   * Log a debug message
   * @param category Log category
   * @param message The message to log
   * @param data Additional data
   * @param component Optional component identifier
   */
  public debug(category: LogCategory, message: string, data?: any, component?: LogComponent): void {
    this.log(LogLevel.DEBUG, category, message, data, component);
  }
  
  /**
   * Log an info message
   * @param category Log category
   * @param message The message to log
   * @param data Additional data
   * @param component Optional component identifier
   */
  public info(category: LogCategory, message: string, data?: any, component?: LogComponent): void {
    this.log(LogLevel.INFO, category, message, data, component);
  }
  
  /**
   * Log a warning message
   * @param category Log category
   * @param message The message to log
   * @param data Additional data
   * @param component Optional component identifier
   */
  public warn(category: LogCategory, message: string, data?: any, component?: LogComponent): void {
    this.log(LogLevel.WARN, category, message, data, component);
  }
  
  /**
   * Log an error message
   * @param category Log category
   * @param message The message to log
   * @param data Additional data
   * @param component Optional component identifier
   */
  public error(category: LogCategory, message: string, data?: any, component?: LogComponent): void {
    this.log(LogLevel.ERROR, category, message, data, component);
  }
  
  /**
   * Get all stored logs
   * @returns Array of log messages
   */
  public getLogs(): LogMessage[] {
    return [...this.logs];
  }
  
  /**
   * Get logs filtered by category
   * @param category Category to filter by
   * @returns Filtered log messages
   */
  public getLogsByCategory(category: LogCategory): LogMessage[] {
    return this.logs.filter(log => log.category === category);
  }
  
  /**
   * Get logs filtered by component
   * @param component Component to filter by
   * @returns Filtered log messages
   */
  public getLogsByComponent(component: LogComponent): LogMessage[] {
    return this.logs.filter(log => log.component === component);
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
   * @param component Optional component identifier
   */
  protected log(level: LogLevel, category: LogCategory, message: string, data?: any, component?: LogComponent): void {
    // Skip if log level is too verbose or category is disabled
    if (level > this.logLevel || !this.isCategoryEnabled(category)) return;
    
    // Skip if component is disabled
    if (!this.isComponentEnabled(component)) return;
    
    const logMessage: LogMessage = {
      category,
      level,
      message,
      timestamp: Date.now(),
      data,
      component
    };
    
    // Add to in-memory logs with size limit
    this.logs.push(logMessage);
    if (this.logs.length > this.maxLogSize) {
      this.logs.shift();
    }
    
    // Format for console output
    const prefix = this.serviceId ? `[${this.serviceId}]` : '[App]';
    const timestamp = new Date(logMessage.timestamp).toISOString();
    const levelName = LogLevel[level];
    const componentStr = component ? `[${component}]` : '';
    const formattedMessage = `${prefix} ${timestamp} [${levelName}] [${category}]${componentStr}: ${message}`;
    
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

/**
 * Component-specific logger that includes component identification
 */
export class ComponentLogger {
  private logger: Logger;
  private component: LogComponent;
  
  /**
   * Create a component logger
   * @param component The component identifier
   * @param logger Optional logger instance (uses global logger by default)
   */
  constructor(component: LogComponent, logger?: Logger) {
    this.component = component;
    this.logger = logger || Logger.getInstance();
  }
  
  /**
   * Log a trace message
   * @param category Log category
   * @param message The message
   * @param data Additional data
   */
  public trace(category: LogCategory, message: string, data?: any): void {
    this.logger.trace(category, message, data, this.component);
  }
  
  /**
   * Log a debug message
   * @param category Log category
   * @param message The message
   * @param data Additional data
   */
  public debug(category: LogCategory, message: string, data?: any): void {
    this.logger.debug(category, message, data, this.component);
  }
  
  /**
   * Log an info message
   * @param category Log category
   * @param message The message
   * @param data Additional data
   */
  public info(category: LogCategory, message: string, data?: any): void {
    this.logger.info(category, message, data, this.component);
  }
  
  /**
   * Log a warning message
   * @param category Log category
   * @param message The message
   * @param data Additional data
   */
  public warn(category: LogCategory, message: string, data?: any): void {
    this.logger.warn(category, message, data, this.component);
  }
  
  /**
   * Log an error message
   * @param category Log category
   * @param message The message
   * @param data Additional data
   */
  public error(category: LogCategory, message: string, data?: any): void {
    this.logger.error(category, message, data, this.component);
  }
}

/**
 * Specialized logger for audio processing components
 */
export class AudioLogger extends Logger {
  private static audioInstance: AudioLogger;
  
  /**
   * Gets the singleton audio logger instance
   */
  public static getAudioInstance(): AudioLogger {
    if (!AudioLogger.audioInstance) {
      AudioLogger.audioInstance = new AudioLogger();
      AudioLogger.audioInstance.setServiceId('Audio');
    }
    return AudioLogger.audioInstance;
  }
  
  /**
   * Constructor
   */
  constructor() {
    super();
    // Configure default settings for audio logging
    this.setLogLevel(LogLevel.INFO); // Less verbose by default
  }
  
  /**
   * Log a WASM-related message
   * @param level Log level
   * @param message The message to log
   * @param data Additional data
   */
  public logWasm(level: LogLevel, message: string, data?: any): void {
    switch (level) {
      case LogLevel.ERROR:
        this.error(LogCategory.WASM, message, data);
        break;
      case LogLevel.WARN:
        this.warn(LogCategory.WASM, message, data);
        break;
      case LogLevel.INFO:
        this.info(LogCategory.WASM, message, data);
        break;
      case LogLevel.DEBUG:
        this.debug(LogCategory.WASM, message, data);
        break;
      case LogLevel.TRACE:
        this.trace(LogCategory.WASM, message, data);
        break;
      default:
        // No logging for NONE level
        break;
    }
  }
  
  /**
   * Log a RubberBand-related message
   * @param level Log level
   * @param message The message to log
   * @param data Additional data
   */
  public logResampler(level: LogLevel, message: string, data?: any): void {
    switch (level) {
      case LogLevel.ERROR:
        this.error(LogCategory.RESAMPLER, message, data, LogComponent.RESAMPLER);
        break;
      case LogLevel.WARN:
        this.warn(LogCategory.RESAMPLER, message, data, LogComponent.RESAMPLER);
        break;
      case LogLevel.INFO:
        this.info(LogCategory.RESAMPLER, message, data, LogComponent.RESAMPLER);
        break;
      case LogLevel.DEBUG:
        this.debug(LogCategory.RESAMPLER, message, data, LogComponent.RESAMPLER);
        break;
      case LogLevel.TRACE:
        this.trace(LogCategory.RESAMPLER, message, data, LogComponent.RESAMPLER);
        break;
      default:
        // No logging for NONE level
        break;
    }
  }
  
  /**
   * Log an AudioWorklet-related message
   * @param level Log level
   * @param message The message to log
   * @param data Additional data
   */
  public logWorklet(level: LogLevel, message: string, data?: any): void {
    switch (level) {
      case LogLevel.ERROR:
        this.error(LogCategory.WORKLET, message, data, LogComponent.AUDIO_WORKLET);
        break;
      case LogLevel.WARN:
        this.warn(LogCategory.WORKLET, message, data, LogComponent.AUDIO_WORKLET);
        break;
      case LogLevel.INFO:
        this.info(LogCategory.WORKLET, message, data, LogComponent.AUDIO_WORKLET);
        break;
      case LogLevel.DEBUG:
        this.debug(LogCategory.WORKLET, message, data, LogComponent.AUDIO_WORKLET);
        break;
      case LogLevel.TRACE:
        this.trace(LogCategory.WORKLET, message, data, LogComponent.AUDIO_WORKLET);
        break;
      default:
        // No logging for NONE level
        break;
    }
  }
  
  /**
   * Log an audio processor-related message
   * @param level Log level
   * @param message The message to log
   * @param data Additional data
   */
  public logProcessor(level: LogLevel, message: string, data?: any): void {
    switch (level) {
      case LogLevel.ERROR:
        this.error(LogCategory.PROCESSOR, message, data, LogComponent.AUDIO_PROCESSOR);
        break;
      case LogLevel.WARN:
        this.warn(LogCategory.PROCESSOR, message, data, LogComponent.AUDIO_PROCESSOR);
        break;
      case LogLevel.INFO:
        this.info(LogCategory.PROCESSOR, message, data, LogComponent.AUDIO_PROCESSOR);
        break;
      case LogLevel.DEBUG:
        this.debug(LogCategory.PROCESSOR, message, data, LogComponent.AUDIO_PROCESSOR);
        break;
      case LogLevel.TRACE:
        this.trace(LogCategory.PROCESSOR, message, data, LogComponent.AUDIO_PROCESSOR);
        break;
      default:
        // No logging for NONE level
        break;
    }
  }
  
  /**
   * Configure audio logger with preset settings
   * @param options Configuration options
   */
  public configure(options: {
    level?: LogLevel;
    enableWasm?: boolean;
    enableResampler?: boolean;
    enableWorklet?: boolean;
    enableProcessor?: boolean;
  }): void {
    // Set log level if provided
    if (options.level !== undefined) {
      this.setLogLevel(options.level);
    }
    
    // Configure category filters
    if (options.enableWasm === false) {
      this.disableCategories(LogCategory.WASM);
    } else if (options.enableWasm === true) {
      this.enableCategories(LogCategory.WASM);
    }
    
    if (options.enableResampler === false) {
      this.disableCategories(LogCategory.RESAMPLER);
      this.disableComponents(LogComponent.RESAMPLER);
    } else if (options.enableResampler === true) {
      this.enableCategories(LogCategory.RESAMPLER);
      this.enableComponents(LogComponent.RESAMPLER);
    }
    
    if (options.enableWorklet === false) {
      this.disableCategories(LogCategory.WORKLET);
      this.disableComponents(LogComponent.AUDIO_WORKLET);
    } else if (options.enableWorklet === true) {
      this.enableCategories(LogCategory.WORKLET);
      this.enableComponents(LogComponent.AUDIO_WORKLET);
    }
    
    if (options.enableProcessor === false) {
      this.disableCategories(LogCategory.PROCESSOR);
      this.disableComponents(LogComponent.AUDIO_PROCESSOR);
    } else if (options.enableProcessor === true) {
      this.enableCategories(LogCategory.PROCESSOR);
      this.enableComponents(LogComponent.AUDIO_PROCESSOR);
    }
  }
}

// Export the RubberBand component logger for use in RubberBand modules
export const rubberBandLogger = new ComponentLogger(LogComponent.RESAMPLER);

// Export singleton instances for shared usage
export const logger = Logger.getInstance();
export const audioLogger = AudioLogger.getAudioInstance(); 