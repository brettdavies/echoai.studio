/**
 * Audio Streaming Module
 * 
 * Re-exports all components related to audio streaming
 */

// Core AudioStreamingBridge class
// export { AudioStreamingBridge } from './AudioStreamingBridge';

// Types and interfaces
export type { 
  AudioStreamingOptions,
  AudioMetadata,
  StatusChangeCallback,
  AudioConfig,
  AudioMessage,
  WebSocketStateChangeEvent
} from './types';

// Enum and constants
export { 
  DEFAULT_AUDIO_OPTIONS,
  AudioMessageType
} from './types';

// Audio utilities (exported for testing or advanced use)
export { 
  convertToInt16,
  combineAudioChunks,
  arrayBufferToBase64
} from './AudioUtils';

// Message formatting (exported for testing or advanced use)
export {
  createJsonMessage,
  processAudioData
} from './MessageFormatter'; 