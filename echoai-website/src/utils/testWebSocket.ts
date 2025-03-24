/**
 * WebSocket Test Utility
 * 
 * A simple utility to test WebSocket connections and debug issues.
 * Use this in the browser console or in a test script.
 */

import { 
  WebSocketService, 
  logger, 
  LogLevel, 
  LogCategory, 
  ConnectionState 
} from '../services/websocket';

/**
 * Test options for WebSocket connection
 */
export interface WebSocketTestOptions {
  url: string;
  timeout?: number;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  debugLevel?: LogLevel;
  heartbeatInterval?: number;
}

/**
 * Test a WebSocket connection and log the results
 * @param options Test options
 * @returns Promise that resolves when the test is complete
 */
export async function testWebSocketConnection(options: WebSocketTestOptions): Promise<boolean> {
  // Set debug level to maximum for the test
  logger.setLogLevel(options.debugLevel || LogLevel.TRACE);
  
  // Log test start
  logger.info(LogCategory.CONNECTION, 'WebSocket connection test started', options);
  
  // Default options
  const timeout = options.timeout || 5000;
  
  // Create the WebSocket service
  const ws = new WebSocketService({
    url: options.url,
    autoReconnect: options.autoReconnect !== undefined ? options.autoReconnect : true,
    maxReconnectAttempts: options.maxReconnectAttempts || 2,
    connectionTimeout: timeout,
    heartbeatInterval: options.heartbeatInterval || 0
  });
  
  // Track connection success
  let connectionSuccess = false;
  
  // Log all state changes
  ws.on('state_change', (event) => {
    const customEvent = event as CustomEvent;
    if (customEvent.detail?.newState === ConnectionState.CONNECTED) {
      connectionSuccess = true;
    }
  });
  
  // Try to connect
  try {
    await ws.connect();
    // Wait for a moment while connected
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } catch (error) {
    logger.error(LogCategory.ERROR, 'WebSocket connection test failed', error);
  } finally {
    // Always disconnect when done
    ws.disconnect();
    logger.info(LogCategory.CONNECTION, `WebSocket connection test complete. Success: ${connectionSuccess}`);
  }
  
  return connectionSuccess;
}

/**
 * Test sending a simple message
 * @param options Test options
 * @returns Promise that resolves when the test is complete
 */
export async function testWebSocketSend(options: WebSocketTestOptions): Promise<boolean> {
  // Set debug level to maximum for the test
  logger.setLogLevel(options.debugLevel || LogLevel.TRACE);
  
  // Log test start
  logger.info(LogCategory.CONNECTION, 'WebSocket send test started', options);
  
  // Default options
  const timeout = options.timeout || 5000;
  
  // Create the WebSocket service
  const ws = new WebSocketService({
    url: options.url,
    autoReconnect: false,
    connectionTimeout: timeout
  });
  
  // Track send success
  let sendSuccess = false;
  
  try {
    // Connect first
    await ws.connect();
    
    // Try to send a message
    await ws.send(JSON.stringify({
      type: 'test',
      timestamp: Date.now(),
      message: 'This is a test message'
    }));
    
    sendSuccess = true;
    logger.info(LogCategory.MESSAGE, 'Test message sent successfully');
  } catch (error) {
    logger.error(LogCategory.ERROR, 'WebSocket send test failed', error);
  } finally {
    // Always disconnect when done
    ws.disconnect();
    logger.info(LogCategory.MESSAGE, `WebSocket send test complete. Success: ${sendSuccess}`);
  }
  
  return sendSuccess;
}

// Add to window for easy browser console testing
if (typeof window !== 'undefined') {
  (window as any).testWebSocketConnection = testWebSocketConnection;
  (window as any).testWebSocketSend = testWebSocketSend;
  (window as any).webSocketLogger = logger;
  (window as any).LogLevel = LogLevel;
  (window as any).LogCategory = LogCategory;
  
  // Example usage instructions logged to console
  console.log('WebSocket Test Utilities available in window:');
  console.log('  - testWebSocketConnection({url: "wss://example.com/socket"})');
  console.log('  - testWebSocketSend({url: "wss://example.com/socket"})');
  console.log('  - webSocketLogger.setLogLevel(LogLevel.TRACE)');
} 