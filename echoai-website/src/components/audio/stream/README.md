# Audio Stream Module

The Audio Stream module provides functionality for streaming audio data to remote services or servers. It handles the real-time transmission of audio data over various protocols.

## Overview

The `AudioStreamManager` enables real-time streaming of audio data to remote endpoints over WebSocket. It supports various data formats and compression methods.

## Features

- Stream audio over WebSocket connections
- Support for binary and JSON-based audio formats
- Configurable packet sizes and transmission rates
- Connection management and reconnection strategies
- Stream status monitoring and statistics

## Usage with Orchestrator

The audio streaming functionality is integrated into the `AudioOrchestrator` as a pipeline step:

```typescript
// Create an orchestrator with streaming step
const orchestrator = new AudioOrchestrator({
  pipeline: PipelineType.CAPTURE_STREAM,
  streamOptions: {
    url: 'wss://api.example.com/audio-stream',
    protocol: 'websocket',
    format: 'float32',
    packetSize: 4096,
    compressed: true
  },
  // Other options...
});

// Initialize, connect, start, and stop as usual
await orchestrator.initialize();
orchestrator.connect(sourceNode);
orchestrator.start();

// Audio will be streamed in real-time while capturing
```

## Batch Integration

The stream module works effectively with the batch module, allowing for chunked streaming:

```typescript
// Create an orchestrator with batch and stream steps
const orchestrator = new AudioOrchestrator({
  pipeline: PipelineType.CAPTURE_BATCH_PROCESS_STREAM,
  batchOptions: {
    strategy: BatchStrategy.FIXED_SIZE,
    batchSize: 8192
  },
  processOptions: {
    effects: ['normalize']
  },
  streamOptions: {
    url: 'wss://api.example.com/audio-stream',
    protocol: 'websocket'
  }
});
```

## Streaming Protocols

The module supports different streaming protocols:

### WebSocket Streaming

```typescript
const streamOptions = {
  url: 'wss://api.example.com/audio-stream',
  protocol: 'websocket',
  format: 'float32',
  headers: {
    'Authorization': 'Bearer TOKEN'
  }
};
```

### HTTP Streaming

```typescript
const streamOptions = {
  url: 'https://api.example.com/audio-upload',
  protocol: 'http',
  method: 'POST',
  contentType: 'audio/raw',
  headers: {
    'Authorization': 'Bearer TOKEN'
  }
};
```

### Custom Protocol

```typescript
const streamOptions = {
  protocol: 'custom',
  customHandler: (audioData, sampleRate) => {
    // Custom handling of audio streaming
    myCustomStreamingFunction(audioData, sampleRate);
  }
};
```

## Direct Usage

You can also use the `AudioStreamManager` directly:

```typescript
import { AudioStreamManager } from './AudioStreamManager';

// Create a stream manager
const streamManager = new AudioStreamManager({
  url: 'wss://api.example.com/audio-stream',
  protocol: 'websocket',
  format: 'float32'
});

// Initialize and connect
await streamManager.initialize();
await streamManager.connect();

// Stream audio data
await streamManager.streamAudio(audioData, sampleRate);

// Close the connection when done
await streamManager.disconnect();
```

## React Hook Integration

The module provides a React hook for convenient streaming in components:

```typescript
import { useAudioStream } from '../../../hooks/useAudioStream';

function AudioStreamer({ audioSource }) {
  const { 
    isConnected,
    isStreaming,
    connect,
    disconnect,
    streamAudio,
    connectionStatus,
    error
  } = useAudioStream({
    url: 'wss://api.example.com/audio-stream',
    protocol: 'websocket',
    format: 'float32'
  });
  
  // Example of streaming live audio
  useEffect(() => {
    if (audioSource && isConnected && !isStreaming) {
      const handleAudioData = async (data, sampleRate) => {
        await streamAudio(data, sampleRate);
      };
      
      audioSource.addEventListener('audiodata', handleAudioData);
      return () => {
        audioSource.removeEventListener('audiodata', handleAudioData);
      };
    }
  }, [audioSource, isConnected, isStreaming, streamAudio]);
  
  return (
    <div>
      <div>Status: {connectionStatus}</div>
      {!isConnected ? (
        <button onClick={connect}>Connect</button>
      ) : (
        <button onClick={disconnect}>Disconnect</button>
      )}
      {error && <div className="error">Error: {error.message}</div>}
    </div>
  );
}
```

## Technical Details

The streaming module:

1. Establishes connections to remote endpoints
2. Formats audio data according to the protocol requirements
3. Manages packet sizes and transmission rates
4. Handles connection issues and implements retry strategies
5. Provides status updates and statistics

## Best Practices

1. **Connection Management**: Always handle connection issues gracefully with reconnection strategies.

2. **Data Format**: Choose the appropriate format (binary/JSON) based on your server requirements.

3. **Packet Size**: Adjust packet size based on network conditions and latency requirements.

4. **Authentication**: Implement proper authentication mechanisms for secure streaming.

5. **Error Handling**: Always handle network errors and disconnections gracefully.
