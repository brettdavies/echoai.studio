import React, { useState, useEffect } from 'react';
import DashAudioPlayer from '../components/DashAudioPlayer';
import { WebSocketDebugger } from '../components/debug/WebSocketDebugger';
import { Link } from 'react-router-dom';
import { useWebSocket } from '../contexts/WebSocketContext';
import { networkLoggers } from '../utils/LoggerFactory';
import { DEFAULT_WS_URL } from '../config';

const WebSocketTestPage: React.FC = () => {
  const [wsUrl, setWsUrl] = useState<string>(DEFAULT_WS_URL);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const { connectionState, connect, isConnected } = useWebSocket();
  
  // Connect to WebSocket when URL changes
  useEffect(() => {
    const initializeWebSocket = async () => {
      setIsInitializing(true);
      try {
        networkLoggers.websocket.debug(`WebSocketTestPage: Initializing WebSocket with URL ${wsUrl}, current connection status: ${isConnected()}`);
        
        // Add a small delay to ensure context is fully initialized
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!isConnected()) {
          networkLoggers.websocket.debug(`WebSocketTestPage: Connecting to ${wsUrl}...`);
          await connect(wsUrl);
          networkLoggers.websocket.debug(`WebSocketTestPage: Connected successfully to ${wsUrl}`);
        } else {
          networkLoggers.websocket.debug(`WebSocketTestPage: Already connected to ${wsUrl}`);
        }
      } catch (error) {
        networkLoggers.websocket.error('WebSocketTestPage: Failed to connect to WebSocket:', error);
      } finally {
        setIsInitializing(false);
      }
    };
    
    initializeWebSocket();
  }, [wsUrl, connect, isConnected]);
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
      <header className="bg-gray-800 p-4 shadow-md flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">WebSocket Test Page</h1>
          <p className="text-sm text-gray-400">Development environment only</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1 text-sm font-medium rounded-lg ${
            isInitializing ? 'bg-yellow-700 text-white' :
            connectionState === 'connected' 
              ? 'bg-green-700 text-white' 
              : 'bg-red-700 text-white'
          }`}>
            {isInitializing ? 'Initializing...' : 
             connectionState === 'connected' ? 'Connected' : 'Disconnected'}
          </div>
          <Link 
            to="/" 
            className="px-3 py-1 text-sm font-medium bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </header>
      
      <div className="container mx-auto p-6 flex flex-col gap-8">
        {/* WebSocket URL Configuration */}
        <section className="bg-gray-800 p-4 rounded-lg shadow-lg">
          <h2 className="text-lg font-semibold text-white mb-2">WebSocket Configuration</h2>
          <div className="flex items-center gap-3">
            <label className="text-white text-sm">WebSocket URL:</label>
            <input
              type="text"
              value={wsUrl}
              onChange={(e) => setWsUrl(e.target.value)}
              className="flex-grow p-2 rounded bg-gray-700 border border-gray-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={DEFAULT_WS_URL}
              disabled={isInitializing}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            This URL will be used by both the DashAudioPlayer for streaming and the WebSocketDebugger for testing.
          </p>
        </section>
        
        {/* Only show components once initialization is complete */}
        {!isInitializing && (
          <>
            {/* DashAudioPlayer */}
            <section className="bg-gray-800 p-4 rounded-lg shadow-lg">
              <h2 className="text-lg font-semibold text-white mb-4">Audio Player</h2>
              <DashAudioPlayer 
                url="https://a.files.bbci.co.uk/ms6/live/3441A116-B12E-4D2F-ACA8-C1984642FA4B/audio/simulcast/dash/nonuk/pc_hd_abr_v2/cfsgc/bbc_world_service_news_internet.mpd"
                streamingEnabled={true}
                streamingUrl={wsUrl} 
                onStreamingStatusChange={(status, message) => {
                  networkLoggers.websocket.info(`Streaming status: ${status}`, message);
                }}
              />
              <p className="text-xs text-white mt-2">
                Connection status: <span className={connectionState === 'connected' ? 'text-green-400' : 'text-red-400'}>{connectionState}</span>
              </p>
            </section>
            
            {/* WebSocketDebugger */}
            <section>
              <WebSocketDebugger initialUrl={wsUrl} />
            </section>
          </>
        )}
        
        {isInitializing && (
          <div className="bg-gray-800 p-4 rounded-lg shadow-lg text-center">
            <p className="text-white">Initializing WebSocket connection...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WebSocketTestPage; 