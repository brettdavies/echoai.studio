/**
 * WebSocketService
 * 
 * A standalone service for managing WebSocket connections with built-in
 * reliability features like reconnection, message queuing, and heartbeats.
 */

import { 
  ConnectionState, 
  WebSocketOptions, 
  DEFAULT_OPTIONS,
  WebSocketEventType,
  WebSocketEventHandler
} from './core/types';
import { EventEmitter } from './core/EventEmitter';
import { MessageQueue } from './core/MessageQueue';
import { ConnectionManager } from './core/ConnectionManager';
import { logger, LogCategory } from './WebSocketLogger';

/**
 * WebSocketService handles all WebSocket communication with automatic
 * reconnection, message queueing, and state management.
 */
export class WebSocketService {
  private eventEmitter: EventEmitter;
  private messageQueue: MessageQueue;
  private connectionManager: ConnectionManager;
  
  /**
   * Creates a new WebSocketService instance
   * @param options Configuration options
   */
  constructor(options: WebSocketOptions) {
    // Apply default options
    const fullOptions = { ...DEFAULT_OPTIONS, ...options };
    
    // Validate URL
    if (!fullOptions.url) {
      throw new Error('WebSocket URL is required');
    }
    
    // Create components
    this.eventEmitter = new EventEmitter();
    this.messageQueue = new MessageQueue();
    this.connectionManager = new ConnectionManager(fullOptions, this.eventEmitter);
  }
  
  /**
   * Connect to the WebSocket server
   * @returns Promise that resolves when connected or rejects on timeout
   */
  connect(): Promise<void> {
    return this.connectionManager.connect().then(() => {
      // Process any queued messages after connection
      if (this.messageQueue.getLength() > 0) {
        this.processQueue();
      }
    });
  }
  
  /**
   * Disconnect from the WebSocket server
   * @param code Close code
   * @param reason Close reason
   */
  disconnect(code: number = 1000, reason: string = 'Normal closure'): void {
    this.connectionManager.disconnect(code, reason);
  }
  
  /**
   * Send a message to the server
   * @param data Message data to send
   * @param priority Message priority (lower number = higher priority)
   * @param retry Whether to retry sending on failure
   * @returns Promise that resolves when sent or queued
   */
  send(data: string | ArrayBuffer | Blob, priority: number = 10, retry: boolean = true): Promise<void> {
    // If circuit breaker is open, queue the message and return
    if (!this.connectionManager.isConnected()) {
      return new Promise<void>((resolve, reject) => {
        this.messageQueue.enqueue(data, priority, retry);
        
        if (this.connectionManager.getState() === ConnectionState.DISCONNECTED) {
          this.connect().catch(reject);
        }
        
        resolve();
      });
    }
    
    // If connected, send immediately
    return new Promise<void>((resolve, reject) => {
      try {
        const socket = this.connectionManager.getSocket();
        if (socket) {
          socket.send(data);
          resolve();
        } else {
          throw new Error('WebSocket not available');
        }
      } catch (error) {
        if (retry) {
          this.messageQueue.enqueue(data, priority, retry);
          resolve();
        } else {
          reject(error);
        }
      }
    });
  }
  
  /**
   * Add an event listener
   * @param type Event type
   * @param handler Event handler function
   */
  on(type: WebSocketEventType, handler: WebSocketEventHandler): void {
    this.eventEmitter.on(type, handler);
  }
  
  /**
   * Remove an event listener
   * @param type Event type
   * @param handler Event handler function
   */
  off(type: WebSocketEventType, handler: WebSocketEventHandler): void {
    this.eventEmitter.off(type, handler);
  }
  
  /**
   * Get the current connection state
   * @returns The current connection state
   */
  getState(): ConnectionState {
    return this.connectionManager.getState();
  }
  
  /**
   * Check if the connection is active
   * @returns True if connected, false otherwise
   */
  isConnected(): boolean {
    return this.connectionManager.isConnected();
  }
  
  /**
   * Get the number of messages in the queue
   * @returns The number of queued messages
   */
  getQueueLength(): number {
    return this.messageQueue.getLength();
  }
  
  /**
   * Clear the message queue
   */
  clearQueue(): void {
    this.messageQueue.clear();
  }
  
  /**
   * Enable or disable automatic reconnection
   * @param enable Whether to enable auto-reconnection
   */
  setAutoReconnect(enable: boolean): void {
    this.connectionManager.setAutoReconnect(enable);
  }
  
