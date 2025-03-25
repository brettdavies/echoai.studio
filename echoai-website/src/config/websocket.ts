/**
 * WebSocket Configuration
 * 
 * Central configuration for WebSocket connection settings.
 * Modify these values to change the default WebSocket server connection.
 */

export const WS_CONFIG = {
  // WebSocket server host
  HOST: 'localhost',
  
  // WebSocket server port
  PORT: 8081,
  
  // Protocol (ws or wss)
  PROTOCOL: 'ws',
  
  /**
   * Get the full WebSocket URL
   * @returns The complete WebSocket URL (e.g., ws://localhost:8081)
   */
  getUrl(): string {
    return `${this.PROTOCOL}://${this.HOST}:${this.PORT}`;
  }
};

// Export a default URL for convenience
export const DEFAULT_WS_URL = WS_CONFIG.getUrl(); 