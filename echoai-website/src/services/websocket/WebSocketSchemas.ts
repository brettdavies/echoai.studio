/**
 * WebSocketSchemas.ts
 * 
 * This file documents all WebSocket message schemas used in communication
 * with the server. Maintaining accurate schema definitions is crucial for compatibility.
 * 
 * Categories:
 * - Outgoing messages (client → server)
 * - Incoming messages (server → client)
 */

/**
 * ------------- OUTGOING MESSAGE SCHEMAS (Client → Server) -------------
 */

/**
 * Audio Message Schema (Outgoing)
 * 
 * This is the exact schema required for sending audio data to the server.
 * Any deviation from this format will cause server-side rejection of the messages.
 * 
 * Example:
 * {
 *   "type": "audio",
 *   "value": "KIz4vrJaIz8GmGy/EQtEP1uoXT1P0fC+...",  // Base64 encoded audio data
 *   "sample_rate": 16000
 * }
 * 
 * - type: Must be exactly "audio"
 * - value: Base64 encoded audio data
 * - sample_rate: Sample rate in Hz (typically 16000)
 * 
 * Note: The field name is "sample_rate" (snake_case), not "sampleRate" (camelCase)
 */
export interface OutgoingAudioMessageSchema {
  type: "audio";
  value: string;  // Base64 encoded audio data
  sample_rate: number;
}

/**
 * Target Language Change Message Schema (Outgoing)
 * 
 * Used to change the target language for translations.
 * 
 * Example:
 * {
 *   "type": "target_language",
 *   "language": "fr"  // 2-letter language code
 * }
 */
export interface OutgoingTargetLanguageMessageSchema {
  type: "target_language";
  language: string;  // 2-letter language code
}

/**
 * Heartbeat Message Schema (Outgoing)
 * 
 * Used to keep the connection alive and verify server responsiveness.
 * Note: Currently, the server does not respond to heartbeat messages,
 * but the client still sends them to maintain the connection.
 */
export interface OutgoingHeartbeatMessageSchema {
  type: "heartbeat";
  timestamp: number;
}

/**
 * ------------- INCOMING MESSAGE SCHEMAS (Server → Client) -------------
 */

/**
 * Heartbeat Response Schema (Incoming)
 * 
 * Server response to client heartbeat messages.
 * 
 * Example:
 * {
 *   "type": "heartbeat_response",
 *   "server_timestamp": 1617293476223,  // Server's timestamp when processing the heartbeat
 *   "client_timestamp": 1617293476123   // Original timestamp sent by the client
 * }
 */
export interface IncomingHeartbeatResponseSchema {
  type: "heartbeat_response";
  server_timestamp: number;
  client_timestamp: number | null;
}

/**
 * Translation Message Schema (Incoming)
 * 
 * Received from the server after translating text.
 * 
 * Example:
 * {
 *   "text": "Hello, how are you?",
 *   "source_language": "en",
 *   "target_language": "fr"
 * }
 */
export interface IncomingTranslationMessageSchema {
  text: string;
  source_language: string;
  target_language: string;
}

/**
 * ------------- TYPE ALIASES FOR CONVENIENCE -------------
 */

/**
 * All outgoing message types combined
 */
export type OutgoingWebSocketMessage = 
  | OutgoingAudioMessageSchema
  | OutgoingTargetLanguageMessageSchema
  | OutgoingHeartbeatMessageSchema;

/**
 * All incoming message types combined
 */
export type IncomingWebSocketMessage = 
  | IncomingHeartbeatResponseSchema
  | IncomingTranslationMessageSchema;

/**
 * ------------- VALIDATION FUNCTIONS -------------
 */

/**
 * Validate that a message follows the required outgoing audio schema
 * @param message The message to validate
 * @returns Whether the message is valid
 */
export function validateOutgoingAudioSchema(message: any): boolean {
  return (
    typeof message === 'object' &&
    message !== null &&
    message.type === 'audio' &&
    typeof message.value === 'string' &&
    typeof message.sample_rate === 'number'
  );
}

/**
 * Validate that a message follows the required target language schema
 * @param message The message to validate
 * @returns Whether the message is valid
 */
export function validateOutgoingTargetLanguageSchema(message: any): boolean {
  return (
    typeof message === 'object' &&
    message !== null &&
    message.type === 'target_language' &&
    typeof message.language === 'string' &&
    message.language.length === 2
  );
}

/**
 * Helper function to create an audio message
 * @param audioData Base64 encoded audio data
 * @param sampleRate Sample rate of the audio
 * @returns A properly formatted audio message
 */
export function createAudioMessage(audioData: string, sampleRate: number): OutgoingAudioMessageSchema {
  return {
    type: "audio",
    value: audioData,
    sample_rate: sampleRate
  };
}

/**
 * Helper function to create a target language message
 * @param languageCode 2-letter language code
 * @returns A properly formatted target language message
 */
export function createTargetLanguageMessage(languageCode: string): OutgoingTargetLanguageMessageSchema {
  return {
    type: "target_language",
    language: languageCode
  };
}

/**
 * Parse and validate an incoming message from the server
 * @param data The raw message data (string or object)
 * @returns The parsed message or null if invalid
 */
export function parseIncomingMessage(data: string | object): any {
  try {
    const message = typeof data === 'string' ? JSON.parse(data) : data;
    
    if (typeof message !== 'object' || message === null || !message.type) {
      // Special case for translation messages which don't have a type field
      if (typeof message === 'object' && message !== null && 
          message.text && message.source_language && message.target_language) {
        return message as IncomingTranslationMessageSchema;
      }
      
      console.error('Invalid message format: missing type property', message);
      return null;
    }
    
    // Validate based on message type
    switch (message.type) {
      case 'heartbeat_response':
        if (typeof message.server_timestamp !== 'number') {
          console.error('Invalid heartbeat response: missing server_timestamp field', message);
          return null;
        }
        break;
        
      default:
        console.warn('Unknown message type:', message.type);
    }
    
    return message;
  } catch (error) {
    console.error('Error parsing message:', error);
    return null;
  }
} 