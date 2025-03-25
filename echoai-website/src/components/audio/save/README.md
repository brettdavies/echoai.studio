# Audio Save Module

The Audio Save module provides functionality to export and save audio data in various formats. It handles the conversion of raw audio data to standardized formats and enables downloading or exporting the audio.

## Overview

The `AudioSaveManager` handles all aspects of saving audio, including format conversion, normalization, and file download operations.

## Features

- Export audio to WAV format (MP3 support planned)
- Automatic normalization of audio levels
- Options for automatic downloading of exported files
- Customizable filenames
- Event-based status updates during export process

## Usage with Orchestrator

The audio save functionality is integrated into the `AudioOrchestrator` as a pipeline step:

```typescript
// Create an orchestrator with save step
const orchestrator = new AudioOrchestrator({
  pipeline: PipelineType.CAPTURE_SAVE, // Pipeline with save step
  saveOptions: {
    format: AudioExportFormat.WAV,
    autoDownload: true,
    filename: 'my-recording',
    normalize: true
  },
  // Other options...
});

// Initialize, connect, start, and stop as usual
await orchestrator.initialize();
orchestrator.connect(sourceNode);
orchestrator.start();

// When stopped, the save step will be triggered automatically
setTimeout(() => orchestrator.stop(), 5000);
```

## Direct Usage

You can also use the `AudioSaveManager` directly for more control:

```typescript
import { AudioSaveManager } from './AudioSaveManager';
import { AudioExportFormat } from '../../../types/audio-export';

// Export audio data to WAV format
const audioData = new Float32Array(/* your audio data */);
const sampleRate = 44100;

// Save the audio
const url = await AudioSaveManager.saveAudio(
  audioData,
  sampleRate,
  {
    format: AudioExportFormat.WAV,
    autoDownload: true,
    filename: 'audio-recording',
    normalize: true
  }
);

console.log('Audio saved:', url);
```

## Event Listening

You can listen for events during the save process:

```typescript
import { AudioSaveManager } from './AudioSaveManager';
import { AudioExportEventType } from '../../../types/audio-export';

// Listen for export events
AudioSaveManager.addEventListener(AudioExportEventType.EXPORT_START, (event) => {
  console.log('Export started:', event);
});

AudioSaveManager.addEventListener(AudioExportEventType.EXPORT_COMPLETE, (event) => {
  console.log('Export completed:', event);
  console.log('Download URL:', event.url);
});

AudioSaveManager.addEventListener(AudioExportEventType.EXPORT_ERROR, (event) => {
  console.error('Export error:', event.error);
});
```

## React Hook Integration

The module provides a React hook for convenient use in components:

```typescript
import { useAudioSave } from '../../../hooks/useAudioSave';
import { AudioExportFormat } from '../../../types/audio-export';

function AudioSaveButton({ audioData, sampleRate }) {
  const { 
    saveAudio, 
    isSaving, 
    error, 
    lastSavedUrl 
  } = useAudioSave({
    format: AudioExportFormat.WAV,
    normalize: true
  });
  
  const handleSave = async () => {
    try {
      const url = await saveAudio(audioData, sampleRate, { 
        filename: 'my-recording' 
      });
      console.log('Saved to:', url);
    } catch (err) {
      console.error('Save failed:', err);
    }
  };
  
  return (
    <div>
      <button onClick={handleSave} disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save Recording'}
      </button>
      
      {error && <div className="error">Error: {error.message}</div>}
      {lastSavedUrl && <div>Saved to: {lastSavedUrl}</div>}
    </div>
  );
}
```

## Configuration Options

The save behavior can be configured through the `AudioExportOptions` interface:

```typescript
interface AudioExportOptions {
  // Format to export the audio as (WAV, MP3)
  format: AudioExportFormat;
  
  // Whether to trigger an automatic download
  autoDownload: boolean;
  
  // Custom filename (without extension)
  filename?: string;
  
  // Normalize audio before export
  normalize?: boolean;
}
```

## Technical Details

The save module works by:

1. Processing raw audio data (Float32Array) into the desired format
2. Creating a Blob with the appropriate MIME type
3. Generating a URL for the Blob
4. Optionally triggering a download via a temporary anchor element

For WAV files, the module creates the WAV headers according to the specification and writes the audio data with appropriate conversion.

## Best Practices

1. **Normalization**: Enable normalization when you want consistent volume levels. This scales the audio to use the full dynamic range.

2. **Filename Conventions**: Use descriptive filenames that include the date/time or content type for better organization.

3. **Batch Integration**: When working with batched audio, each batch can be saved separately with indexed filenames.

4. **Memory Considerations**: For very large files, consider saving in smaller chunks to avoid memory issues.

5. **Error Handling**: Always handle potential export errors, especially in browser environments with varying levels of support.
