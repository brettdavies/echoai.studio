/**
 * WebSocket service exports
 */

// Export all classes
export { WebSocketService } from './WebSocketService';
export { ConnectionState, type WebSocketOptions } from './core/types';
export { StreamingAudioProcessor } from './StreamingAudioProcessor';
export { logger, LogLevel, LogCategory } from './core/Logger';

// Export audio streaming module - explicit exports to avoid module resolution issues
export { AudioStreamingBridge } from './audio/AudioStreamingBridge';
export { DEFAULT_AUDIO_OPTIONS, AudioMessageType } from './audio/types';
export type { 
  AudioStreamingOptions,
  AudioMetadata,
  StatusChangeCallback,
  AudioConfig,
  AudioMessage,
  WebSocketStateChangeEvent
} from './audio/types';

// Additional exports from audio module
export { 
  convertToInt16,
  combineAudioChunks,
  arrayBufferToBase64,
  createBinaryMessage,
  createJsonMessage,
  createConfigMessage,
  processAudioData
} from './audio';

// Types from the audio module
import { ProcessingOptions } from '../../components/audio/types';

// Import classes for the factory function
import { WebSocketService } from './WebSocketService';
import { AudioStreamingBridge } from './audio/AudioStreamingBridge';
import { StreamingAudioProcessor } from './StreamingAudioProcessor';
import { logger, LogLevel, LogCategory } from './core/Logger';

/**
 * Configuration for creating a streaming audio implementation
 */
export interface AudioStreamingConfig {
  // WebSocket server URL
  serverUrl: string;
  
  // WebSocket options
  webSocketOptions?: Record<string, any>;
  
  // Streaming options
  streamingOptions?: Record<string, any>;
  
  // Audio processing options
  processingOptions?: ProcessingOptions;
  
  // Debug level
  debug?: boolean;
}

/**
 * Factory function to create a complete audio streaming implementation
 * @param config Configuration options
 * @returns A configured StreamingAudioProcessor instance
 */
export function createAudioStreaming(config: AudioStreamingConfig): StreamingAudioProcessor {
  const { serverUrl, processingOptions = {}, debug = false } = config;
  
  // Enable debugging if requested
  if (debug) {
    logger.setLogLevel(LogLevel.TRACE);
    logger.info(LogCategory.CONNECTION, 'Creating audio streaming processor with debugging enabled', {
      serverUrl,
      processingOptions
    });
  }
  
  // Create the streaming processor
  const streamingProcessor = new StreamingAudioProcessor(
    processingOptions,
    serverUrl
  );
  
  // Enable streaming by default
  streamingProcessor.setStreaming(true);
  
  return streamingProcessor;
}

/**
 * Helper function to extract processed audio data and send it to a WebSocket server
 * This can be used as a simple integration point without the full StreamingAudioProcessor
 * 
 * @param audioData Processed audio data
 * @param sampleRate Sample rate of the audio
 * @param serverUrl WebSocket server URL
 * @returns Promise that resolves when the data is sent or queued
 */
export async function sendAudioToServer(
  audioData: Float32Array, 
  sampleRate: number, 
  serverUrl: string
): Promise<void> {
  logger.info(LogCategory.CONNECTION, 'One-time audio data transmission', {
    serverUrl,
    sampleRate,
    dataSize: audioData.length
  });

  // Create a one-time use WebSocket service
  const webSocketService = new WebSocketService({ url: serverUrl });
  
  // Create a one-time use streaming bridge
  const streamingBridge = new AudioStreamingBridge(webSocketService);
  
  // Set the sample rate
  streamingBridge.setSampleRate(sampleRate);
  
  // Enable streaming
  streamingBridge.setEnabled(true);
  
  try {
    // Process the audio chunk
    await streamingBridge.processAudioChunk(audioData);
    
    // Flush the buffer to ensure data is sent
    streamingBridge.flushBuffer();
    
    // Wait a short time for the data to be sent
    await new Promise((resolve) => {
      setTimeout(() => {
        // Clean up
        webSocketService.disconnect();
        logger.info(LogCategory.CONNECTION, 'One-time transmission complete');
        resolve(undefined);
      }, 500);
    });
  } catch (error) {
    logger.error(LogCategory.ERROR, 'Error in one-time audio transmission', error);
    webSocketService.disconnect();
    throw error;
  }
} 