import { AudioProcessorCore } from '../../components/audio/AudioProcessorCore';
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
export class StreamingAudioProcessor extends AudioProcessorCore {
  private streamingBridge: AudioStreamingBridge;
  private streaming: boolean = false;
  private targetSampleRate: number = 16000;
  
  /**
   * Creates a new StreamingAudioProcessor
   * @param processingOptions Audio processing options
   * @param websocketUrl WebSocket server URL
   * @param existingWebSocketService Optional existing WebSocketService instance
   */
  constructor(
    processingOptions: ProcessingOptions,
    websocketUrl: string,
    existingWebSocketService?: WebSocketService
  ) {
    console.log("[STREAMING DEBUG] StreamingAudioProcessor constructor called");
    
    // Initialize the parent class with processing options
    super(processingOptions);
    
    // Update target sample rate from options
    if (processingOptions.resample && processingOptions.targetSampleRate) {
      this.targetSampleRate = processingOptions.targetSampleRate;
    }
    
    // Use existing WebSocketService or get one from the WebSocketManager
    let webSocketService: WebSocketService;
    if (existingWebSocketService) {
      logger.info(LogCategory.WS, 'Using provided WebSocketService instance');
      webSocketService = existingWebSocketService;
    } else {
      // Get service from WebSocketManager
      logger.info(LogCategory.WS, 'Getting WebSocketService from WebSocketManager', { url: websocketUrl });
      webSocketService = WebSocketManager.getInstance().getService(websocketUrl, {
        autoReconnect: true,
        maxReconnectAttempts: 5
      });
    }
    
    // Create the streaming bridge
    this.streamingBridge = new AudioStreamingBridge(webSocketService, {
      messageFormat: 'json',
      maxBufferSize: this.targetSampleRate / 4,
      base64Encode: true
    });
    
    // Initialize the streaming bridge with the target sample rate
    this.streamingBridge.setSampleRate(this.targetSampleRate);
  }
  
  /**
   * Override the processAudioChunk method to add streaming capability
   * @param audioChunk The audio chunk to process
   */
  async processAudioChunk(audioChunk: Float32Array): Promise<void> {
    console.log(`[STREAMING DEBUG] StreamingAudioProcessor received chunk with ${audioChunk.length} samples`);
    
    // Process with the parent class first
    await super.processAudioChunk(audioChunk);
    
    // Skip streaming if not enabled
    if (!this.streaming) {
      logger.debug(LogCategory.AUDIO, `Streaming processor received chunk but streaming is disabled`);
      return;
    }
    
    try {
      // Ensure the WebSocket connection is active
      const isStreamingReady = this.streamingBridge.isEnabled();
      if (!isStreamingReady) {
        logger.info(LogCategory.WS, 'Enabling streaming bridge for audio processing');
        this.streamingBridge.setEnabled(true);
      }
      
      // Get the processed audio from the RubberBand processor
      // This is the single touch point where we forward audio to the WebSocket
      const processedChunks = this.getProcessedChunks('rubberband');
      
      logger.debug(LogCategory.AUDIO, `StreamingAudioProcessor: processed chunks available: ${processedChunks ? processedChunks.length : 0}`);
      
      let chunkToSend: Float32Array;
      
      if (processedChunks && processedChunks.length > 0) {
        // Get the latest processed chunk
        chunkToSend = processedChunks[processedChunks.length - 1];
        
        console.log(`[STREAMING DEBUG] Got processed chunk for streaming, length: ${chunkToSend.length}, first values:`, 
          Array.from(chunkToSend.slice(0, 5)));
        
        logger.debug(LogCategory.AUDIO, `StreamingAudioProcessor: forwarding processed chunk to bridge: ${chunkToSend.length} samples`);
      } else {
        console.log(`[STREAMING DEBUG] No processed chunks available, using original audio data`);
        
        // ALWAYS send audio data - use original if no processed chunks
        chunkToSend = audioChunk;
        
        logger.debug(LogCategory.AUDIO, `StreamingAudioProcessor: forwarding original chunk to bridge: ${chunkToSend.length} samples`);
      }
      
      // Send audio data to the bridge
      await this.streamingBridge.processAudioChunk(chunkToSend);
    } catch (error) {
      logger.error(LogCategory.ERROR, 'Error streaming audio data', error);
    }
  }
  
  /**
   * Enable or disable streaming
   * @param enabled Whether to enable streaming
   */
  setStreaming(enabled: boolean): void {
    console.log(`[STREAMING DEBUG] Setting streaming to ${enabled}`);
    this.streaming = enabled;
    this.streamingBridge.setEnabled(enabled);
  }
  
  /**
   * Check if streaming is enabled
   * @returns True if streaming is enabled
   */
  isStreaming(): boolean {
    return this.streaming;
  }
  
  /**
   * Set a callback for streaming status changes
   * @param callback The callback function
   */
  onStreamingStatusChange(callback: (status: boolean, message?: string) => void): void {
    this.streamingBridge.onStatusChange(callback);
  }
  
  /**
   * Override updateOptions to update the target sample rate
   * @param options New processing options
   */
  updateOptions(options: ProcessingOptions): void {
    super.updateOptions(options);
    
    // Update target sample rate if it changed
    if (options.resample && options.targetSampleRate && 
        options.targetSampleRate !== this.targetSampleRate) {
      this.targetSampleRate = options.targetSampleRate;
      this.streamingBridge.setSampleRate(this.targetSampleRate);
    }
  }
  
  /**
   * Helper method to access processed chunks
   * @param processorName The name of the processor
   * @returns Array of processed chunks or null if not found
   */
  private getProcessedChunks(processorName: string): Float32Array[] | null {
    // Access the private processedData map using a runtime property access
    // This is a workaround since the parent class doesn't expose this directly
    const processedData = (this as any).processedData as Map<string, Float32Array[]>;
    const chunks = processedData?.get(processorName) || null;
    
    console.log(`[STREAMING DEBUG] getProcessedChunks for '${processorName}': ${chunks ? 'found ' + chunks.length + ' chunks' : 'no chunks found'}`);
    
    // Debug available processor names if chunks not found
    if (!chunks) {
      console.log(`[STREAMING DEBUG] Available processors:`, 
        Array.from(processedData?.keys() || []));
    }
    
    return chunks;
  }
} 