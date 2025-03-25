import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { WebSocketService, ConnectionState, LogCategory } from '../services/websocket';
import WebSocketManager from '../services/websocket/WebSocketManager';
import { networkLoggers } from '../utils/LoggerFactory';
import { DEFAULT_WS_URL } from '../config';

// Context type definition
interface WebSocketContextType {
  webSocketService: WebSocketService | null;
  connectionState: ConnectionState;
  url: string | null;
  connect: (url: string) => Promise<void>;
  disconnect: () => void;
  isConnected: () => boolean;
  reconnect: () => Promise<void>;
}

// Create context with default values
const WebSocketContext = createContext<WebSocketContextType>({
  webSocketService: null,
  connectionState: ConnectionState.DISCONNECTED,
  url: null,
  connect: async () => {},
  disconnect: () => {},
  isConnected: () => false,
  reconnect: async () => {}
});

// Custom hook for easy context consumption
export const useWebSocket = () => useContext(WebSocketContext);

interface WebSocketProviderProps {
  children: React.ReactNode;
  initialUrl?: string;
}

// Provider component
export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ 
  children,
  initialUrl = DEFAULT_WS_URL
}) => {
  // Get the singleton WebSocketManager
  const manager = WebSocketManager.getInstance();
  
  // State for context values
  const [webSocketService, setWebSocketService] = useState<WebSocketService | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [url, setUrl] = useState<string | null>(initialUrl || null);
  
  // Initialize the service if initial URL is provided
  useEffect(() => {
    if (initialUrl) {
      // Get or initialize the service
      const service = manager.getService(initialUrl, {
        autoReconnect: true,
        maxReconnectAttempts: 5,
        connectionTimeout: 15000 // 15 seconds timeout
      });
      
      // Set up state change listener
      service.on('state_change', (event: any) => {
        const customEvent = event as CustomEvent;
        if (customEvent.detail?.newState) {
          const newState = customEvent.detail.newState as ConnectionState;
          setConnectionState(newState);
          networkLoggers.websocket.info(`WebSocket state changed to: ${newState}`);
        }
      });
      
      // Store in state
      setWebSocketService(service);
      setUrl(initialUrl);
      
      // Sync the connection state
      setConnectionState(service.getState());
    }
  }, [initialUrl]);
  
  // Method to connect to a specific URL
  const connect = async (serverUrl: string): Promise<void> => {
    try {
      networkLoggers.websocket.info(`Connecting to WebSocket at ${serverUrl}`);
      
      // Get or create service through the manager
      const service = manager.getService(serverUrl, {
        autoReconnect: true,
        maxReconnectAttempts: 5,
        connectionTimeout: 15000
      });
      
      // Set up state change listener if it's a new service
      if (service !== webSocketService) {
        service.on('state_change', (event: any) => {
          const customEvent = event as CustomEvent;
          if (customEvent.detail?.newState) {
            const newState = customEvent.detail.newState as ConnectionState;
            setConnectionState(newState);
            networkLoggers.websocket.info(`WebSocket state changed to: ${newState}`);
          }
        });
        
        // Update state with new service
        setWebSocketService(service);
        setUrl(serverUrl);
      }
      
      // Connect if not already connected
      if (!service.isConnected()) {
        await manager.connect(serverUrl);
        networkLoggers.websocket.info('Successfully connected to WebSocket server');
      } else {
        networkLoggers.websocket.info('WebSocket already connected');
      }
    } catch (error) {
      networkLoggers.websocket.error('Failed to connect to WebSocket server', error);
      throw error;
    }
  };
  
  // Method to disconnect
  const disconnect = (): void => {
    networkLoggers.websocket.info('Disconnecting WebSocket');
    manager.disconnect();
  };
  
  // Method to reconnect
  const reconnect = async (): Promise<void> => {
    if (url) {
      networkLoggers.websocket.info('Reconnecting WebSocket');
      await manager.connect(url);
    } else {
      networkLoggers.websocket.warn('Cannot reconnect: No URL provided');
      throw new Error('Cannot reconnect: No URL provided');
    }
  };
  
  // Method to check connection state
  const isConnected = (): boolean => {
    return manager.isConnected();
  };
  
  // Context value
  const contextValue: WebSocketContextType = {
    webSocketService,
    connectionState,
    url,
    connect,
    disconnect,
    isConnected,
    reconnect
  };
  
  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketContext; 