# Audio Orchestrator Module

The Audio Orchestrator coordinates the flow of audio data through a customizable pipeline of audio operations. It serves as the central conductor for audio capture, processing, batching, saving, and streaming.

## Overview

The `AudioOrchestrator` provides a flexible and configurable system for defining audio processing pipelines. It manages the lifecycle of audio operations and ensures proper sequencing of steps.

## Key Features

- **Pipeline Architecture**: Define custom sequences of audio operations
- **Event System**: Detailed events for monitoring pipeline progress
- **State Management**: Robust state handling for the audio processing lifecycle
- **Error Handling**: Comprehensive error management across all pipeline steps
- **Modular Design**: Easily combine different audio operations (capture, batch, process, save, stream)

## Built-in Pipelines

The orchestrator comes with several predefined pipelines:

| Pipeline Type | Steps |
|---------------|-------|
| `CAPTURE_SAVE` | Capture audio → Save to file |
| `CAPTURE_BATCH_SAVE` | Capture audio → Batch → Save each batch |
| `CAPTURE_PROCESS_SAVE` | Capture audio → Process → Save to file |
| `CAPTURE_BATCH_PROCESS_SAVE` | Capture audio → Batch → Process each batch → Save each batch |
| `CAPTURE_PROCESS_STREAM` | Capture audio → Process → Stream to server |
| `CAPTURE_BATCH_PROCESS_STREAM` | Capture audio → Batch → Process each batch → Stream each batch |
| `CAPTURE_STREAM` | Capture audio → Stream to server |
| `CUSTOM` | Define your own pipeline steps |

## Usage Example

```typescript
import { AudioOrchestrator } from './AudioOrchestrator';
import { PipelineType } from '../../../types/audio-orchestrator';
import { BatchStrategy } from '../../../types/audio-batch';
import { AudioExportFormat } from '../../../types/audio-export';

// Create an orchestrator with a capture-batch-save pipeline
const orchestrator = new AudioOrchestrator({
  pipeline: PipelineType.CAPTURE_BATCH_SAVE,
  
  // Configure capture options
  captureOptions: {
    resample: true,
    targetSampleRate: 16000
  },
  
  // Configure batching options
  batchOptions: {
    strategy: BatchStrategy.TIME_BASED,
    batchDuration: 3.0, // 3-second chunks
    overlap: 0.1,       // 0.1 seconds overlap between batches
    processIncomplete: true
  },
  
  // Configure save options
  saveOptions: {
    format: AudioExportFormat.WAV,
    autoDownload: true,
    normalize: true,
    filename: 'audio-recording'
  }
});

// Initialize the orchestrator
await orchestrator.initialize();

// Set up event listeners
orchestrator.addEventListener('stopped', (event) => {
  console.log('Audio capture and processing complete:', event);
});

orchestrator.addEventListener('pipeline_step_complete', (event) => {
  console.log(`Pipeline step completed: ${event.details.step}`);
  
  // For save step, we get URLs to the saved files
  if (event.details.step === 'save') {
    if (event.details.batchUrls) {
      console.log('Batch URLs:', event.details.batchUrls);
    } else {
      console.log('File URL:', event.details.url);
    }
  }
});

// Connect to audio source and start
orchestrator.connect(audioSourceNode);
orchestrator.start();

// Later: stop the orchestrator (triggers processing pipeline)
setTimeout(() => orchestrator.stop(), 10000);
```

## Lifecycle Control

The orchestrator provides methods to control the audio pipeline lifecycle:

```typescript
// Initialize the orchestrator and all required modules
await orchestrator.initialize();

// Connect to audio source
orchestrator.connect(sourceNode, optionalDestinationNode);

// Start/pause/resume/stop the pipeline
orchestrator.start();
orchestrator.pause();
orchestrator.resume();
orchestrator.stop();

// Clean up resources when done
orchestrator.dispose();
```

## Custom Pipelines

You can define custom pipelines for specialized audio workflows:

```typescript
const customOrchestrator = new AudioOrchestrator({
  pipeline: PipelineType.CUSTOM,
  customPipeline: {
    id: 'my-custom-pipeline',
    name: 'My Custom Pipeline',
    steps: [
      { type: 'capture', name: 'capture' },
      { type: 'batch', name: 'batch' },
      { type: 'process', name: 'enhance' },
      { type: 'process', name: 'analyze' },
      { type: 'save', name: 'save' }
    ]
  },
  // Configure options for each step...
});
```

## Events

The orchestrator emits various events that you can listen for:

| Event Type | Description |
|------------|-------------|
| `INITIALIZED` | Orchestrator successfully initialized |
| `STARTED` | Pipeline started |
| `PAUSED` | Pipeline paused |
| `RESUMED` | Pipeline resumed after pause |
| `STOPPED` | Pipeline stopped |
| `PIPELINE_STEP_COMPLETE` | Individual pipeline step completed |
| `PIPELINE_COMPLETE` | All pipeline steps completed |
| `ERROR` | Error occurred in the pipeline |

## Integration with Audio Systems

The orchestrator integrates with all other audio modules:

- **Capture**: Connects to audio sources and captures raw audio
- **Batch**: Divides audio into manageable chunks
- **Process**: Applies transformations and effects to audio
- **Save**: Exports audio to files in various formats
- **Stream**: Sends audio to remote services

## Best Practices

1. **Choose the Right Pipeline**: Select a predefined pipeline that matches your needs or create a custom one for specialized workflows.

2. **Configure Each Step**: Provide detailed options for each step in the pipeline to ensure optimal results.

3. **Listen for Events**: Set up event listeners to monitor pipeline progress and handle any errors.

4. **Resource Management**: Call `dispose()` when you're done with the orchestrator to free resources.

5. **Error Handling**: Implement proper error handling for a robust audio system.
