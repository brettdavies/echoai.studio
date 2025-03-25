/**
 * Utilities for testing audio functionality
 */

import { 
  OutgoingAudioMessageSchema, 
  createAudioMessage,
  validateOutgoingAudioSchema 
} from '../services/websocket/WebSocketSchemas';
import { networkLoggers } from './LoggerFactory';

/**
 * Generate a random audio sample for testing
 * @param sampleSize Optional custom sample size
 * @returns JSON message with audio data
 */
export function generateAudioTestMessage(sampleSize = 32): OutgoingAudioMessageSchema {
  // Generate a smaller random audio sample (32 samples by default)
  const data = new Float32Array(sampleSize);
  
  // Use smaller values to create more consistent audio data
  for (let i = 0; i < sampleSize; i++) {
    // Generate values between -0.5 and 0.5 instead of -1 and 1
    data[i] = (Math.random() - 0.5); 
  }
  
  // Convert to base64
  const buffer = new ArrayBuffer(data.length * 4);
  const view = new DataView(buffer);
  for (let i = 0; i < data.length; i++) {
    view.setFloat32(i * 4, data[i], true);
  }
  
  // Convert buffer to base64
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = window.btoa(binary);
  
  // Log exact contents for debugging
  networkLoggers.websocket.debug('Generated test audio message', {
    sampleSize,
    sampleData: Array.from(data.slice(0, 5)),
    base64Length: base64.length
  });
  
  // Use the helper function to create the message with correct schema
  const message = createAudioMessage(base64, 16000);
  
  // Validate the message
  if (!validateOutgoingAudioSchema(message)) {
    networkLoggers.websocket.error('Generated test message does not match schema', message);
  }
  
  return message;
}

/**
 * Generate a test message as a JSON string
 * @param sequenceNumber Optional sequence number (ignored in the output)
 * @returns Stringified JSON audio message
 */
export function generateAudioTestMessageString(sequenceNumber = 0): string {
  const message = generateAudioTestMessage();
  return JSON.stringify(message);
} 