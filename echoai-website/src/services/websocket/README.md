# WebSocket Services and Audio Processing

This module provides tools for WebSocket communication and audio processing, with a focus on streaming audio data to external servers.

## Module Structure

```plaintext
websocket/
├── WebSocketLogger.ts   # Shared logger for the entire module
├── WebSocketService.ts  # Primary service for WebSocket communication
├── StreamingAudioProcessor.ts  # Processes and streams audio data
├── core/               # Core WebSocket functionality
│   ├── ConnectionManager.ts    # Manages WebSocket connection lifecycle
│   ├── EventEmitter.ts         # Event handling utilities
│   ├── MessageQueue.ts         # Message prioritization and queueing
│   └── types.ts                # Shared type definitions
└── audio/              # Audio streaming functionality
    ├── AudioStreamingBridge.ts # Thin adapter between audio and WebSocket
    ├── AudioUtils.ts           # Audio processing utilities
    ├── MessageFormatter.ts     # Message creation utilities
    └── types.ts                # Audio-specific type definitions
```

## Logging System

The WebSocket module uses a specialized logger that extends the shared application logger. It's designed to provide detailed logging for both WebSocket communication and audio processing.

```typescript
import { logger, audioLogger, LogLevel, LogCategory } from '../services/websocket';

// WebSocket-specific logging
logger.logConnection(LogLevel.INFO, 'Connecting to server', { url });
logger.logMessage(LogLevel.DEBUG, 'Message received', { size: data.length });

// Audio-specific logging (uses specialized audio logger)
audioLogger.logProcessor(LogLevel.INFO, 'Audio processor initialized');
audioLogger.logWasm(LogLevel.DEBUG, 'WASM module loaded');
audioLogger.logResampler(LogLevel.INFO, 'Sample rate conversion completed');
```

## Streaming Audio Processing

The audio streaming system integrates with the logging system to provide detailed debugging information.

```typescript
import { createAudioStreaming, LogLevel } from '../services/websocket';

// Create a streaming processor with logging configuration
const processor = createAudioStreaming({
  serverUrl: 'wss://audio-server.example.com',
  processingOptions: {
    // Audio processing options
  },
  debug: true, // Enable debug mode (sets log level to TRACE)
  loggerOptions: {
    level: LogLevel.DEBUG,
    enableWasm: true,
    enableResampler: true,
    enableWorklet: true,
    enableProcessor: true
  }
});
```

## Using the Logger in WebAssembly and RubberBand Components

When working with WebAssembly or RubberBand components, use the appropriate logging methods:

```typescript
// In a WebAssembly module wrapper
import { audioLogger, LogLevel } from '../services/websocket';

export class WasmModule {
  async initialize() {
    try {
      audioLogger.logWasm(LogLevel.INFO, 'Initializing WASM module');
      // ... initialization code
      audioLogger.logWasm(LogLevel.INFO, 'WASM module initialized successfully');
    } catch (error) {
      audioLogger.logWasm(LogLevel.ERROR, 'Failed to initialize WASM module', error);
      throw error;
    }
  }
}

// In a RubberBand wrapper
export class RubberBandResampler {
  resample(input: Float32Array): Float32Array {
    audioLogger.logResampler(LogLevel.DEBUG, 'Resampling audio data', { 
      inputSize: input.length 
    });
    // ... resampling logic
    return output;
  }
}
```

## Advanced WebSocket Features

The WebSocket service includes numerous features for robust communication:

- Automatic reconnection with exponential backoff
- Message prioritization and queueing
- Connection state management and events
- Circuit breaker pattern for failure protection
- Heartbeat mechanism for connection verification

Example usage:

```typescript
import { WebSocketService } from '../services/websocket';

const ws = new WebSocketService({
  url: 'wss://example.com/socket',
  autoReconnect: true,
  maxReconnectAttempts: 5,
  reconnectDelay: 1000
});

ws.connect()
  .then(() => console.log('Connected!'))
  .catch(error => console.error('Connection failed:', error));

// Send messages with priority
ws.send(data, 1, true); // high priority, reliable
ws.send(data, 5, false); // low priority, best effort

// Listen for events
ws.on('message', event => handleMessage(event));
ws.on('close', event => handleDisconnect(event));
```
