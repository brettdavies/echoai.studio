import { ConnectionState, WebSocketOptions } from './types';
import { EventEmitter } from './EventEmitter';
import { logger, LogCategory } from './Logger';

/**
 * Manages the WebSocket connection lifecycle
 * Handles connection, disconnection, and reconnection attempts
 */
export class ConnectionManager {
  private socket: WebSocket | null = null;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectAttempts: number = 0;
  private reconnectTimeout: number | null = null;
  private connectionTimeout: number | null = null;
  private heartbeatInterval: number | null = null;
  private circuitOpen: boolean = false;
  private circuitResetTimeout: number | null = null;
  
  /**
   * Creates a new ConnectionManager
   * @param options WebSocket configuration options
   * @param eventEmitter Event emitter for notifications
   */
  constructor(
    private options: WebSocketOptions, 
    private eventEmitter: EventEmitter
  ) {
    logger.setServiceId(this.getServiceId());
    logger.info(LogCategory.CONNECTION, 'ConnectionManager created', { 
      url: this.options.url,
      autoReconnect: this.options.autoReconnect 
    });
  }
  
  /**
   * Get the current connection state
   * @returns The current connection state
   */
  getState(): ConnectionState {
    return this.state;
  }
  
  /**
   * Check if the connection is active
   * @returns True if connected, false otherwise
   */
  isConnected(): boolean {
    return this.state === ConnectionState.CONNECTED;
  }
  
  /**
   * Get the WebSocket instance
   * @returns The WebSocket instance or null if not connected
   */
  getSocket(): WebSocket | null {
    return this.socket;
  }
  
