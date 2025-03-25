# Audio Batching Module

The Audio Batching module provides functionality to split captured audio into smaller, manageable chunks for processing and saving. This is useful for handling long audio recordings or implementing incremental processing of audio data.

## Overview

The `AudioBatchManager` is responsible for dividing larger audio data into discrete batches using various strategies. These batches can then be individually processed or saved, enabling more granular control over audio operations.

## Batching Strategies

The module supports three batching strategies:

### 1. Fixed-Size Batching (`BatchStrategy.FIXED_SIZE`)

Divides audio into chunks with a fixed number of samples.

- **Configuration**: Set `batchSize` (number of samples per batch)
- **Use case**: When precise control over the batch size is needed

### 2. Time-Based Batching (`BatchStrategy.TIME_BASED`)

Divides audio into chunks with a fixed duration in seconds.

- **Configuration**: Set `batchDuration` (seconds per batch)
- **Use case**: When consistent time-length segments are required (e.g., for LLM processing)

### 3. Dynamic Batching (`BatchStrategy.DYNAMIC`)

Intelligently analyzes audio content to determine optimal batch boundaries based on audio characteristics.

- **Use case**: When automatic segmentation based on audio content is preferred

## Configuration Options

The batching behavior can be configured through the `AudioBatchOptions` interface:

```typescript
interface AudioBatchOptions {
  // Which batching strategy to use
  strategy: BatchStrategy;
  
  // For FIXED_SIZE strategy: number of samples per batch
  batchSize?: number;
  
  // For TIME_BASED strategy: seconds per batch
  batchDuration?: number;
  
  // Whether to include partial batches at the end
  processIncomplete?: boolean;
  
  // Number of samples/seconds of overlap between consecutive batches
  overlap?: number;
}
```

## Usage with Orchestrator

The audio batching functionality is integrated into the `AudioOrchestrator` as a pipeline step. To use it:

```typescript
// Create an orchestrator with batching
const orchestrator = new AudioOrchestrator({
  pipeline: PipelineType.CAPTURE_BATCH_SAVE, // Use a pipeline with batch step
  batchOptions: {
    strategy: BatchStrategy.FIXED_SIZE,
    batchSize: 8192,              // 8192 samples per batch
    processIncomplete: true,      // Process partial batches
    overlap: 1024                 // 1024 samples overlap between batches
  },
  // Other options...
});

// Initialize and use the orchestrator as usual
await orchestrator.initialize();
orchestrator.connect(sourceNode);
orchestrator.start();
```

## Time-Based Configuration Example

For time-based batching, you can specify the duration of each batch:

```typescript
const orchestrator = new AudioOrchestrator({
  pipeline: PipelineType.CAPTURE_BATCH_SAVE,
  batchOptions: {
    strategy: BatchStrategy.TIME_BASED,
    batchDuration: 5.0,           // 5-second chunks
    processIncomplete: true,
    overlap: 0.2                  // 0.2 seconds overlap
  },
  // Other options...
});
```

## Direct Usage

You can also use the `AudioBatchManager` directly for more control:

```typescript
import { AudioBatchManager } from '../batch/AudioBatchManager';
import { BatchStrategy } from '../../../types/audio-batch';

// Create a batch manager
const batchManager = new AudioBatchManager({
  strategy: BatchStrategy.FIXED_SIZE,
  batchSize: 16384,
  processIncomplete: true
});

// Process audio data into batches
const batches = batchManager.process(audioData, sampleRate);

// Process each batch
batches.forEach((batch, index) => {
  console.log(`Processing batch ${index + 1}/${batches.length}`);
  // Process the batch...
});
```

## React Hook Integration

The module provides a React hook for convenient use in components:

```typescript
import { useAudioBatch } from '../../../hooks/useAudioBatch';

function MyAudioComponent() {
  const { 
    batchAudio, 
    isBatching, 
    progress, 
    batchCount 
  } = useAudioBatch({
    strategy: BatchStrategy.TIME_BASED,
    batchDuration: 2.0
  });
  
  const handleProcessAudio = async (audioData, sampleRate) => {
    const batches = await batchAudio(audioData, sampleRate);
    // Use the batches...
  };
  
  return (
    <div>
      {isBatching && <progress value={progress} />}
      <p>Batch count: {batchCount}</p>
      {/* Your component UI */}
    </div>
  );
}
```

## Best Practices

1. **Choose the right strategy** based on your requirements:
   - `FIXED_SIZE` for precise control over sample count
   - `TIME_BASED` for consistent duration batches
   - `DYNAMIC` for content-aware segmentation

2. **Configure overlap** when batch boundaries need to be smoothed or when processing requires context from adjacent batches.

3. **Enable `processIncomplete`** to handle the last batch, which may be smaller than the specified batch size.

4. **Consider performance** when setting batch sizes - smaller batches process faster but create more overhead.

5. **Monitor batch events** to track progress in long-running batch operations.
