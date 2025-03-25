/**
 * Audio streaming types
 * Contains all types related to audio streaming functionality
 */

/**
 * Configuration options for the streaming bridge
 */
export interface AudioStreamingOptions {
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
  base64Encode: true,
  bufferTimeout: 1000, // Flush buffer after 1 second
  maxBufferSize: 32000, // About 2 seconds of 16kHz audio
  addSequenceNumber: true,
  addTimestamp: true
};

/**
 * Message types for the streaming protocol
 */
export enum AudioMessageType {
  AUDIO = 'audio',
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
  type: AudioMessageType | string; // Allow string type for 'audio'
  metadata?: AudioMetadata;
  data?: string | number[]; // Allow array of numbers
  encoding?: 'base64' | 'json';
  config?: AudioConfig;
  
  // Direct fields for simpler format
  format?: string;
  channels?: number;
  sampleRate?: number;
  timestamp?: number;
  sequenceNumber?: number;
  value?: string; // For base64 encoded audio data
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