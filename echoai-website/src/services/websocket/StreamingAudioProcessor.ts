// import { AudioProcessorCore } from '../../components/audio/AudioProcessorCore';
import { ProcessingOptions } from '../../components/audio/types';
import { AudioStreamingBridge } from './audio/AudioStreamingBridge';
import { WebSocketService } from './WebSocketService';
import { WebSocketManager } from './WebSocketManager';
import { logger, LogCategory } from './WebSocketLogger';

/**
 * StreamingAudioProcessor extends AudioProcessorCore to add WebSocket streaming capability
 * This serves as the integration point between our existing audio processing infrastructure
 * and the new WebSocket streaming functionality
 */
// export class StreamingAudioProcessor extends AudioProcessorCore {
//   private streamingBridge: AudioStreamingBridge;
//   private streaming: boolean = false;
//   private targetSampleRate: number = 16000;
//   private statusChangeCallbacks: ((status: boolean, message?: string) => void)[] = [];
  
//   // Batch sending state
//   private lastProcessedIndex: number = -1;
  
//   /**
//    * Creates a new StreamingAudioProcessor
//    * @param processingOptions The processing options to use
//    * @param websocketUrl The WebSocket server URL to connect to
//    * @param existingWebSocketService Optional existing WebSocket service
//    */
//   constructor(
//     processingOptions: ProcessingOptions,
//     websocketUrl: string,
//     existingWebSocketService?: WebSocketService
//   ) {
//     super(processingOptions);
    
//     console.log(`[STREAMING DEBUG] StreamingAudioProcessor constructor called`);
    
//     // Use the provided WebSocket service or get one from the manager
//     const webSocketService = existingWebSocketService || 
//       WebSocketManager.getInstance().getService(websocketUrl, {
//         autoReconnect: true,
//         maxReconnectAttempts: 5
//       });
    
//     logger.info(LogCategory.WS, 'Using provided WebSocketService instance');
    
//     // Create the streaming bridge with appropriate configuration for batched audio
//     this.streamingBridge = new AudioStreamingBridge(webSocketService, {
//       // Increased buffer size to handle larger batched chunks (250ms worth of audio)
//       maxBufferSize: 16000, 
//       // Longer buffer timeout to complement the 250ms batching
//       bufferTimeout: 300,
//       base64Encode: true
//     });
    
//     // Initialize sample rate
//     if (processingOptions.resample && processingOptions.targetSampleRate) {
//       this.targetSampleRate = processingOptions.targetSampleRate;
//     }
    
//     // Register status change callback
//     this.streamingBridge.onStatusChange((status, message) => {
//       logger.info(LogCategory.WS, `Status change: ${status}`, { message });
//       this.notifyStatusChangeCallbacks(status, message);
//     });
    
//     // Initialize the streaming bridge with the target sample rate
//     this.streamingBridge.setSampleRate(this.targetSampleRate);
//   }
  
//   /**
//    * Override the processAudioChunk method to add streaming capability
//    * @param audioChunk The audio chunk to process
//    */
//   async processAudioChunk(audioChunk: Float32Array): Promise<void> {
//     // Add a more verbose log with chunk size and streaming state
//     console.log(`[STREAMING DEBUG] StreamingAudioProcessor received chunk with ${audioChunk.length} samples, streaming=${this.streaming}`);
    
//     // Log a few sample values to verify we're getting actual audio data
//     const sampleValues = Array.from(audioChunk.slice(0, 5)).map(v => v.toFixed(4));
//     console.log(`[STREAMING DEBUG] Audio chunk sample values: [${sampleValues.join(', ')}]`);
    
//     // Skip streaming if not enabled
//     if (!this.streaming) {
//       logger.debug(LogCategory.AUDIO, `Streaming processor received chunk but streaming is disabled, not forwarding`);
//       return;
//     }
    
//     try {
//       // Ensure the WebSocket connection is active
//       const isStreamingReady = this.streamingBridge.isEnabled();
//       if (!isStreamingReady) {
//         logger.info(LogCategory.WS, 'Enabling streaming bridge for audio processing');
//         this.streamingBridge.setEnabled(true);
//       }
      
//       // Process audio with parent class before streaming
//       // This may be unnecessary - focus on direct sending first
//       // await super.processAudioChunk(audioChunk);
      
