# Audio Capture Module

The Audio Capture module provides functionality to record and capture audio from various sources in the browser. It uses the Web Audio API and AudioWorkletProcessor to efficiently capture high-quality audio.

## Overview

The `AudioCaptureManager` handles all aspects of audio capture, including connecting to audio sources, buffering audio data, and exposing the captured audio for further processing.

## Features

- Connect to any Web Audio API node as a source
- Buffer audio data in memory during capture
- Start, pause, resume, and stop capture operations
- Events for monitoring capture progress and state changes
- Support for various audio formats and sample rates

## Usage with Orchestrator

The audio capture functionality is integrated into the `AudioOrchestrator` as the first pipeline step:

```typescript
// Create an orchestrator with capture
const orchestrator = new AudioOrchestrator({
  pipeline: PipelineType.CAPTURE_SAVE, // Pipeline with capture step
  captureOptions: {
    // Optional: resample audio during capture
    resample: true,
    targetSampleRate: 16000
  },
  // Other options...
});

// Initialize and connect to an audio source
await orchestrator.initialize();
orchestrator.connect(sourceNode);

// Start capturing
orchestrator.start();

// Pause/resume capturing
orchestrator.pause();
orchestrator.resume();

// Stop capturing (triggers the next pipeline steps)
orchestrator.stop();
```

## Direct Usage

You can also use the `AudioCaptureManager` directly for more control:

```typescript
import { AudioCaptureManager } from './AudioCaptureManager';
import { AudioCaptureEventType } from '../../../types/audio-capture';

// Create capture manager
const captureManager = new AudioCaptureManager({
  resample: false
});

// Initialize
await captureManager.initialize();

// Set up event listeners
captureManager.addEventListener(AudioCaptureEventType.CAPTURE_START, (event) => {
  console.log('Capture started', event);
});

captureManager.addEventListener(AudioCaptureEventType.CAPTURE_STOP, (event) => {
  console.log('Capture stopped', event);
  const { data, sampleRate } = captureManager.getCapturedAudio();
  // Process the captured audio data...
});

// Connect to audio source
captureManager.connect(sourceNode);

// Start capturing
captureManager.start();

// Later: stop capturing
captureManager.stop();
```

## React Hook Integration

The module provides a React hook for convenient use in components:

```typescript
import { useAudioCapture } from '../../../hooks/useAudioCapture';

function AudioRecorder() {
  const {
    state,
    startCapture,
    pauseCapture,
    resumeCapture,
    stopCapture,
    exportAudio,
    isCapturing,
    isPaused,
    duration
  } = useAudioCapture({
    sourceNode: myAudioSourceNode,
    processingOptions: {
      resample: true,
      targetSampleRate: 22050
    }
  });
  
  return (
    <div>
      <div>Status: {state}</div>
      <div>Duration: {duration.toFixed(2)}s</div>
      
      {!isCapturing && !isPaused && (
        <button onClick={startCapture}>Start Recording</button>
      )}
      
      {isCapturing && !isPaused && (
        <>
          <button onClick={pauseCapture}>Pause</button>
          <button onClick={stopCapture}>Stop</button>
        </>
      )}
      
      {isPaused && (
        <>
          <button onClick={resumeCapture}>Resume</button>
          <button onClick={stopCapture}>Stop</button>
        </>
      )}
    </div>
  );
}
```

## Configuration Options

The capture behavior can be configured through the `AudioProcessingOptions` interface:

```typescript
interface AudioProcessingOptions {
  // Whether to resample the audio
  resample?: boolean;
  
  // Target sample rate for resampling
  targetSampleRate?: number;
  
  // Time stretch factor (1.0 = no stretch)
  timeStretch?: number;
}
```

## Implementation Details

The capture system uses an `AudioWorkletProcessor` to efficiently capture audio samples without blocking the main thread. The processor runs in a separate thread and sends captured audio chunks to the main thread for buffering.

## Best Practices

1. **Memory Management**: For long recordings, consider using the batch module to split audio into manageable chunks.

2. **Sample Rate Conversion**: Use the `resample` option when you know your downstream processing requires a specific sample rate.

3. **Error Handling**: Always listen for error events to handle any capture issues gracefully.

4. **Resource Cleanup**: Call `dispose()` when you're done with the capture manager to free resources.

5. **Buffer Size**: Be mindful of memory usage for long recordings - the entire recording is kept in memory.
