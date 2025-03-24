/**
 * MessageFormatter
 * 
 * Utilities for formatting audio data for transmission over websockets
 */

import { AudioMetadata, AudioMessageType, AudioMessage, AudioConfig } from './types';
import { arrayBufferToBase64, convertToInt16 } from './AudioUtils';

/**
 * Creates a binary message containing audio data and metadata
 * @param audioData The audio data as Int16Array
 * @param metadata The audio metadata
 * @returns ArrayBuffer containing the formatted message
 */
export function createBinaryMessage(audioData: Int16Array, metadata: AudioMetadata): ArrayBuffer {
  // Create a binary message with metadata header and audio data
  // Format: [metadata size (4 bytes)][metadata (JSON)][audio data]
  
  // Convert metadata to JSON string and then to UTF-8 bytes
  const metadataJson = JSON.stringify(metadata);
  const metadataEncoder = new TextEncoder();
  const metadataBytes = metadataEncoder.encode(metadataJson);
  
  // Calculate total size and create buffer
  const totalBytes = 4 + metadataBytes.length + audioData.byteLength;
  const buffer = new ArrayBuffer(totalBytes);
  
  // Create views to write to the buffer
  const dataView = new DataView(buffer);
  const uint8View = new Uint8Array(buffer);
  const int16View = new Int16Array(buffer, 4 + metadataBytes.length);
  
  // Write metadata size (first 4 bytes)
  dataView.setUint32(0, metadataBytes.length, true);
  
  // Write metadata bytes
  uint8View.set(metadataBytes, 4);
  
  // Write audio data
  int16View.set(audioData);
  
  return buffer;
}

/**
 * Creates a JSON message containing audio data and metadata
 * @param audioData The audio data as Int16Array
 * @param metadata The audio metadata
 * @param base64Encode Whether to use base64 encoding
 * @returns JSON message as string
 */
export function createJsonMessage(
  audioData: Int16Array, 
  metadata: AudioMetadata, 
  base64Encode: boolean
): string {
  let audioDataString: string;
  
  if (base64Encode) {
    // Convert to base64
    const buffer = audioData.buffer;
    const base64 = arrayBufferToBase64(buffer);
    audioDataString = base64;
  } else {
    // Convert to array of numbers
    audioDataString = JSON.stringify(Array.from(audioData));
  }
  
  // Create the JSON message
  const message: AudioMessage = {
    type: AudioMessageType.AUDIO_DATA,
    metadata: metadata,
    data: audioDataString,
    encoding: base64Encode ? 'base64' : 'json'
  };
  
  return JSON.stringify(message);
}

/**
 * Creates a configuration message
 * @param config The audio configuration
 * @returns JSON message as string
 */
export function createConfigMessage(config: AudioConfig): string {
  const configMessage: AudioMessage = {
    type: AudioMessageType.CONFIG,
    config
  };
  
  return JSON.stringify(configMessage);
}

/**
 * Process raw audio data for transmission
 * @param audioData The raw audio data
 * @param sampleRate The sample rate
 * @param sequenceNumber The sequence number 
 * @param addTimestamp Whether to add timestamp
 * @returns Processed data and metadata
 */
export function processAudioData(
  audioData: Float32Array, 
  sampleRate: number,
  sequenceNumber: number,
  addTimestamp: boolean
): { int16Data: Int16Array, metadata: AudioMetadata } {
  // Convert to Int16 for network efficiency
  const int16Data = convertToInt16(audioData);
  
  // Create metadata
  const metadata: AudioMetadata = {
    sampleRate,
    channels: 1,
    format: 'int16',
    sequenceNumber,
    timestamp: addTimestamp ? Date.now() : undefined,
    byteLength: audioData.length * 2 // Int16 = 2 bytes per sample
  };
  
  return { int16Data, metadata };
} 