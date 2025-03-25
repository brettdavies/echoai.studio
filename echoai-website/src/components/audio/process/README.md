# Audio Process Module

The Audio Process module provides functionality to transform and enhance audio data through various audio processing operations. It enables effects, transformations, and analysis of audio data.

## Overview

The audio processing system allows for manipulation of audio data after capture and before saving or streaming. It can be used to apply effects, analyze audio content, or prepare audio for specific use cases.

## Features

- Audio normalization and gain adjustment
- Sample rate conversion (resampling)
- Audio analysis and feature extraction
- Filtering and effects processing
- Time stretching and pitch shifting

## Usage with Orchestrator

The audio processing functionality is integrated into the `AudioOrchestrator` as a pipeline step:

```typescript
// Create an orchestrator with processing step
const orchestrator = new AudioOrchestrator({
  pipeline: PipelineType.CAPTURE_PROCESS_SAVE,
  processOptions: {
    effects: ['normalize', 'lowpass'],
    filterCutoff: 8000, // Effect-specific parameter
    normalizeLevel: 0.8 // Effect-specific parameter
  },
  // Other options...
});

// Initialize, connect, start, and stop as usual
await orchestrator.initialize();
orchestrator.connect(sourceNode);
orchestrator.start();

// When stopped, the processing step will be triggered automatically
orchestrator.stop();
```

## Batch Integration

The process module works particularly well with the batch module, allowing for piece-by-piece processing of longer audio:

```typescript
// Create an orchestrator with batch and process steps
const orchestrator = new AudioOrchestrator({
  pipeline: PipelineType.CAPTURE_BATCH_PROCESS_SAVE,
  batchOptions: {
    strategy: BatchStrategy.TIME_BASED,
    batchDuration: 2.0 // 2-second chunks
  },
  processOptions: {
    effects: ['normalize', 'denoise']
  },
  // Other options...
});
```

## Available Processing Effects

The module supports various audio processing effects:

| Effect | Description | Parameters |
|--------|-------------|------------|
| normalize | Normalizes audio levels | normalizeLevel (0-1) |
| lowpass | Low-pass filter | filterCutoff (Hz) |
| highpass | High-pass filter | filterCutoff (Hz) |
| resample | Changes the sample rate | targetSampleRate (Hz) |
| timeStretch | Stretches audio duration without pitch change | stretchFactor (0.5-2.0) |
| pitchShift | Shifts pitch without changing duration | semitones (-12 to 12) |
| denoise | Reduces background noise | threshold (0-1) |

## Technical Implementation

The processing module uses:

1. Web Audio API's native processing nodes for standard effects
2. Custom processing algorithms for more advanced transformations
3. WebAssembly acceleration for compute-intensive operations where available

## React Hook Integration

The module provides a React hook for convenient processing in components:

```typescript
import { useAudioProcess } from '../../../hooks/useAudioProcess';

function AudioProcessor({ audioData, sampleRate }) {
  const { 
    processAudio, 
    isProcessing, 
    progress 
  } = useAudioProcess({
    effects: ['normalize', 'lowpass'],
    filterCutoff: 5000
  });
  
  const handleProcess = async () => {
    try {
      const processedData = await processAudio(audioData, sampleRate);
      // Use the processed audio data...
    } catch (err) {
      console.error('Processing failed:', err);
    }
  };
  
  return (
    <div>
      <button onClick={handleProcess} disabled={isProcessing}>
        {isProcessing ? 'Processing...' : 'Apply Effects'}
      </button>
      
      {isProcessing && <progress value={progress} />}
    </div>
  );
}
```

## Best Practices

1. **Processing Order**: The order of effects matters. For example, apply normalization before filtering for more predictable results.

2. **Real-time vs Offline**: Consider whether processing needs to happen in real-time or can be done after capture. Offline processing allows for more complex operations.

3. **Memory Management**: For long audio files, use batched processing to work on smaller segments at a time.

4. **Effect Parameters**: Fine-tune effect parameters based on your audio content. Different types of audio (speech, music, ambient) require different processing settings.

5. **Test Processing**: Always test processing on representative audio samples, as effects may produce different results depending on the audio content.
