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
  ConnectionState,
  createAudioMessage
} from '../services/websocket';
import { LogComponent } from './Logger';
import { networkLoggers } from './LoggerFactory';

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
  // Log test start
  logger.info(LogCategory.WS, 'WebSocket connection test started', options);
  
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
    logger.error(LogCategory.WS, 'WebSocket connection test failed', error);
  } finally {
    // Always disconnect when done
    ws.disconnect();
    logger.info(LogCategory.WS, `WebSocket connection test complete. Success: ${connectionSuccess}`);
  }
  
  return connectionSuccess;
}

/**
 * Test sending a simple message
 * @param options Test options
 * @returns Promise that resolves when the test is complete
 */
export async function testWebSocketSend(options: WebSocketTestOptions): Promise<boolean> {
  // Log test start
  logger.info(LogCategory.WS, 'WebSocket send test started', options);
  
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
    
    // Send a proper test message
    const testMessage = {
      type: 'test',
      timestamp: Date.now(),
      message: 'This is a test message'
    };
    
    await ws.send(JSON.stringify(testMessage));
    
    sendSuccess = true;
    logger.info(LogCategory.WS, 'Test message sent successfully');
  } catch (error) {
    logger.error(LogCategory.WS, 'WebSocket send test failed', error);
  } finally {
    // Always disconnect when done
    ws.disconnect();
    logger.info(LogCategory.WS, `WebSocket send test complete. Success: ${sendSuccess}`);
  }
  
  return sendSuccess;
}

/**
 * Simple direct WebSocket connection test with custom logger
 * Use this to debug connection failures when the server is down
 * @param url WebSocket server URL
 */
export function debugWebSocketFailure(url: string): void {
  logger.info(LogCategory.WS, `Attempting direct WebSocket connection to ${url}`);
  
  try {
    const socket = new WebSocket(url);
    
    socket.addEventListener('open', () => {
      logger.info(LogCategory.WS, `WebSocket connected successfully to ${url}`);
      setTimeout(() => socket.close(1000, "Debug test complete"), 1000);
    });
    
    socket.addEventListener('error', (event) => {
      logger.error(LogCategory.ERROR, `WebSocket connection error to ${url}`, event);
    });
    
    socket.addEventListener('close', (event) => {
      logger.info(
        LogCategory.WS, 
        `WebSocket connection closed: code=${event.code}, reason=${event.reason}, wasClean=${event.wasClean}`
      );
    });
    
    logger.debug(LogCategory.WS, `WebSocket object created, waiting for connection events...`);
  } catch (error) {
    logger.error(LogCategory.ERROR, `Error creating WebSocket:`, error);
  }
}

/**
 * Tests sending a known working message to the server
 * @param url The WebSocket URL to test
 * @returns Promise with result
 */
export async function testExactServerMessage(url: string): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  return new Promise((resolve) => {
    try {
      const socket = new WebSocket(url);
      let testSuccessful = false;
      let timeoutId: number | null = null;
      
      // Set timeout to force resolve
      timeoutId = window.setTimeout(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.close();
        }
        resolve({
          success: testSuccessful,
          message: testSuccessful ? 'Test successful' : 'Test timed out without receiving response',
          details: { testSuccessful }
        });
      }, 5000);
      
      socket.onopen = () => {
        // Create a test message with the helper function to ensure correct format
        const testMessage = createAudioMessage("AAAAAAAAAAAAAAAAAAAAAA==", 16000);
        
        // Send the message
        socket.send(JSON.stringify(testMessage));
        
        // Log the send
        networkLoggers.websocket.info('Test message sent to server:', testMessage);
      };
      
      socket.onmessage = (event) => {
        testSuccessful = true;
        networkLoggers.websocket.info('Received server response to test message:', event.data);
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        socket.close();
        resolve({
          success: true,
          message: 'Server responded to test message',
          details: { response: event.data }
        });
      };
      
      socket.onerror = (error) => {
        networkLoggers.websocket.error('Error during server test:', error);
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        socket.close();
        resolve({
          success: false,
          message: 'Error connecting to server',
          details: { error }
        });
      };
      
      socket.onclose = (event) => {
        if (!testSuccessful) {
          networkLoggers.websocket.warn('Connection closed without receiving response:', event);
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          resolve({
            success: false,
            message: 'Connection closed without receiving response',
            details: { 
              code: event.code,
              reason: event.reason,
              wasClean: event.wasClean
            }
          });
        }
      };
    } catch (error) {
      networkLoggers.websocket.error('Error creating test WebSocket:', error);
      resolve({
        success: false,
        message: 'Error creating test connection',
        details: { error }
      });
    }
  });
}

// Add test utilities to window object for console debugging
export function initializeGlobalTestUtilities(): void {
  (window as any).testWebSocketConnection = testWebSocketConnection;
  (window as any).testWebSocketSend = testWebSocketSend;
  (window as any).debugWebSocketFailure = debugWebSocketFailure;
  (window as any).webSocketLogger = logger;
  (window as any).LogLevel = LogLevel;
  (window as any).LogCategory = LogCategory;
  
  // Example usage instructions logged using proper logger
  networkLoggers.websocket.info('WebSocket Test Utilities available in window:');
  networkLoggers.websocket.info('  - testWebSocketConnection({url: "wss://example.com/socket"})');
  networkLoggers.websocket.info('  - testWebSocketSend({url: "wss://example.com/socket"})');
  networkLoggers.websocket.info('  - debugWebSocketFailure("wss://example.com/socket")');
  
  // Use logger instead of direct console logs
  networkLoggers.websocket.info('WebSocket Debug Tools available in console');
  networkLoggers.websocket.info('  - debugWebSocketFailure("wss://your-server.com/socket")');
  networkLoggers.websocket.info('  - testWebSocketConnection({url: "wss://your-server.com/socket"})');
}

// Initialize if in browser environment
if (typeof window !== 'undefined') {
  initializeGlobalTestUtilities();
  
  (window as any).testWebSocket = {
    testConnection: testWebSocketConnection,
    directTest: debugWebSocketFailure,
    testExactMessage: testExactServerMessage
  };
  
  networkLoggers.websocket.info('WebSocket Test Utilities available in window:');
  networkLoggers.websocket.info('  - testWebSocket.testConnection({url: "wss://example.com/socket"})');
  networkLoggers.websocket.info('  - testWebSocket.directTest("wss://example.com/socket")');
  networkLoggers.websocket.info('  - testWebSocket.testExactMessage("wss://example.com/socket")');
}

// Default export object with all test utilities
const testWebSocket = {
  testWebSocketConnection,
  testWebSocketSend,
  logger,
  LogLevel,
  LogCategory
};

export default testWebSocket; 