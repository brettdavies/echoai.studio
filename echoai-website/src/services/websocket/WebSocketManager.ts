/**
 * WebSocketManager
 * 
 * A singleton manager for WebSocket connections that ensures a single 
 * instance is used throughout the application for both testing and sending messages.
 */

import { 
  WebSocketService, 
  ConnectionState, 
  WebSocketOptions, 
  DEFAULT_OPTIONS,
  WebSocketEventType,
  WebSocketEventHandler,
  LogCategory
} from './index';
import { logger } from './WebSocketLogger';
import { DEFAULT_WS_URL } from '../../config';

export class WebSocketManager {
  private static instance: WebSocketManager;
  private webSocketService: WebSocketService | null = null;
  private url: string = DEFAULT_WS_URL;
  
  /**
   * Private constructor to enforce the singleton pattern
   */
  private constructor() {
    logger.info(LogCategory.WS, 'WebSocketManager singleton created');
  }
  
  /**
   * Get the WebSocketManager singleton instance
   * @returns The singleton instance
   */
  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }
  
  /**
   * Initialize or return the WebSocketService with the given URL
   * @param url WebSocket server URL (optional, uses default if not provided)
   * @param options WebSocket configuration options
   * @returns The WebSocketService instance
   */
  public getService(url?: string, options?: Partial<WebSocketOptions>): WebSocketService {
    // Use provided URL or fall back to existing/default
    const serverUrl = url || this.url;
    
    // If service exists and URL matches, reuse it
    if (this.webSocketService && this.url === serverUrl) {
      logger.debug(LogCategory.WS, 'Reusing existing WebSocketService', { url: serverUrl });
      return this.webSocketService;
    }
    
    // Clean up any existing service
    if (this.webSocketService) {
      logger.info(LogCategory.WS, 'Cleaning up previous WebSocketService', { oldUrl: this.url, newUrl: serverUrl });
      this.webSocketService.disconnect();
      this.webSocketService = null;
    }
    
    // Create new service with provided options
    const fullOptions: WebSocketOptions = {
      ...DEFAULT_OPTIONS,
      ...options,
      url: serverUrl
    };
    
    logger.info(LogCategory.WS, 'Creating new WebSocketService', { url: serverUrl });
    this.webSocketService = new WebSocketService(fullOptions);
    this.url = serverUrl;
    
    return this.webSocketService;
  }
  
  /**
   * Get the current active WebSocketService or create one with default settings
   * @returns The active WebSocketService
   */
  public getActiveService(): WebSocketService {
    return this.webSocketService || this.getService();
  }
  
  /**
   * Connect to the WebSocket server
   * @param url Optional WebSocket URL (uses current/default if not provided)
   * @param options Optional WebSocket configuration options
   * @returns Promise that resolves when connected
   */
  public async connect(url?: string, options?: Partial<WebSocketOptions>): Promise<void> {
    const service = this.getService(url, options);
    return service.connect();
  }
  
  /**
   * Disconnect from the WebSocket server
   * @param code Close code
   * @param reason Close reason
   */
  public disconnect(code: number = 1000, reason: string = 'Normal closure'): void {
    if (this.webSocketService) {
      this.webSocketService.disconnect(code, reason);
    }
  }
  
  /**
   * Send a message through the WebSocket
   * @param data Message data to send
   * @param priority Message priority (lower number = higher priority)
   * @param retry Whether to retry sending on failure
   * @returns Promise that resolves when sent or queued
   */
  public send(data: string | ArrayBuffer | Blob, priority: number = 10, retry: boolean = true): Promise<void> {
    const service = this.getActiveService();
    return service.send(data, priority, retry);
  }
  
  /**
   * Register an event handler for WebSocket events
   * @param type Event type
   * @param handler Event handler function
   */
  public on(type: WebSocketEventType, handler: WebSocketEventHandler): void {
    const service = this.getActiveService();
    service.on(type, handler);
  }
  
  /**
   * Remove an event handler for WebSocket events
   * @param type Event type
   * @param handler Event handler function
   */
  public off(type: WebSocketEventType, handler: WebSocketEventHandler): void {
    if (this.webSocketService) {
      this.webSocketService.off(type, handler);
    }
  }
  
  /**
   * Check if WebSocket is currently connected
   * @returns True if connected, false otherwise
   */
  public isConnected(): boolean {
    return this.webSocketService ? this.webSocketService.isConnected() : false;
  }
  
  /**
   * Get the current connection state
   * @returns Current connection state or DISCONNECTED if no service
   */
  public getState(): ConnectionState {
    return this.webSocketService ? this.webSocketService.getState() : ConnectionState.DISCONNECTED;
  }
  
  /**
   * Get detailed connection health information
   * @returns Connection health object
   */
  public getConnectionHealth() {
    if (!this.webSocketService) {
      return {
        connected: false,
        state: ConnectionState.DISCONNECTED,
        socketState: null,
        queueLength: 0,
        info: 'No WebSocketService instance exists'
      };
    }
    
    return this.webSocketService.getConnectionHealth();
  }
  
  /**
   * Test a WebSocket connection without creating a persistent service
   * @param url WebSocket URL to test
   * @param timeout Connection timeout in milliseconds
   * @returns Promise resolving to test result
   */
  public static async testConnection(url: string, timeout: number = 5000) {
    return WebSocketService.testConnection(url, timeout);
  }
}

export default WebSocketManager; 