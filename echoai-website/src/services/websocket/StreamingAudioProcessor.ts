import { AudioProcessorCore } from '../../components/audio/AudioProcessorCore';
import { ProcessingOptions } from '../../components/audio/types';
import { AudioStreamingBridge } from './audio/AudioStreamingBridge';
import { WebSocketService } from './WebSocketService';

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
   */
  constructor(
    processingOptions: ProcessingOptions,
    websocketUrl: string
  ) {
    // Initialize the parent class with processing options
    super(processingOptions);
    
    // Update target sample rate from options
    if (processingOptions.resample && processingOptions.targetSampleRate) {
      this.targetSampleRate = processingOptions.targetSampleRate;
    }
    
    // Create the WebSocket service
    const webSocketService = new WebSocketService({
      url: websocketUrl,
      autoReconnect: true,
      maxReconnectAttempts: 5
    });
    
    // Create the streaming bridge
    this.streamingBridge = new AudioStreamingBridge(webSocketService, {
      messageFormat: 'binary',
      maxBufferSize: this.targetSampleRate / 4 // Buffer about 1/4 second of audio
    });
    
    // Initialize the streaming bridge with the target sample rate
    this.streamingBridge.setSampleRate(this.targetSampleRate);
  }
  
  /**
   * Override the processAudioChunk method to add streaming capability
   * @param audioChunk The audio chunk to process
   */
  async processAudioChunk(audioChunk: Float32Array): Promise<void> {
    // Process with the parent class first
    await super.processAudioChunk(audioChunk);
    
    // Skip streaming if not enabled
    if (!this.streaming) {
      return;
    }
    
    try {
      // Get the processed audio from the RubberBand processor
      // This is the single touch point where we forward audio to the WebSocket
      const processedChunks = this.getProcessedChunks('rubberband');
      
      if (processedChunks && processedChunks.length > 0) {
        // Get the latest processed chunk
        const latestChunk = processedChunks[processedChunks.length - 1];
        
        // Send the processed chunk to the streaming bridge
        await this.streamingBridge.processAudioChunk(latestChunk);
      }
    } catch (error) {
      console.error('Error streaming audio data:', error);
    }
  }
  
  /**
   * Enable or disable streaming
   * @param enable Whether to enable streaming
   */
  setStreaming(enable: boolean): void {
    this.streaming = enable;
    this.streamingBridge.setEnabled(enable);
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
    return processedData.get(processorName) || null;
  }
} 