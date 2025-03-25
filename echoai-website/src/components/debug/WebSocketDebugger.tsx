import React, { useState, useEffect, useRef } from 'react';
import { 
  ConnectionState,
  LogLevel,
  LogCategory,
  logger
} from '../../services/websocket';
import { networkLoggers } from '../../utils/LoggerFactory';
import { 
  debugWebSocketFailure, 
  testWebSocketConnection,
  testExactServerMessage 
} from '../../utils/testWebSocket';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { generateAudioTestMessage, generateAudioTestMessageString } from '../../utils/AudioTestUtils';
import { 
  validateOutgoingAudioSchema, 
  createAudioMessage,
  OutgoingAudioMessageSchema
} from '../../services/websocket/WebSocketSchemas';
import { DEFAULT_WS_URL } from '../../config';

// Enhanced LogEntry interface with message type
interface LogEntry {
  timestamp: string;
  message: string;
  isError: boolean;
  isMessage?: boolean;
  direction?: 'sent' | 'received';
  data?: any;
}

interface WebSocketDebuggerProps {
  initialUrl?: string;
}

export const WebSocketDebugger: React.FC<WebSocketDebuggerProps> = ({ 
  initialUrl = DEFAULT_WS_URL
}) => {
  const [url, setUrl] = useState<string>(initialUrl);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const originalLogLevel = useRef<LogLevel>(LogLevel.INFO);
  const directSocketRef = useRef<WebSocket | null>(null);
  
  // Create a test message using the helper function to ensure correct schema
  const defaultMessage = createAudioMessage("UkVNT1ZFAA==", 16000);
  const [testMessage, setTestMessage] = useState<string>(JSON.stringify(defaultMessage, null, 2));
  
  const [lastStatusChange, setLastStatusChange] = useState<string>('');
  
  // Get WebSocket from context
  const { webSocketService, connectionState, connect, isConnected } = useWebSocket();
  
  // Update status state with timestamp
  const updateStatusChange = () => {
    setLastStatusChange(new Date().toLocaleTimeString());
  };

  // Track connection state changes
  useEffect(() => {
    updateStatusChange();
  }, [connectionState]);

  // Monitor webSocketService changes
  useEffect(() => {
    networkLoggers.websocket.debug(`WebSocketService changed: ${!!webSocketService}`);
  }, [webSocketService]);

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
    
    // Cleanup on unmount
    return () => {
      logger.removeLogHandler(logHandler);
    };
  }, []);

  // Set initial URL when it changes from props
  useEffect(() => {
    setUrl(initialUrl);
    
    // Reset connection status
    networkLoggers.websocket.debug(`WebSocketDebugger: initialUrl changed to ${initialUrl}`);
    updateStatusChange();
    
    // Add log about current context connection state
    const connectionInfo = `Current WebSocket context state: ${connectionState}, service available: ${!!webSocketService}`;
    networkLoggers.websocket.debug(connectionInfo);
    addLog(connectionInfo);
  }, [initialUrl, connectionState, webSocketService]);

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
        updateStatusChange();
      });
      
      socket.addEventListener('error', () => {
        updateStatusChange();
      });
      
      socket.addEventListener('close', (event) => {
        // Ensure status is updated when the connection is closed
        updateStatusChange();
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
      updateStatusChange();
    }
  };
  
  // Run direct server test with a known-good message format
  const runDirectServerTest = async () => {
    addLog('Running direct server test with minimal message...');
    networkLoggers.websocket.info(`Starting direct server test to ${url}`);
    
    const result = await testExactServerMessage(url);
    
    if (result.success) {
      addLog(`Server test SUCCEEDED: ${result.message}`, false);
    } else {
      addLog(`Server test FAILED: ${result.message}`, true);
    }
    
    networkLoggers.websocket.info('Direct server test completed:', result);
  };
  
  // Run test with WebSocketService
  const runServiceTest = async () => {
    try {
      networkLoggers.websocket.info(`Starting WebSocketService test to ${url}`);
      
      // Connect using the global context
      await connect(url);
      
      addLog(`Connected to WebSocket server at ${url}`);
      updateStatusChange();
    } catch (error) {
      addLog(`Error connecting to WebSocket server: ${error}`, true);
    }
  };

  // Send test message through WebSocketService
  const sendTestMessage = async () => {
    // Add debug log to check webSocketService
    networkLoggers.websocket.debug(`WebSocketDebugger.sendTestMessage: webSocketService=${!!webSocketService}, isConnected=${isConnected()}`);
    
    // Make sure we have a service
    if (!webSocketService) {
      addLog('No WebSocketService instance available. Run a connection test first.', true);
      return;
    }
    
    // Parse and validate the message from the textarea
    let messageToSend;
    try {
      // Parse the message from the textarea
      const parsedMessage = JSON.parse(testMessage);
      
      // Validate the message against our schema
      if (validateOutgoingAudioSchema(parsedMessage)) {
        messageToSend = parsedMessage;
        addLog('Message validated successfully against schema');
      } else {
        // If it's not valid, use the generator to create a valid one
        addLog('Message does not match required schema. Using generated message instead.', true);
        messageToSend = generateAudioTestMessage();
        // Update textarea with the correct message
        setTestMessage(JSON.stringify(messageToSend, null, 2));
      }
    } catch (parseError) {
      addLog(`Error parsing message JSON: ${parseError}. Using generated message.`, true);
      messageToSend = generateAudioTestMessage();
      // Update textarea with the correct message
      setTestMessage(JSON.stringify(messageToSend, null, 2));
    }
    
    try {
      addLog('Preparing to send message...');
      networkLoggers.websocket.info('Sending test message in exact server-compatible format');
            
      // Ensure connection is established
      if (!isConnected()) {
        addLog('WebSocket not connected, attempting to connect...');
        networkLoggers.websocket.info('WebSocket not connected, attempting to connect');
        
        try {
          await connect(url);
          addLog('Connection established successfully');
          
          // Wait a moment to ensure the connection is fully ready
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (connErr) {
          addLog(`Failed to establish connection: ${connErr}`, true);
          return;
        }
      }
      
      // Extra check before sending
      if (!isConnected()) {
        addLog('Still not connected after connection attempt. Cannot send message.', true);
        return;
      }
      
      // Debug log right before sending
      networkLoggers.websocket.debug(`About to send message, webSocketService=${!!webSocketService}, socket=${!!webSocketService?.getSocket()}`);
      
      // Stringify the message right before sending
      const messageString = JSON.stringify(messageToSend);
      
      // Send the message with custom timeout to prevent hanging
      addLog('Sending message now...');
      const sendPromise = webSocketService.send(messageString);
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Send operation timed out after 5 seconds')), 5000);
      });
      
      await Promise.race([sendPromise, timeoutPromise]);
      
      // Log the sent message
      addLog(`Message sent successfully: ${JSON.stringify(messageToSend, null, 2)}`, false, {
        isMessage: true,
        direction: 'sent',
        data: messageToSend
      });
    } catch (error) {
      addLog(`Error sending message: ${error}`, true);
      networkLoggers.websocket.error('Error in sendTestMessage:', error);
    }
  };

  // Generate a new random audio sample
  const generateAudioSample = () => {
    // Use the shared utility function
    const message = generateAudioTestMessage();
    
    // Log the exact format
    networkLoggers.websocket.info('Generated test audio message with exact server-compatible format', message);
    
    setTestMessage(JSON.stringify(message, null, 2));
  };

  // Add handler for server responses
  useEffect(() => {
    if (webSocketService) {
      const messageHandler = (event: Event) => {
        const msgEvent = event as MessageEvent;
        networkLoggers.websocket.info('Received server response:', { 
          type: typeof msgEvent.data,
          data: msgEvent.data
        });
      };
      
      webSocketService.on('message', messageHandler);
      
      return () => {
        webSocketService.off('message', messageHandler);
      };
    }
  }, [webSocketService]);

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-4">
      <h2 className="text-lg font-semibold text-white mb-4">WebSocket Debugger</h2>
      
      {/* Connection Status */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-3 h-3 rounded-full ${connectionState === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-white font-medium">Status: {connectionState}</span>
          <span className="text-xs text-gray-400">(Last changed: {lastStatusChange})</span>
        </div>
        <div className="text-xs text-gray-400 mt-1">
          Using URL: <span className="text-blue-400 font-mono">{url}</span>
        </div>
      </div>
      
      {/* Remove the WebSocket URL input and keep only the Connection Controls */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button 
          onClick={runServiceTest}
          className="p-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Connect Using Service
        </button>
        <button 
          onClick={runDirectTest}
          className="p-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        >
          Test Direct WebSocket
        </button>
      </div>

      <button 
        onClick={runDirectServerTest}
        className="w-full p-2 mb-4 bg-green-600 text-white text-sm rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
      >
        Test Server Message Handler
      </button>
      
      {/* Message Testing */}
      <div className="mb-4">
        <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-1">
          Test Message (JSON)
        </label>
        <textarea 
          id="message"
          value={testMessage}
          onChange={(e) => setTestMessage(e.target.value)}
          rows={6}
          className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-2 mt-2">
          <button 
            onClick={sendTestMessage}
            className="p-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            Send Message
          </button>
          <button 
            onClick={generateAudioSample}
            className="p-2 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
          >
            Generate Audio Sample
          </button>
        </div>
      </div>
      
      {/* Log Display */}
      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-1">WebSocket Logs</h3>
        <div className="bg-gray-900 rounded border border-gray-700 h-64 overflow-y-auto p-2 font-mono text-xs">
          {logs.map((log, index) => (
            <div 
              key={index} 
              className={`mb-1 ${log.isError ? 'text-red-400' : log.isMessage ? (log.direction === 'sent' ? 'text-blue-400' : 'text-green-400') : 'text-gray-300'}`}
            >
              <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
            </div>
          ))}
          {logs.length === 0 && (
            <div className="text-gray-500 italic">No logs yet. Try connecting to a WebSocket server.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WebSocketDebugger; 