  /**
   * Process the message queue
   */
  private processQueue(): void {
    if (!this.connectionManager.isConnected() || this.messageQueue.isEmpty()) {
      return;
    }
    
    // Process up to 50 messages at a time to avoid blocking
    const messagesToProcess = this.messageQueue.dequeue(50);
    const socket = this.connectionManager.getSocket();
    
    for (const message of messagesToProcess) {
      try {
        socket?.send(message.data);
      } catch (error) {
        logger.error(LogCategory.ERROR, 'Error sending queued message', error);
        
        // If retry is enabled, add back to queue
        if (message.retry) {
          this.messageQueue.requeue(message);
        }
      }
    }
    
    // If we still have messages, continue processing in the next tick
    if (!this.messageQueue.isEmpty()) {
      setTimeout(() => this.processQueue(), 0);
    }
  }

  /**
   * Static method to directly test a WebSocket connection
   * @param url WebSocket URL to test
   * @param timeout Connection timeout in milliseconds
   * @returns Promise resolving to connection test result
   */
  static async testConnection(url: string, timeout: number = 5000): Promise<{
    success: boolean;
    error?: string;
    details?: Record<string, any>;
  }> {
    logger.info(LogCategory.WS, `Testing direct connection to ${url}`);
    
    return new Promise((resolve) => {
      let timeoutId: number | null = null;
      
      try {
        // Create WebSocket
        const socket = new WebSocket(url);
        
        // Set connection timeout
        timeoutId = window.setTimeout(() => {
          logger.error(LogCategory.ERROR, `Connection timeout after ${timeout}ms`);
          socket.close();
          resolve({
            success: false, 
            error: 'Connection timeout',
            details: { url, timeout }
          });
        }, timeout);
        
        // Handle successful connection
        socket.addEventListener('open', () => {
          if (timeoutId !== null) clearTimeout(timeoutId);
          logger.info(LogCategory.WS, `Connection successful to ${url}`);
          
          // Close after success
          setTimeout(() => {
            socket.close(1000, 'Test successful');
          }, 100);
          
          resolve({
            success: true,
            details: { url }
          });
        });
        
        // Handle connection error
        socket.addEventListener('error', (event) => {
          if (timeoutId !== null) clearTimeout(timeoutId);
          logger.error(LogCategory.ERROR, `Connection error to ${url}`, event);
          
          resolve({
            success: false,
            error: 'Connection error',
            details: { url, event }
          });
        });
        
        // Handle connection close
        socket.addEventListener('close', (event) => {
          if (timeoutId !== null) clearTimeout(timeoutId);
          
          // Only resolve here if not already resolved (error or open)
          if (!event.wasClean && socket.readyState !== WebSocket.OPEN) {
            logger.info(LogCategory.WS, `Connection closed: code=${event.code}, reason=${event.reason || 'unknown'}`);
            
            resolve({
              success: false,
              error: `Connection closed: ${event.reason || 'Server unreachable'}`,
              details: { 
                url, 
                code: event.code, 
                reason: event.reason, 
                wasClean: event.wasClean 
              }
            });
          }
        });
      } catch (error) {
        if (timeoutId !== null) clearTimeout(timeoutId);
        logger.error(LogCategory.ERROR, `Error creating WebSocket:`, error);
        
        resolve({
          success: false,
          error: error instanceof Error ? error.message : String(error),
          details: { url, error }
        });
      }
    });
  }

  /**
   * Global state change listeners for monitoring all WebSocket connections
   * This is useful for UI components that need to track connection status
   */
  private static globalStateChangeListeners: Set<(event: any) => void> = new Set();

  /**
   * Add a global state change listener
   * @param listener The listener function
   */
  static addGlobalStateChangeListener(listener: (event: any) => void): void {
    WebSocketService.globalStateChangeListeners.add(listener);
  }

  /**
   * Remove a global state change listener
   * @param listener The listener function to remove
   */
  static removeGlobalStateChangeListener(listener: (event: any) => void): void {
    WebSocketService.globalStateChangeListeners.delete(listener);
  }

  /**
   * Notify global listeners of a state change
   * @param event The state change event
   */
  static notifyGlobalStateChange(event: any): void {
    WebSocketService.globalStateChangeListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        logger.error(LogCategory.ERROR, 'Error in global state change listener', error);
      }
    });
  }
} 