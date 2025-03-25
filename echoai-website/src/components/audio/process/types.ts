// Types for audio processing

/**
 * Configuration options for audio processing
 */
export interface ProcessingOptions {
  /**
   * Whether to resample the audio to a different sample rate
   * @default true
   */
  resample?: boolean;
  
  /**
   * Target sample rate in Hz (only used if resample is true)
   * @default 16000
   */
  targetSampleRate?: number;
  
  /**
   * Time stretching factor (1.0 = no change, 0.5 = half speed, 2.0 = double speed)
   * @default 1.0
   */
  timeStretch?: number;
  
  /**
   * Pitch shift in semitones (0 = no change, +12 = one octave up, -12 = one octave down)
   * @default 0.0
   */
  pitchShift?: number;
  
  /**
   * Whether to preserve formants when pitch shifting (important for natural-sounding voices)
   * @default true
   */
  formantPreservation?: boolean;
}

/**
 * Result from audio processing, similar to Rust's Result type
 */
export interface AudioProcessingResult<T> {
  data: T | null;
  error: Error | null;
  isSuccess: boolean;
}

/**
 * Interface for processed audio data
 */
export interface ProcessedAudio {
  data: Float32Array;
  sampleRate: number;
  processingFailed?: boolean;
}

/**
 * Interface for an audio processor module
 */
export interface AudioProcessorModule {
  /**
   * Unique name of the processor
   */
  name: string;
  
  /**
   * Process an individual chunk of audio as it comes in
   * @param chunk Audio data as Float32Array
   * @param sampleRate Original sample rate of the audio
   * @returns Processed chunk (or placeholder if processing happens in finalize)
   */
  processChunk: (chunk: Float32Array, sampleRate: number) => Promise<Float32Array>;
  
  /**
   * Optional finalization method that processes all chunks together
   * Useful for processors that need to analyze the entire audio
   * @param chunks All collected audio chunks
   * @param sampleRate Original sample rate of the audio
   * @returns Processed audio data and its sample rate
   */
  finalize?: (chunks: Float32Array[], sampleRate: number) => Promise<ProcessedAudio>;
}

/**
 * Props for the AudioProcessor component
 */
export interface AudioProcessorProps {
  /**
   * Web Audio API context
   */
  audioContext: AudioContext;
  
  /**
   * HTML media element (audio or video) that serves as the source
   */
  mediaElement: HTMLMediaElement;
  
  /**
   * Source node connected to the media element
   */
  sourceNode: MediaElementAudioSourceNode;
  
  /**
   * Whether audio is currently playing and should be processed
   */
  isPlaying: boolean;
  
  /**
   * Audio processing configuration options
   */
  processingOptions?: ProcessingOptions;
} 