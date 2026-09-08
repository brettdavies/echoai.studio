/**
 * Types for the audio capture system
 */

/**
 * Audio processing options
 */
export interface AudioProcessingOptions {
  /**
   * Whether to resample the audio
   */
  resample?: boolean;
  
  /**
   * Target sample rate for resampling
   */
  targetSampleRate?: number;
  
  /**
   * Time stretch factor (1.0 = no stretch)
   */
  timeStretch?: number;
}

/**
 * Audio capture state
 */
export enum AudioCaptureState {
  INACTIVE = 'inactive',
  CAPTURING = 'capturing',
  PAUSED = 'paused',
  EXPORTING = 'exporting',
  ERROR = 'error'
}

/**
 * Audio capture event types
 */
export enum AudioCaptureEventType {
  CAPTURE_START = 'capture_start',
  CAPTURE_PAUSE = 'capture_pause',
  CAPTURE_RESUME = 'capture_resume',
  CAPTURE_STOP = 'capture_stop',
  PROCESSOR_ERROR = 'processor_error',
  CHUNK_RECEIVED = 'chunk_received',
  EXPORT_START = 'export_start',
  EXPORT_COMPLETE = 'export_complete',
  EXPORT_ERROR = 'export_error'
}

/**
 * Details attached to audio capture events
 */
export interface AudioCaptureEventDetails {
  sampleRate?: number;
  chunkSize?: number;
  chunksCount?: number;
  totalSamples?: number;
  duration?: number;
  url?: string;
  error?: string;
}

/**
 * Audio capture event
 */
export interface AudioCaptureEvent {
  type: AudioCaptureEventType;
  timestamp: number;
  details?: AudioCaptureEventDetails;
}

/**
 * Audio worklet processor message types
 */
export enum AudioProcessorMessageType {
  CHUNK_PROCESSED = 'chunk_processed',
  PROCESSOR_READY = 'processor_ready',
  ERROR = 'error'
}

/**
 * Payload carried by audio worklet processor messages
 */
export interface AudioProcessorMessagePayload {
  sampleRate?: number;
  audioData?: Float32Array;
  message?: string;
}

/**
 * Message from audio worklet processor
 */
export interface AudioProcessorMessage {
  type: AudioProcessorMessageType;
  timestamp: number;
  payload?: AudioProcessorMessagePayload;
}

/**
 * Processed audio data
 */
export interface ProcessedAudio {
  /**
   * Audio data as Float32Array
   */
  data: Float32Array;
  
  /**
   * Sample rate of the data
   */
  sampleRate: number;
} 