//       // CRITICAL FIX: Directly send the audio chunk to the streaming bridge
//       logger.info(LogCategory.AUDIO, `StreamingAudioProcessor: Directly sending ${audioChunk.length} samples to bridge`);
//       console.log(`[STREAMING DEBUG] Directly sending ${audioChunk.length} samples to bridge`);
      
//       // Wait for the send operation to complete
//       await this.streamingBridge.processAudioChunk(audioChunk);
      
//       console.log(`[STREAMING DEBUG] Successfully sent audio chunk to streaming bridge`);
//       logger.info(LogCategory.AUDIO, 'StreamingAudioProcessor: Audio chunk successfully sent to server');
      
//       // Also try to get processed chunks from parent class - this is secondary
//       // and may not be necessary for basic streaming
//       const processedChunks = this.getProcessedChunks();
//       if (processedChunks && processedChunks.length > 0) {
//         console.log(`[STREAMING DEBUG] Also found ${processedChunks.length} processed chunks`);
//         logger.debug(LogCategory.AUDIO, `StreamingAudioProcessor: Found ${processedChunks.length} processed chunks`);
//       }
//     } catch (error) {
//       logger.error(LogCategory.ERROR, 'Error streaming audio data', error);
//       console.error('[STREAMING DEBUG] Error streaming audio:', error);
//     }
//   }
  
//   /**
//    * Enable or disable streaming
//    * @param enabled Whether to enable streaming
//    */
//   setStreaming(enabled: boolean): void {
//     console.log(`[STREAMING DEBUG] Setting streaming to ${enabled}`);
//     this.streaming = enabled;
//     this.streamingBridge.setEnabled(enabled);
    
//     if (enabled) {
//       // Reset processed index when enabling to ensure we start fresh
//       this.lastProcessedIndex = -1;
//       logger.info(LogCategory.AUDIO, 'Streaming enabled, reset processed index');
//     }
//   }
  
//   /**
//    * Check if streaming is enabled
//    * @returns True if streaming is enabled
//    */
//   isStreaming(): boolean {
//     return this.streaming;
//   }
  
//   /**
//    * Register a callback for streaming status changes
//    * @param callback The status change callback
//    */
//   onStreamingStatusChange(callback: (status: boolean, message?: string) => void): void {
//     this.statusChangeCallbacks.push(callback);
//   }
  
//   /**
//    * Notify all registered status change callbacks
//    * @param status The streaming status
//    * @param message Optional status message
//    */
//   private notifyStatusChangeCallbacks(status: boolean, message?: string): void {
//     for (const callback of this.statusChangeCallbacks) {
//       try {
//         callback(status, message);
//       } catch (error) {
//         logger.error(LogCategory.ERROR, 'Error in streaming status change callback', error);
//       }
//     }
//   }
  
//   /**
//    * Override updateOptions to update the target sample rate
//    * @param options New processing options
//    */
//   updateOptions(options: ProcessingOptions): void {
//     super.updateOptions(options);
    
//     // Update target sample rate if it changed
//     if (options.resample && options.targetSampleRate && 
//         options.targetSampleRate !== this.targetSampleRate) {
//       this.targetSampleRate = options.targetSampleRate;
//       this.streamingBridge.setSampleRate(this.targetSampleRate);
//     }
//   }
  
//   /**
//    * Helper method to access processed chunks
//    * @param processorName The name of the processor (optional)
//    * @returns Array of processed chunks or null if not found
//    */
//   private getProcessedChunks(processorName?: string): Float32Array[] | null {
//     // Access the private processedData map using a runtime property access
//     // This is a workaround since the parent class doesn't expose this directly
//     const processedData = (this as any).processedData as Map<string, Float32Array[]>;
    
//     if (!processedData || processedData.size === 0) {
//       console.log(`[STREAMING DEBUG] No processed data available`);
//       return null;
//     }
    
//     // If a specific processor name is provided, try to get its chunks
//     if (processorName) {
//       const chunks = processedData.get(processorName) || null;
//       console.log(`[STREAMING DEBUG] getProcessedChunks for '${processorName}': ${chunks ? 'found ' + chunks.length + ' chunks' : 'no chunks found'}`);
//       return chunks;
//     }
    
//     // Otherwise, get chunks from the first available processor
//     const firstKey = Array.from(processedData.keys())[0];
//     const chunks = processedData.get(firstKey) || null;
//     console.log(`[STREAMING DEBUG] getProcessedChunks using first processor '${firstKey}': ${chunks ? 'found ' + chunks.length + ' chunks' : 'no chunks found'}`);
    
//     return chunks;
//   }
// } 