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

The WebSocket module uses domain-specific loggers from our logging factory system to provide detailed logging for both WebSocket communication and audio processing.

```typescript
import { LogLevel, LogCategory } from '../utils/Logger';
import { networkLoggers, audioLoggers } from '../utils/LoggerFactory';

// WebSocket-specific logging
networkLoggers.websocket.info('Connecting to server', { url });
networkLoggers.websocket.debug('Message received', { size: data.length });

// Audio-specific logging (uses specialized audio loggers)
audioLoggers.processor.info('Audio processor initialized');
audioLoggers.resampler.debug('Sample rate conversion completed');
```

## Streaming Audio Processing

The audio streaming system integrates with the logging system to provide detailed debugging information.

```typescript
import { createAudioStreaming } from '../services/websocket';
import { LogLevel } from '../utils/Logger';

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

## Using the Logger in WebAssembly and Resampler Components

When working with WebAssembly or Resampler components, use the appropriate domain loggers:

```typescript
// In a WebAssembly module wrapper
import { LogLevel } from '../utils/Logger';
import { audioLoggers } from '../utils/LoggerFactory';

export class WasmModule {
  async initialize() {
    try {
      audioLoggers.session.info('Initializing WASM module');
      // ... initialization code
      audioLoggers.session.info('WASM module initialized successfully');
    } catch (error) {
      audioLoggers.session.error('Failed to initialize WASM module', error);
      throw error;
    }
  }
}

// In a Resampler wrapper
export class ResamplerModule {
  resample(input: Float32Array): Float32Array {
    audioLoggers.resampler.debug('Resampling audio data', { 
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
import { networkLoggers } from '../utils/LoggerFactory';

const ws = new WebSocketService({
  url: 'wss://example.com/socket',
  autoReconnect: true,
  maxReconnectAttempts: 5,
  reconnectDelay: 1000
});

ws.connect()
  .then(() => networkLoggers.websocket.info('Connected!'))
  .catch(error => networkLoggers.websocket.error('Connection failed:', error));

// Send messages with priority
ws.send(data, 1, true); // high priority, reliable
ws.send(data, 5, false); // low priority, best effort

// Listen for events
ws.on('message', event => handleMessage(event));
ws.on('close', event => handleDisconnect(event));
```