  /**
   * Connect to the WebSocket server
   * @returns Promise that resolves when connected or rejects on timeout
   */
  connect(): Promise<void> {
    if (this.socket && (this.state === ConnectionState.CONNECTED || 
                        this.state === ConnectionState.CONNECTING)) {
      logger.debug(LogCategory.CONNECTION, 'Connection already in progress or established');
      return Promise.resolve();
    }
    
    // Reset circuit breaker if it was open
    if (this.circuitOpen) {
      this.resetCircuitBreaker();
    }
    
    logger.info(LogCategory.CONNECTION, 'Attempting connection', { url: this.options.url });
    
    return new Promise((resolve, reject) => {
      this.updateState(ConnectionState.CONNECTING);
      this.eventEmitter.emit('connecting', new Event('connecting'));
      
      try {
        // Create new WebSocket instance
        this.socket = new WebSocket(this.options.url, this.options.protocols);
        this.socket.binaryType = this.options.binaryType || 'arraybuffer';
        
        logger.debug(LogCategory.CONNECTION, 'WebSocket instance created', {
          binaryType: this.socket.binaryType,
          protocols: this.options.protocols
        });
        
        // Set up connection timeout
        this.connectionTimeout = window.setTimeout(() => {
          if (this.state === ConnectionState.CONNECTING) {
            logger.error(LogCategory.CONNECTION, 'Connection timeout', {
              timeout: this.options.connectionTimeout
            });
            
            this.updateState(ConnectionState.ERROR);
            const error = new Error('Connection timeout');
            this.eventEmitter.emit('error', new ErrorEvent('error', { error }));
            this.cleanup();
            reject(error);
          }
        }, this.options.connectionTimeout);
        
        // Set up event listeners
        this.socket.addEventListener('open', (event) => {
          logger.info(LogCategory.CONNECTION, 'Connection established');
          this.handleOpen(event);
          resolve();
        });
        
        this.socket.addEventListener('close', (event) => {
          logger.info(LogCategory.CONNECTION, 'Connection closed', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
          });
          
          this.handleClose(event);
          if (this.state === ConnectionState.CONNECTING) {
            const error = new Error('Connection closed during initialization');
            logger.error(LogCategory.CONNECTION, 'Connection closed during initialization', {
              code: event.code,
              reason: event.reason
            });
            reject(error);
          }
        });
        
        this.socket.addEventListener('error', (event) => {
          logger.error(LogCategory.ERROR, 'WebSocket error', event);
          this.eventEmitter.emit('error', event);
          if (this.state === ConnectionState.CONNECTING) {
            this.updateState(ConnectionState.ERROR);
            reject(new Error('Error during WebSocket connection'));
          }
        });
        
        this.socket.addEventListener('message', (event) => {
          logger.debug(LogCategory.MESSAGE, 'Message received', {
            size: typeof event.data === 'string' ? 
              event.data.length : 
              (event.data instanceof ArrayBuffer ? event.data.byteLength : 'unknown')
          });
          
          this.handleMessage(event);
        });
        
      } catch (error) {
        logger.error(LogCategory.ERROR, 'Error creating WebSocket', error);
        this.updateState(ConnectionState.ERROR);
        this.cleanup();
        reject(error);
      }
    });
  }
  
  /**
   * Disconnect from the WebSocket server
   * @param code Close code
   * @param reason Close reason
   */
  disconnect(code: number = 1000, reason: string = 'Normal closure'): void {
    if (!this.socket || this.state === ConnectionState.DISCONNECTED || 
                        this.state === ConnectionState.CLOSING) {
      logger.debug(LogCategory.CONNECTION, 'Disconnect called but no active connection');
      return;
    }
    
    logger.info(LogCategory.CONNECTION, 'Disconnecting', { code, reason });
    this.updateState(ConnectionState.CLOSING);
    
    // Clear all timers
    this.cleanup();
    
    try {
      this.socket.close(code, reason);
    } catch (error) {
      logger.error(LogCategory.ERROR, 'Error closing WebSocket', error);
    } finally {
      this.socket = null;
      this.updateState(ConnectionState.DISCONNECTED);
    }
  }
  
  /**
   * Enable or disable automatic reconnection
   * @param enable Whether to enable auto-reconnection
   */
  setAutoReconnect(enable: boolean): void {
    logger.info(LogCategory.CONNECTION, `Auto-reconnect ${enable ? 'enabled' : 'disabled'}`);
    this.options.autoReconnect = enable;
  }
  
  /**
   * Handle WebSocket open event
   * @param event The open event
   */
  private handleOpen(event: Event): void {
    if (this.connectionTimeout !== null) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    this.reconnectAttempts = 0;
    this.updateState(ConnectionState.CONNECTED);
    this.eventEmitter.emit('open', event);
    this.startHeartbeat();
    
    logger.info(LogCategory.CONNECTION, 'Connection open handler complete');
  }
  
  /**
   * Handle WebSocket close event
   * @param event The close event
   */
  private handleClose(event: CloseEvent): void {
    this.cleanup();
    this.updateState(ConnectionState.DISCONNECTED);
    this.eventEmitter.emit('close', event);
    
    // Attempt to reconnect if needed
    if (this.shouldReconnect(event)) {
      logger.info(LogCategory.CONNECTION, 'Will attempt reconnection', {
        attempt: this.reconnectAttempts + 1,
        maxAttempts: this.options.maxReconnectAttempts
      });
      this.attemptReconnect();
    } else {
      logger.info(LogCategory.CONNECTION, 'No reconnection will be attempted', {
        reason: this.getNoReconnectReason(event)
      });
    }
  }
  
  /**
   * Get reason for not reconnecting
   * @param event The close event
   * @returns The reason for not reconnecting
   */
  private getNoReconnectReason(event: CloseEvent): string {
    if (!this.options.autoReconnect) {
      return 'autoReconnect disabled';
    }
    
    if (this.circuitOpen) {
      return 'circuit breaker open';
    }
    
    if (this.options.maxReconnectAttempts !== 0 && 
        this.reconnectAttempts >= this.options.maxReconnectAttempts!) {
      return 'max reconnect attempts reached';
    }
    
    if (event.code === 1000) {
      return 'normal closure';
    }
    
    return 'unknown';
  }
  
  /**
   * Handle WebSocket message event
   * @param event The message event
   */
  private handleMessage(event: MessageEvent): void {
    this.eventEmitter.emit('message', event);
    
    // If message is a heartbeat response, nothing more to do
    if (typeof event.data === 'string' && event.data === 'pong') {
      logger.debug(LogCategory.MESSAGE, 'Heartbeat response received');
      return;
    }
  }
  
  /**
   * Update the internal state and emit an event
   * @param newState The new state to set
   */
  private updateState(newState: ConnectionState): void {
    const oldState = this.state;
    this.state = newState;
    
    logger.info(LogCategory.STATE, `State changed: ${oldState} -> ${newState}`);
    
    this.eventEmitter.emit('state_change', new CustomEvent('state_change', { 
      detail: { oldState, newState } 
    }));
  }
  
  /**
   * Determine whether reconnection should be attempted
   * @param event The close event
   * @returns True if reconnection should be attempted
   */
  private shouldReconnect(event: CloseEvent): boolean {
    // Don't reconnect if auto-reconnect is disabled
    if (!this.options.autoReconnect) {
      return false;
    }
    
    // Don't reconnect if the circuit breaker is open
    if (this.circuitOpen) {
      return false;
    }
    
    // Don't reconnect if we've exceeded max attempts
    if (this.options.maxReconnectAttempts !== 0 && 
        this.reconnectAttempts >= this.options.maxReconnectAttempts!) {
      this.eventEmitter.emit('reconnect_failed', new CustomEvent('reconnect_failed'));
      return false;
    }
    
    // Don't reconnect on normal closure (code 1000)
    if (event.code === 1000) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Attempt to reconnect to the server
   */
  private attemptReconnect(): void {
    if (this.reconnectTimeout !== null) {
      clearTimeout(this.reconnectTimeout);
    }
    
    // Calculate backoff delay using exponential backoff
    const delay = Math.min(
      this.options.reconnectDelay! * Math.pow(1.5, this.reconnectAttempts),
      this.options.maxReconnectDelay!
    );
    
    logger.info(LogCategory.CONNECTION, `Reconnecting in ${delay}ms`, {
      attempt: this.reconnectAttempts + 1,
      maxAttempts: this.options.maxReconnectAttempts
    });
    
    this.updateState(ConnectionState.RECONNECTING);
    this.eventEmitter.emit('reconnecting', new CustomEvent('reconnecting', {
      detail: { attempt: this.reconnectAttempts + 1 }
    }));
    
    // Set up reconnection timeout
    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnectTimeout = null;
      this.reconnectAttempts++;
      
      // Check if circuit breaker should trip
      if (this.reconnectAttempts >= 3) {
        const failRate = 1.0; // All attempts have failed so far
        if (failRate > 0.75) {
          this.tripCircuitBreaker();
          return;
        }
      }
      
      // Attempt to connect
      this.connect().catch(error => {
        logger.error(LogCategory.CONNECTION, 'Reconnection failed', error);
        
        // Try again if we haven't exceeded max attempts
        if (this.shouldReconnect({ code: 0, reason: 'Reconnection failed', wasClean: false } as CloseEvent)) {
          this.attemptReconnect();
        } else {
          logger.warn(LogCategory.CONNECTION, 'Max reconnection attempts reached');
          this.eventEmitter.emit('reconnect_failed', new CustomEvent('reconnect_failed'));
        }
      });
    }, delay);
  }
  
  /**
   * Start the heartbeat mechanism
   */
  private startHeartbeat(): void {
    if (!this.options.heartbeatInterval || this.options.heartbeatInterval <= 0) {
      return;
    }
    
    logger.debug(LogCategory.CONNECTION, `Starting heartbeat at ${this.options.heartbeatInterval}ms intervals`);
    
    this.heartbeatInterval = window.setInterval(() => {
      if (this.socket && this.state === ConnectionState.CONNECTED) {
        try {
          this.socket.send('ping');
          logger.debug(LogCategory.MESSAGE, 'Heartbeat sent');
        } catch (error) {
          logger.error(LogCategory.ERROR, 'Error sending heartbeat', error);
          this.cleanup();
          
          // Connection is likely dead, attempt to reconnect
          if (this.shouldReconnect({ code: 0, reason: 'Heartbeat failed', wasClean: false } as CloseEvent)) {
            this.attemptReconnect();
          }
        }
      } else {
        this.cleanup();
      }
    }, this.options.heartbeatInterval);
  }
  
  /**
   * Clean up all timers and resources
   */
  private cleanup(): void {
    logger.debug(LogCategory.CONNECTION, 'Cleaning up resources');
    
    if (this.connectionTimeout !== null) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    if (this.reconnectTimeout !== null) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
  
  /**
   * Trip the circuit breaker to prevent further reconnection attempts
   */
  private tripCircuitBreaker(): void {
    logger.warn(LogCategory.CONNECTION, 'Circuit breaker tripped');
    
    this.circuitOpen = true;
    
    // Set up circuit reset timeout (30 seconds)
    this.circuitResetTimeout = window.setTimeout(() => {
      this.resetCircuitBreaker();
    }, 30000);
    
    this.eventEmitter.emit('circuit_open', new CustomEvent('circuit_open'));
  }
  
  /**
   * Reset the circuit breaker to allow reconnection attempts
   */
  private resetCircuitBreaker(): void {
    logger.info(LogCategory.CONNECTION, 'Circuit breaker reset');
    
    this.circuitOpen = false;
    
    if (this.circuitResetTimeout !== null) {
      clearTimeout(this.circuitResetTimeout);
      this.circuitResetTimeout = null;
    }
    
    this.eventEmitter.emit('circuit_close', new CustomEvent('circuit_close'));
  }
  
  /**
   * Generate a service ID for logging
   * @returns A unique service ID
   */
  private getServiceId(): string {
    // Truncate URL to max 15 chars and remove protocol
    const url = this.options.url
      .replace(/^(wss?:\/\/)/, '')
      .replace(/\/.*$/, '')
      .substring(0, 15);
    
    // Add a random suffix
    const randomId = Math.floor(Math.random() * 1000);
    return `${url}-${randomId}`;
  }
} 