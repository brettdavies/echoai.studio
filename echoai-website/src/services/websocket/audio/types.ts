/**
 * Audio streaming types
 * Contains all types related to audio streaming functionality
 */

/**
 * Configuration options for the streaming bridge
 */
export interface AudioStreamingOptions {
  // Message format ('binary' or 'json')
  messageFormat?: 'binary' | 'json';
  
  // Chunk size in bytes for binary format
  chunkSize?: number;
  
  // Base64 encode binary data for JSON messages
  base64Encode?: boolean;
  
  // Buffer timeout in ms (flush buffer after this time)
  bufferTimeout?: number;
  
  // Maximum buffer size (flush when reached)
  maxBufferSize?: number;
  
  // Add sequence number to messages
  addSequenceNumber?: boolean;
  
  // Add timestamp to messages
  addTimestamp?: boolean;
}

/**
 * Default streaming options
 */
export const DEFAULT_AUDIO_OPTIONS: AudioStreamingOptions = {
  messageFormat: 'binary',
  chunkSize: 16000, // 1 second of 16kHz audio
  base64Encode: false,
  bufferTimeout: 1000, // Flush buffer after 1 second
  maxBufferSize: 32000, // About 2 seconds of 16kHz audio
  addSequenceNumber: true,
  addTimestamp: true
};

/**
 * Message types for the streaming protocol
 */
export enum AudioMessageType {
  AUDIO_DATA = 'audio_data',
  CONFIG = 'config',
  CONTROL = 'control',
  HEARTBEAT = 'heartbeat'
}

/**
 * Audio metadata for audio messages
 */
export interface AudioMetadata {
  sampleRate: number;
  channels: number;
  format: 'int16' | 'float32';
  sequenceNumber?: number;
  timestamp?: number;
  byteLength?: number;
}

/**
 * Status change callback type
 */
export type StatusChangeCallback = (status: boolean, message?: string) => void;

/**
 * Audio message format for JSON serialization
 */
export interface AudioMessage {
  type: AudioMessageType;
  metadata?: AudioMetadata;
  data?: string;
  encoding?: 'base64' | 'json';
  config?: AudioConfig;
}

/**
 * Audio configuration for config messages
 */
export interface AudioConfig {
  sampleRate: number;
  channels: number;
  format: 'int16' | 'float32';
  messageFormat?: 'binary' | 'json';
  encoding?: 'base64' | 'json';
}

/**
 * Event object for WebSocketService state changes
 */
export interface WebSocketStateChangeEvent {
  detail?: {
    newState?: string;
    oldState?: string;
  };
} 