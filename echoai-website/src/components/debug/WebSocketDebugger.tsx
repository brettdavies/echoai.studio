import React, { useState, useEffect, useRef } from 'react';
import { 
  WebSocketService, 
  ConnectionState,
  LogLevel,
  LogCategory,
  logger
} from '../../services/websocket';
import { networkLoggers } from '../../utils/LoggerFactory';
import { debugWebSocketFailure, testWebSocketConnection } from '../../utils/testWebSocket';

// Enhanced LogEntry interface with message type
interface LogEntry {
  timestamp: string;
  message: string;
  isError: boolean;
  isMessage?: boolean;
  direction?: 'sent' | 'received';
  data?: any;
}

export const WebSocketDebugger: React.FC = () => {
  const [url, setUrl] = useState<string>('ws://localhost:8080');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const originalLogLevel = useRef<LogLevel>(LogLevel.INFO);
  const webSocketServiceRef = useRef<WebSocketService | null>(null);
  const directSocketRef = useRef<WebSocket | null>(null);
  const [testMessage, setTestMessage] = useState<string>(JSON.stringify({
    type: "audio",
    value: "UkVNT1ZFAA==", // Base64 encoded placeholder data
    sample_rate: 16000
  }, null, 2));
  const [lastStatusChange, setLastStatusChange] = useState<string>('');
  
  // Update status state with timestamp
  const updateConnectionState = (state: ConnectionState) => {
    setConnectionState(state);
    setLastStatusChange(new Date().toLocaleTimeString());
  };

  // Add a log entry
  const addLog = (message: string, isError: boolean = false, options?: { isMessage?: boolean; direction?: 'sent' | 'received'; data?: any }) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prevLogs => [
      { 
        timestamp, 
        message, 
        isError, 
        isMessage: options?.isMessage || false,
        direction: options?.direction,
        data: options?.data
      },
      ...prevLogs.slice(0, 99) // Keep last 100 logs
    ]);
  };

  // Set up log capture on mount
  useEffect(() => {
    // Save original log level
    originalLogLevel.current = logger.getLogLevel();
    
    // Set to TRACE level for maximum detail
    logger.setLogLevel(LogLevel.TRACE);
    
    // Define our custom log handler
    const logHandler = (level: LogLevel, category: LogCategory, message: string, data?: any) => {
      // Only capture websocket related logs
      if (category === LogCategory.WS || category === LogCategory.ERROR) {
        const timestamp = new Date().toLocaleTimeString();
        const isError = level === LogLevel.ERROR;
        const dataStr = data ? ` ${JSON.stringify(data)}` : '';
        const fullMessage = `[${LogLevel[level]}] ${message}${dataStr}`;
        
        // Detect if this is a message log
        const isMessageLog = message.includes('Message received') || 
                            message.includes('Sending message') || 
                            message.includes('Message sent');
        
        let direction: 'sent' | 'received' | undefined = undefined;
        if (message.includes('received')) {
          direction = 'received';
        } else if (message.includes('sent') || message.includes('Sending')) {
          direction = 'sent';
        }
        
        setLogs(prevLogs => [
          { 
            timestamp, 
            message: fullMessage, 
            isError,
            isMessage: isMessageLog,
            direction,
            data
          },
          ...prevLogs.slice(0, 99) // Keep last 100 logs
        ]);
      }
    };
    
    // Register our log handler
    logger.addLogHandler(logHandler);
    
    // Set initial log entry
    addLog('WebSocket debugger initialized. Try connecting to a WebSocket server.', false);
    
    // Generate a fresh audio sample
    generateAudioSample();
    
    // Restore original settings on unmount
    return () => {
      logger.removeLogHandler(logHandler);
      logger.setLogLevel(originalLogLevel.current);
    };
  }, []);

  // Add this effect to listen for state changes from all test methods
  useEffect(() => {
    // Set up state change listener
    const handleStateChange = (event: any) => {
      if (event.detail && event.detail.newState) {
        updateConnectionState(event.detail.newState);
        
        // Log the state change
        const stateMessage = `Connection state changed to: ${event.detail.newState}`;
        networkLoggers.websocket.info(stateMessage);
      }
    };
    
    // Add the event listener to the global WebSocketService instance
    WebSocketService.addGlobalStateChangeListener(handleStateChange);
    
    // Clean up the listener on unmount
    return () => {
      WebSocketService.removeGlobalStateChangeListener(handleStateChange);
    };
  }, []);

  // Modify runDirectTest to update connection state
  const runDirectTest = () => {
    networkLoggers.websocket.info(`Starting direct WebSocket test to ${url}`);
    debugWebSocketFailure(url);
    
    // Close any existing socket
    if (directSocketRef.current) {
      directSocketRef.current.close();
      directSocketRef.current = null;
    }
    
    // Create a temporary WebSocket to track state directly
    try {
      const socket = new WebSocket(url);
      // Store reference
      directSocketRef.current = socket;
      
      socket.addEventListener('open', () => {
        updateConnectionState(ConnectionState.CONNECTED);
      });
      
      socket.addEventListener('error', () => {
        updateConnectionState(ConnectionState.ERROR);
      });
      
      socket.addEventListener('close', (event) => {
        // Ensure status is updated when the connection is closed
        updateConnectionState(ConnectionState.DISCONNECTED);
        directSocketRef.current = null;
        networkLoggers.websocket.info(`WebSocket connection closed: code=${event.code}, reason=${event.reason || 'No reason provided'}, wasClean=${event.wasClean}`);
      });
      
      // Add message event listener
      socket.addEventListener('message', (event) => {
        try {
          // Try to parse message as JSON
          let data;
          let displayData;
          if (typeof event.data === 'string') {
            try {
              data = JSON.parse(event.data);
              displayData = JSON.stringify(data, null, 2);
            } catch (e) {
              displayData = event.data;
              data = event.data;
            }
          } else if (event.data instanceof ArrayBuffer) {
            displayData = `Binary data (${event.data.byteLength} bytes)`;
            data = `<ArrayBuffer: ${event.data.byteLength} bytes>`;
          } else if (event.data instanceof Blob) {
            displayData = `Blob data (${event.data.size} bytes)`;
            data = `<Blob: ${event.data.size} bytes>`;
          }
          
          addLog(`Received message: ${displayData}`, false, { 
            isMessage: true, 
            direction: 'received',
            data 
          });
        } catch (error) {
          addLog(`Error handling received message: ${error}`, true);
        }
      });
    } catch (error) {
      updateConnectionState(ConnectionState.ERROR);
    }
  };

  // Run test with WebSocketService
  const runServiceTest = async () => {
    networkLoggers.websocket.info(`Starting WebSocketService test to ${url}`);
    
    // Create a temporary service to track state directly
    const service = new WebSocketService({
      url,
      autoReconnect: false,
      maxReconnectAttempts: 2
    });
    
    // Store service reference
    webSocketServiceRef.current = service;
    
    // Set up direct state tracking
    service.on('state_change', (event: any) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.newState) {
        updateConnectionState(customEvent.detail.newState);
      }
    });
    
    // Set up message tracking
    service.on('message', (event) => {
      try {
        // Cast event to MessageEvent to access data property
        const messageEvent = event as MessageEvent;
        // Try to parse message as JSON
        let data;
        let displayData;
        if (typeof messageEvent.data === 'string') {
          try {
            data = JSON.parse(messageEvent.data);
            displayData = JSON.stringify(data, null, 2);
          } catch (e) {
            displayData = messageEvent.data;
            data = messageEvent.data;
          }
        } else if (messageEvent.data instanceof ArrayBuffer) {
          displayData = `Binary data (${messageEvent.data.byteLength} bytes)`;
          data = `<ArrayBuffer: ${messageEvent.data.byteLength} bytes>`;
        } else if (messageEvent.data instanceof Blob) {
          displayData = `Blob data (${messageEvent.data.size} bytes)`;
          data = `<Blob: ${messageEvent.data.size} bytes>`;
        } else {
          displayData = "Unknown data format";
          data = messageEvent.data;
        }
        
        addLog(`Received message: ${displayData}`, false, { 
          isMessage: true, 
          direction: 'received',
          data 
        });
      } catch (error) {
        addLog(`Error handling received message: ${error instanceof Error ? error.message : String(error)}`, true);
      }
    });
    
    // Handle close events
    service.on('close', (event) => {
      // Make sure state is updated when connection is closed
      updateConnectionState(ConnectionState.DISCONNECTED);
      
      // Log close details
      const closeEvent = event as CloseEvent;
      networkLoggers.websocket.info(`WebSocket connection closed: code=${closeEvent.code}, reason=${closeEvent.reason || 'No reason provided'}, wasClean=${closeEvent.wasClean}`);
    });
    
    try {
      // Try to connect
      await service.connect();
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Don't disconnect automatically - keep the connection open for testing
    } catch (error) {
      networkLoggers.websocket.error(`WebSocketService test failed: ${error instanceof Error ? error.message : String(error)}`);
      service.disconnect();
      webSocketServiceRef.current = null;
    }
  };

  // Add a new test method using the static WebSocketService method
  const runStaticTest = async () => {
    networkLoggers.websocket.info(`Starting static WebSocketService test to ${url}`);
    
    // Set connecting state
    updateConnectionState(ConnectionState.CONNECTING);
    
    try {
      const result = await WebSocketService.testConnection(url);
      
      if (result.success) {
        networkLoggers.websocket.info(`Static test SUCCESS: Connected to ${url}`, result.details);
        updateConnectionState(ConnectionState.CONNECTED);
        
        // Set back to disconnected after a short delay
        setTimeout(() => {
          networkLoggers.websocket.info('Static test completed: marking connection as disconnected');
          updateConnectionState(ConnectionState.DISCONNECTED);
        }, 2000);
      } else {
        networkLoggers.websocket.error(`Static test FAILED: ${result.error}`, result.details);
        updateConnectionState(ConnectionState.ERROR);
        
        // Set back to disconnected after a short delay
        setTimeout(() => {
          networkLoggers.websocket.info('Static test error state cleared: marking connection as disconnected');
          updateConnectionState(ConnectionState.DISCONNECTED);
        }, 2000);
      }
    } catch (error) {
      networkLoggers.websocket.error(`Static test FAILED with exception: ${error instanceof Error ? error.message : String(error)}`);
      updateConnectionState(ConnectionState.ERROR);
      
      // Set back to disconnected after a short delay
      setTimeout(() => {
        updateConnectionState(ConnectionState.DISCONNECTED);
      }, 2000);
    }
  };
  
  // Send a test message using the current WebSocketService
  const sendTestMessage = async () => {
    if (!webSocketServiceRef.current || !webSocketServiceRef.current.isConnected()) {
      addLog('Cannot send message: No active WebSocket connection. Run Service Test first.', true);
      return;
    }
    
    try {
      // Try to validate JSON
      let messageData: string;
      try {
        const parsed = JSON.parse(testMessage);
        messageData = JSON.stringify(parsed);
      } catch (e) {
        // If not valid JSON, send as plain text
        messageData = testMessage;
      }
      
      // Send the message
      await webSocketServiceRef.current.send(messageData, 2, true);
      addLog(`Sent message: ${messageData}`, false, { 
        isMessage: true, 
        direction: 'sent',
        data: messageData
      });
    } catch (error) {
      addLog(`Error sending message: ${error instanceof Error ? error.message : String(error)}`, true);
    }
  };

  // Clear logs
  const clearLogs = () => {
    setLogs([]);
    networkLoggers.websocket.info('Logs cleared');
  };
  
  // Disconnect the current WebSocketService
  const disconnect = () => {
    let disconnected = false;
    
    // Close WebSocketService if active
    if (webSocketServiceRef.current) {
      webSocketServiceRef.current.disconnect();
      webSocketServiceRef.current = null;
      disconnected = true;
      addLog('WebSocketService connection closed manually', false);
    }
    
    // Close direct WebSocket if active
    if (directSocketRef.current) {
      directSocketRef.current.close();
      directSocketRef.current = null;
      disconnected = true;
      addLog('Direct WebSocket connection closed manually', false);
    }
    
    if (disconnected) {
      updateConnectionState(ConnectionState.DISCONNECTED);
    } else {
      addLog('No active connections to disconnect', false);
    }
  };

  // Generate a new audio data sample
  const generateAudioSample = () => {
    // Create a small array of random PCM samples (16-bit integers between -32768 and 32767)
    const sampleLength = 32;
    const audioArray = new Int16Array(sampleLength);
    
    // Fill with random values
    for (let i = 0; i < sampleLength; i++) {
      audioArray[i] = Math.floor(Math.random() * 65536 - 32768);
    }
    
    // Convert to base64
    const buffer = audioArray.buffer;
    const base64Data = btoa(
      new Uint8Array(buffer)
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    
    // Create a new message with the proper schema
    const newMessage = {
      type: 'audio',
      value: base64Data,
      sample_rate: 16000
    };
    
    // Set as the new test message
    setTestMessage(JSON.stringify(newMessage, null, 2));
    addLog('Generated new base64-encoded audio sample (16kHz PCM)', false);
  };

  return (
    <section className="container mx-auto mt-6 mb-10">
      <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gray-700 px-4 py-3 border-b border-gray-600">
          <h2 className="text-xl font-semibold text-white">WebSocket Debugger</h2>
        </div>
        
        <div className="p-4">
          {/* Connection form */}
          <div className="mb-4 flex flex-wrap gap-2">
            <input 
              type="text" 
              value={url} 
              onChange={(e) => setUrl(e.target.value)}
              className="flex-grow p-2 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="WebSocket URL (ws://audio-streaming.echoai.studio/stream)"
            />
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={runDirectTest}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                title="Tests WebSocket connection using native browser WebSocket API directly, without any wrappers or service layers"
              >
                Direct Test
              </button>
              <button 
                onClick={runServiceTest}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                title="Tests WebSocket connection using our WebSocketService implementation with proper connection management"
              >
                Service Test
              </button>
              <button 
                onClick={runStaticTest}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                title="Tests connection using WebSocketService.testConnection() static method with automatic cleanup"
              >
                Static Test
              </button>
              <button 
                onClick={disconnect}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                title="Disconnect any active WebSocket connection"
              >
                Disconnect
              </button>
              <button 
                onClick={clearLogs}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                title="Clear all log entries from the display"
              >
                Clear Logs
              </button>
            </div>
          </div>
          
          {/* Test message input */}
          <div className="mb-4 flex flex-wrap gap-2">
            <textarea 
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              className="flex-grow p-2 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter audio data message (JSON format)"
              rows={3}
            />
            <div className="flex flex-col gap-2">
              <button 
                onClick={sendTestMessage}
                disabled={!webSocketServiceRef.current || !webSocketServiceRef.current.isConnected()}
                className={`px-4 py-2 text-white rounded transition-colors ${
                  webSocketServiceRef.current && webSocketServiceRef.current.isConnected() 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-gray-500 cursor-not-allowed'
                }`}
                title="Send this message to the connected WebSocket server"
              >
                Send Message
              </button>
              <button 
                onClick={generateAudioSample}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                title="Generate a new random audio sample"
              >
                Generate Sample
              </button>
            </div>
          </div>
          
          {/* Status indicator */}
          <div className="mb-4 flex items-center gap-2 text-white">
            <div className={`w-3 h-3 rounded-full ${
              connectionState === ConnectionState.CONNECTED ? 'bg-green-500 animate-pulse' :
              connectionState === ConnectionState.CONNECTING ? 'bg-yellow-500 animate-pulse' :
              connectionState === ConnectionState.RECONNECTING ? 'bg-yellow-500 animate-pulse' :
              connectionState === ConnectionState.ERROR ? 'bg-red-500 animate-pulse' :
              'bg-red-500'
            }`}></div>
            <span className="font-semibold">
              Status: <span className={
                connectionState === ConnectionState.CONNECTED ? 'text-green-400' : 
                connectionState === ConnectionState.CONNECTING || connectionState === ConnectionState.RECONNECTING ? 'text-yellow-400' :
                'text-red-400'
              }>{connectionState}</span>
              {lastStatusChange && (
                <span className="ml-2 text-xs text-gray-400">
                  (updated at {lastStatusChange})
                </span>
              )}
            </span>
          </div>
          
          {/* Log display */}
          <div className="border border-gray-600 rounded bg-black text-white p-2 h-80 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <div className="text-gray-500 p-2">No logs yet. Run a test to see results.</div>
            ) : (
              logs.map((log, index) => (
                <div 
                  key={index} 
                  className={`${
                    log.isMessage 
                      ? log.direction === 'sent' ? 'text-blue-400 bg-blue-900/20' : 'text-green-400 bg-green-900/20'
                      : log.isError ? 'text-red-400' : 'text-gray-300'
                  } mb-1 px-2 py-1 ${index % 2 === 0 ? 'bg-opacity-10 bg-white' : ''}`}
                >
                  <span className="text-gray-400">[{log.timestamp}]</span> {log.message}
                  {log.isMessage && log.data && typeof log.data === 'object' && (
                    <pre className="ml-4 mt-1 text-xs overflow-x-auto">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
          
          <div className="mt-4 text-sm text-gray-400">
            <p>
              <strong>Note:</strong> The WebSocket Debugger now shows WebSocket messages in different colors:
              <span className="inline-block ml-2 px-2 bg-blue-900/20 text-blue-400">Sent messages</span>
              <span className="inline-block ml-2 px-2 bg-green-900/20 text-green-400">Received messages</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WebSocketDebugger; 