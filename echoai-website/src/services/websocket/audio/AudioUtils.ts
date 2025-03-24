/**
 * Audio Utilities
 * 
 * Utility functions for audio data processing and conversion
 */

/**
 * Convert Float32Array to Int16Array for more efficient network transfer
 * @param float32Data Float32Array audio data
 * @returns Int16Array with the same audio data
 */
export function convertToInt16(float32Data: Float32Array): Int16Array {
  const int16Data = new Int16Array(float32Data.length);
  
  // Convert Float32 (-1.0 to 1.0) to Int16 (-32768 to 32767)
  for (let i = 0; i < float32Data.length; i++) {
    // Clamp value between -1.0 and 1.0
    const sample = Math.max(-1.0, Math.min(1.0, float32Data[i]));
    // Convert to Int16
    int16Data[i] = Math.round(sample * 32767);
  }
  
  return int16Data;
}

/**
 * Combine multiple audio chunks into a single Float32Array
 * @param chunks Array of Float32Array chunks
 * @returns Combined Float32Array
 */
export function combineAudioChunks(chunks: Float32Array[]): Float32Array {
  // Calculate total length
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  
  // Create a new array to hold all data
  const result = new Float32Array(totalLength);
  
  // Copy each chunk into the result
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  
  return result;
}

/**
 * Convert ArrayBuffer to base64 string
 * @param buffer The ArrayBuffer to convert
 * @returns Base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
} 