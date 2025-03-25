import { WebSocketEventType, WebSocketEventHandler } from './types';
import { logger, LogCategory } from '../WebSocketLogger';

/**
 * EventEmitter for WebSocket events
 * Handles subscription and notification for WebSocket events
 */
export class EventEmitter {
  private eventHandlers: Map<WebSocketEventType, Set<WebSocketEventHandler>> = new Map();
  
  /**
   * Creates a new EventEmitter
   */
  constructor() {
    // Initialize event handler collections
    const eventTypes: WebSocketEventType[] = [
      'open', 'close', 'error', 'message', 
      'connecting', 'reconnecting', 'reconnect_failed', 'state_change'
    ];
    
    eventTypes.forEach(type => {
      this.eventHandlers.set(type, new Set());
    });
  }
  
  /**
   * Add an event listener
   * @param type Event type
   * @param handler Event handler function
   */
  on(type: WebSocketEventType, handler: WebSocketEventHandler): void {
    const handlers = this.eventHandlers.get(type);
    if (handlers) {
      handlers.add(handler);
    }
  }
  
  /**
   * Remove an event listener
   * @param type Event type
   * @param handler Event handler function
   */
  off(type: WebSocketEventType, handler: WebSocketEventHandler): void {
    const handlers = this.eventHandlers.get(type);
    if (handlers) {
      handlers.delete(handler);
    }
  }
  
  /**
   * Emit an event to all registered handlers
   * @param type Event type
   * @param event Event object
   */
  emit(type: WebSocketEventType, event: Event | MessageEvent | CloseEvent): void {
    const handlers = this.eventHandlers.get(type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          logger.error(LogCategory.ERROR, `Error in WebSocket ${type} event handler`, error);
        }
      });
    }
  }
} 