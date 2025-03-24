import React, { useState } from 'react';
import DashAudioPlayer from '../components/DashAudioPlayer';
import WebSocketDebugger from '../components/debug/WebSocketDebugger';
import { Link } from 'react-router-dom';

const WebSocketTestPage: React.FC = () => {
  const [wsUrl, setWsUrl] = useState<string>('ws://localhost:8080');
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
      <header className="bg-gray-800 p-4 shadow-md flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">WebSocket Test Page</h1>
          <p className="text-sm text-gray-400">Development environment only</p>
        </div>
        <Link 
          to="/" 
          className="px-3 py-1 text-sm font-medium bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          Back to Home
        </Link>
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
              placeholder="ws://localhost:8080"
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            This URL will be used by both the DashAudioPlayer for streaming and the WebSocketDebugger for testing.
          </p>
        </section>
        
        {/* DashAudioPlayer */}
        <section className="bg-gray-800 p-4 rounded-lg shadow-lg">
          <h2 className="text-lg font-semibold text-white mb-4">Audio Player</h2>
          <DashAudioPlayer 
            url="https://a.files.bbci.co.uk/ms6/live/3441A116-B12E-4D2F-ACA8-C1984642FA4B/audio/simulcast/dash/nonuk/pc_hd_abr_v2/cfsgc/bbc_world_service_news_internet.mpd"
            streamingEnabled={true}
            streamingUrl={wsUrl} 
            onStreamingStatusChange={(status, message) => {
              console.log(`Streaming status: ${status}`, message);
            }}
          />
        </section>
        
        {/* WebSocketDebugger */}
        <section>
          <WebSocketDebugger initialUrl={wsUrl} />
        </section>
      </div>
    </div>
  );
};

export default WebSocketTestPage; 