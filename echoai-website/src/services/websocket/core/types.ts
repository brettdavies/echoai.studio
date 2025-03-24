/**
 * WebSocket service types module
 * Contains all types related to the WebSocket service
 */

/**
 * Connection states for the WebSocket state machine
 */
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  CLOSING = 'closing',
  ERROR = 'error'
}

/**
 * Configuration options for the WebSocket service
 */
export interface WebSocketOptions {
  // Server URL to connect to
  url: string;
  
  // Initial connection timeout in ms
  connectionTimeout?: number;
  
  // Heartbeat interval in ms (0 to disable)
  heartbeatInterval?: number;
  
  // Max reconnection attempts (0 for infinite)
  maxReconnectAttempts?: number;
  
  // Base delay between reconnection attempts in ms
  reconnectDelay?: number;
  
  // Maximum backoff delay for reconnection in ms
  maxReconnectDelay?: number;
  
  // Enable binary message support
  binaryType?: BinaryType;
  
  // Protocol strings to use
  protocols?: string | string[];
  
  // Auto-reconnect when connection is lost
  autoReconnect?: boolean;
}

/**
 * Default WebSocket configuration
 */
export const DEFAULT_OPTIONS: Partial<WebSocketOptions> = {
  connectionTimeout: 10000,      // 10 seconds
  heartbeatInterval: 30000,      // 30 seconds
  maxReconnectAttempts: 10,
  reconnectDelay: 1000,          // Start with 1 second
  maxReconnectDelay: 30000,      // Max 30 seconds
  binaryType: 'arraybuffer',
  autoReconnect: true
};

/**
 * Internal message queue item format
 */
export interface QueuedMessage {
  data: string | ArrayBuffer | Blob;
  priority: number;
  timestamp: number;
  retry?: boolean;
}

/**
 * Event types emitted by the WebSocket service
 */
export type WebSocketEventType = 
  | 'open' 
  | 'close' 
  | 'error' 
  | 'message' 
  | 'connecting'
  | 'reconnecting'
  | 'reconnect_failed'
  | 'state_change';

/**
 * Event handler function type
 */
export type WebSocketEventHandler = (event: Event | MessageEvent | CloseEvent, ...args: any[]) => void; 