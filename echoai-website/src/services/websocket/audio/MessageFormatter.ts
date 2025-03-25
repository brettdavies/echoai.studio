/**
 * MessageFormatter
 * 
 * Utilities for formatting audio data for transmission over websockets
 */

import { AudioMetadata } from './types';
import { arrayBufferToBase64, convertToInt16 } from './AudioUtils';
import { createAudioMessage } from '../WebSocketSchemas';
import { logger, LogCategory } from '../WebSocketLogger';

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

/**
 * Create a JSON message with audio data
 * @param audioData The audio data as an ArrayBuffer
 * @param metadata The audio metadata
 * @returns A JSON string message
 */
export function createJsonMessage(
  audioData: ArrayBuffer, 
  metadata: AudioMetadata
): string {
  // Get base64 encoded audio data
  const base64Data = arrayBufferToBase64(audioData);
  
  // Create message using helper function from WebSocketSchemas
  const message = createAudioMessage(base64Data, metadata.sampleRate);
  
  logger.debug(LogCategory.AUDIO, `Creating JSON message with base64 data, length: ${message.value.length} chars`);
  
  // Stringify the message
  const jsonString = JSON.stringify(message);
  logger.debug(LogCategory.AUDIO, `Final JSON message size: ${jsonString.length} bytes`);
  
  return jsonString;
} 