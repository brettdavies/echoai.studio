import { ConnectionState, WebSocketOptions } from './types';
import { EventEmitter } from './EventEmitter';
import { logger, LogCategory } from '../WebSocketLogger';
import { WebSocketService } from '../WebSocketService';
import { OutgoingHeartbeatMessageSchema, IncomingHeartbeatResponseSchema } from '../WebSocketSchemas';

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
    logger.info(LogCategory.WS, 'ConnectionManager created', { 
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
    // Check both state and socket readyState to ensure true connection
    const stateConnected = this.state === ConnectionState.CONNECTED;
    const socketConnected = !!this.socket && this.socket.readyState === WebSocket.OPEN;
    
    // Log any inconsistency
    if (stateConnected && !socketConnected) {
      logger.warn(LogCategory.WS, `Connection state inconsistency detected: state=${this.state}, socket=${this.socket?.readyState}`);
      
      // Update state to match reality if needed
      if (this.socket && this.socket.readyState !== WebSocket.CONNECTING) {
        this.updateState(ConnectionState.ERROR);
      }
      
      return false;
    }
    
    return stateConnected && socketConnected;
  }
  
  /**
   * Get the WebSocket instance
   * @returns The WebSocket instance or null if not connected
   */
  getSocket(): WebSocket | null {
    // Verify socket is still valid before returning
    if (this.socket && this.socket.readyState !== WebSocket.OPEN) {
      logger.warn(LogCategory.WS, `Socket requested but not in OPEN state: ${this.socket.readyState}`);
      
      // If closing/closed but state says connected, fix the inconsistency
      if (this.state === ConnectionState.CONNECTED) {
        logger.error(LogCategory.ERROR, `Socket state inconsistency detected: socket=${this.socket.readyState}, state=${this.state}`);
        
        // Force update state to match reality
        this.updateState(ConnectionState.ERROR);
        
        // Return null to prevent using invalid socket
        return null;
      }
    }
    
    return this.socket;
  }
  
  /**
   * Connect to the WebSocket server
   * @returns Promise that resolves when connected or rejects on timeout
   */
  connect(): Promise<void> {
    if (this.socket && (this.state === ConnectionState.CONNECTED || 
                        this.state === ConnectionState.CONNECTING)) {
      logger.debug(LogCategory.WS, 'Connection already in progress or established');
      return Promise.resolve();
    }
    
    // Reset circuit breaker if it was open
    if (this.circuitOpen) {
      this.resetCircuitBreaker();
    }
    
    logger.info(LogCategory.WS, 'Attempting connection', { url: this.options.url });
    
    return new Promise((resolve, reject) => {
      this.updateState(ConnectionState.CONNECTING);
      this.eventEmitter.emit('connecting', new Event('connecting'));
      
      try {
        // Create new WebSocket instance
        this.socket = new WebSocket(this.options.url, this.options.protocols);
        this.socket.binaryType = this.options.binaryType || 'arraybuffer';
        
        logger.debug(LogCategory.WS, 'WebSocket instance created', {
          binaryType: this.socket.binaryType,
          protocols: this.options.protocols
        });
        
        // Set up connection timeout
        this.connectionTimeout = window.setTimeout(() => {
          if (this.state === ConnectionState.CONNECTING) {
            logger.error(LogCategory.WS, 'Connection timeout', {
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
          logger.info(LogCategory.WS, 'Connection established');
          this.handleOpen(event);
          resolve();
        });
        
        this.socket.addEventListener('close', (event) => {
          logger.info(LogCategory.WS, 'Connection closed', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
          });
          
          this.handleClose(event);
          if (this.state === ConnectionState.CONNECTING) {
            const error = new Error('Connection closed during initialization');
            logger.error(LogCategory.WS, 'Connection closed during initialization', {
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
          logger.debug(LogCategory.WS, 'Message received', {
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
      logger.debug(LogCategory.WS, 'Disconnect called but no active connection');
      return;
    }
    
    logger.info(LogCategory.WS, 'Disconnecting', { code, reason });
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
    logger.info(LogCategory.WS, `Auto-reconnect ${enable ? 'enabled' : 'disabled'}`);
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
    
    logger.info(LogCategory.WS, 'Connection open handler complete');
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
      logger.info(LogCategory.WS, 'Will attempt reconnection', {
        attempt: this.reconnectAttempts + 1,
        maxAttempts: this.options.maxReconnectAttempts
      });
      this.attemptReconnect();
    } else {
      logger.info(LogCategory.WS, 'No reconnection will be attempted', {
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
    // First check if it's a heartbeat response
    if (typeof event.data === 'string') {
      try {
        const message = JSON.parse(event.data);
        if (message && message.type === 'heartbeat_response') {
          // This is a heartbeat response
          const heartbeatResponse = message as IncomingHeartbeatResponseSchema;
          const latency = heartbeatResponse.client_timestamp ? 
            (Date.now() - heartbeatResponse.client_timestamp) : 'unknown';
            
          logger.info(LogCategory.WS, 'Heartbeat response received', { 
            latency,
            serverTimestamp: heartbeatResponse.server_timestamp,
            clientTimestamp: heartbeatResponse.client_timestamp,
            connectionState: this.state,
            socketState: this.socket?.readyState
          });
          
          // Emit a heartbeat event that can be listened to for diagnostics
          this.eventEmitter.emit('heartbeat', new CustomEvent('heartbeat', {
            detail: { 
              latency, 
              serverTimestamp: heartbeatResponse.server_timestamp,
              clientTimestamp: heartbeatResponse.client_timestamp
            }
          }));
          
          return; // Don't forward heartbeat responses to application code
        }
        
        // Log all non-heartbeat JSON messages
        if (message && message.type) {
          // Log all message types explicitly with the WebSocket logger
          logger.info(LogCategory.WS, `Received ${message.type} message`, { 
            type: message.type,
            size: event.data.length,
            // Extract a subset of fields for logging - avoid sensitive data
            messageId: message.message_id,
            sampleCount: message.sample_count,
            // Include timestamp for time-sensitive messages
            timestamp: Date.now()
          });
        } else {
          // Unknown JSON structure
          logger.info(LogCategory.WS, 'Received unstructured JSON message', { 
            size: event.data.length,
            dataPreview: event.data.substring(0, 50) + '...'
          });
        }
      } catch (e) {
        // Not JSON, log as string
        logger.debug(LogCategory.WS, 'Received non-JSON string message', { 
          size: event.data.length,
          dataPreview: event.data.substring(0, 50) + '...'
        });
      }
    } else if (event.data instanceof ArrayBuffer) {
      // Log binary data
      logger.debug(LogCategory.WS, 'Received binary message', { 
        size: event.data.byteLength,
        type: 'ArrayBuffer'
      });
    } else if (event.data instanceof Blob) {
      // Log blob data
      logger.debug(LogCategory.WS, 'Received blob message', { 
        size: event.data.size,
        type: 'Blob',
        contentType: event.data.type || 'unknown'
      });
    }
    
    // Normal message handling
    this.eventEmitter.emit('message', event);
  }
  
  /**
   * Update the internal state and emit an event
   * @param newState The new state to set
   */
  private updateState(newState: ConnectionState): void {
    if (this.state === newState) return;
    
    const oldState = this.state;
    this.state = newState;
    
    logger.info(LogCategory.WS, `State changed: ${oldState} -> ${newState}`);
    
    // Emit state change event
    const event = new CustomEvent('state_change', {
      detail: { oldState, newState }
    });
    this.eventEmitter.emit('state_change', event);
    
    // Notify global listeners (new code)
    WebSocketService.notifyGlobalStateChange(event);
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
    
    logger.info(LogCategory.WS, `Reconnecting in ${delay}ms`, {
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
        logger.error(LogCategory.WS, 'Reconnection failed', error);
        
        // Try again if we haven't exceeded max attempts
        if (this.shouldReconnect({ code: 0, reason: 'Reconnection failed', wasClean: false } as CloseEvent)) {
          this.attemptReconnect();
        } else {
          logger.warn(LogCategory.WS, 'Max reconnection attempts reached');
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
    
    logger.info(LogCategory.WS, `Starting heartbeat mechanism at ${this.options.heartbeatInterval}ms intervals`);
    
    this.heartbeatInterval = window.setInterval(() => {
      if (this.socket && this.state === ConnectionState.CONNECTED) {
        try {
          // Create a proper heartbeat message
          const heartbeatMessage: OutgoingHeartbeatMessageSchema = {
            type: "heartbeat",
            timestamp: Date.now()
          };
          
          const messageText = JSON.stringify(heartbeatMessage);
          this.socket.send(messageText);
          
          logger.debug(LogCategory.WS, 'Heartbeat sent', { 
            timestamp: heartbeatMessage.timestamp,
            messageSize: messageText.length,
            connectionState: this.state,
            socketState: this.socket.readyState
          });
        } catch (error) {
          logger.error(LogCategory.ERROR, 'Error sending heartbeat', error);
          logger.info(LogCategory.WS, 'Connection appears to be broken, attempting to reconnect');
          this.cleanup();
          
          // Connection is likely dead, attempt to reconnect
          if (this.shouldReconnect({ code: 0, reason: 'Heartbeat failed', wasClean: false } as CloseEvent)) {
            this.attemptReconnect();
          }
        }
      } else {
        logger.warn(LogCategory.WS, 'Heartbeat skipped - socket not ready', {
          socketExists: !!this.socket,
          connectionState: this.state,
          socketState: this.socket ? this.socket.readyState : 'null'
        });
        this.cleanup();
      }
    }, this.options.heartbeatInterval);
  }
  
  /**
   * Clean up all timers and resources
   */
  private cleanup(): void {
    logger.debug(LogCategory.WS, 'Cleaning up resources');
    
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
    logger.warn(LogCategory.WS, 'Circuit breaker tripped');
    
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
    logger.info(LogCategory.WS, 'Circuit breaker reset');
    
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