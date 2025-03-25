/**
 * AudioStreamingBridge
 * 
 * A thin adapter class that bridges audio processing with WebSocket communication.
 * This is the ONLY integration point between audio and WebSocket systems.
 */

import { WebSocketService } from '../WebSocketService';
import type { 
  AudioStreamingOptions, 
  AudioMessageType,
  AudioMetadata,
  StatusChangeCallback,
  AudioConfig,
  WebSocketStateChangeEvent
} from './types';
import { DEFAULT_AUDIO_OPTIONS } from './types';
import { combineAudioChunks, convertToInt16, arrayBufferToBase64 } from './AudioUtils';
import { 
  createJsonMessage, 
  processAudioData
} from './MessageFormatter';
import { logger, LogCategory } from '../WebSocketLogger';
import { generateAudioTestMessageString } from '../../../utils/AudioTestUtils';

/**
 * Manages streaming of processed audio data over WebSocket
 * Serves as the single integration point between audio processing and WebSocket
 */
export class AudioStreamingBridge {
  private webSocketService: WebSocketService;
  private options: AudioStreamingOptions;
  private audioBuffer: Float32Array[] = [];
  private accumulatedBytes: number = 0;
  private sequenceNumber: number = 0;
  private bufferTimer: number | null = null;
  private enabled: boolean = false;
  private currentSampleRate: number = 16000;
  private sampleRate: number = 16000;
  private statusChangeCallbacks: StatusChangeCallback[] = [];
  private serviceId: string;
  
  /**
   * Creates a new AudioStreamingBridge
   * @param webSocketService The WebSocket service to use
   * @param options Configuration options
   */
  constructor(webSocketService: WebSocketService, options: Partial<AudioStreamingOptions> = {}) {
    this.webSocketService = webSocketService;
    this.options = { ...DEFAULT_AUDIO_OPTIONS, ...options };
    this.serviceId = this.generateServiceId();
    this.sampleRate = this.currentSampleRate;
    
    // Set service ID for logger
    logger.setServiceId(this.serviceId);
    
    logger.info(LogCategory.AUDIO, 'AudioStreamingBridge created', {
      sampleRate: this.currentSampleRate,
      maxBufferSize: this.options.maxBufferSize
    });
    
    // Register for WebSocket state changes
    this.webSocketService.on('state_change', this.handleStateChange.bind(this));
  }

  /**
   * Handle WebSocket state changes
   * @param event State change event
   */
  private handleStateChange(event: Event): void {
    // Cast to our expected event type
    const stateEvent = event as unknown as WebSocketStateChangeEvent;
    const detail = stateEvent.detail || {};
    
    logger.info(LogCategory.WS, `WebSocket state changed: ${detail.oldState} -> ${detail.newState}`);
    
    // Notify listeners of connection state changes
    if (detail.newState === 'connected') {
      
      this.notifyStatusChange(true, 'Connected to server');
    } else if (detail.oldState === 'connected') {
      this.notifyStatusChange(false, `Disconnected: ${detail.newState}`);
    }
  }
  
  /**
   * Enable or disable audio streaming
   * @param enabled Whether to enable streaming
   */
  setEnabled(enabled: boolean): void {
    const wasEnabled = this.enabled;
    this.enabled = enabled;
    
    logger.info(LogCategory.WS, `Audio streaming ${enabled ? 'enabled' : 'disabled'}`);
    
    if (enabled && !wasEnabled) {
      // Enable and connect if needed
      if (!this.webSocketService.isConnected()) {
        logger.info(LogCategory.WS, 'Starting WebSocket connection');
        this.webSocketService.connect().catch(error => {
          logger.error(LogCategory.ERROR, 'Failed to connect to streaming server', error);
          this.notifyStatusChange(false, `Connection failed: ${error.message}`);
        });
      }
    } else if (!enabled && wasEnabled) {
      // Flush the buffer before disabling
      logger.info(LogCategory.AUDIO, 'Flushing buffer before disabling');
      this.flushBuffer();
    }
  }
  
  /**
   * Check if streaming is enabled
   * @returns True if streaming is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
  
  /**
   * Set the current sample rate
   * @param sampleRate The sample rate in Hz
   */
  setSampleRate(sampleRate: number): void {
    if (this.currentSampleRate !== sampleRate) {
      logger.info(LogCategory.AUDIO, `Sample rate changed: ${this.currentSampleRate} -> ${sampleRate}`);
      this.currentSampleRate = sampleRate;
      this.sampleRate = sampleRate;
    }
  }
  
  /**
   * Process an audio chunk and send it to the WebSocket server
   * @param audioChunk Float32Array containing audio samples
   */
  async processAudioChunk(audioChunk: Float32Array): Promise<void> {
    if (!this.enabled || !this.webSocketService || audioChunk.length === 0) {
      logger.debug(LogCategory.AUDIO, 'Skipping audio chunk processing: streaming not enabled or empty chunk');
      return;
    }
    
    try {
      logger.debug(LogCategory.AUDIO, `Processing audio chunk with ${audioChunk.length} samples`);
      
      // Ensure we have enough sample values to send (at least 128 samples for WebSocket)
      if (audioChunk.length < 128) {
        logger.debug(LogCategory.AUDIO, `Audio chunk too small (${audioChunk.length} samples), adding silence to reach 128`);
        const paddedChunk = new Float32Array(128);
        paddedChunk.set(audioChunk);
        return this.sendAudioData(paddedChunk);
      }
      
      // For larger chunks, process directly
      logger.debug(LogCategory.AUDIO, `Sending audio chunk with ${audioChunk.length} samples directly`);
      await this.sendAudioData(audioChunk);
    } catch (error) {
      logger.error(LogCategory.ERROR, 'Error processing audio chunk', error);
      throw error;
    }
  }

  /**
   * Send audio data to the WebSocket server
   * @param audioData Float32Array containing audio samples
   */
  private sendAudioData(audioData: Float32Array): void {
    try {
      // Convert to INT16 for efficient transmission
      const int16Data = convertToInt16(audioData);
      
      // For debugging, log audio levels occasionally
      if (this.shouldLogLevels()) {
        this.logAudioLevels(audioData);
      }

      // Use helper functions to process the audio data
      const { metadata } = processAudioData(
        audioData,
        this.currentSampleRate,
        this.sequenceNumber++,
        true // Add timestamp
      );
      
      // Create JSON message using the helper function
      const jsonMessage = createJsonMessage(int16Data.buffer, metadata);

      // Send to websocket
      if (this.webSocketService) {
        this.webSocketService.send(jsonMessage);
        logger.debug(LogCategory.AUDIO, `Sent audio chunk: ${audioData.length} samples at ${this.currentSampleRate}Hz`);
      } else {
        logger.warn(LogCategory.WS, 'No WebSocket service available for audio streaming');
      }
    } catch (err) {
      logger.error(LogCategory.ERROR, `Error sending audio data: ${err}`);
    }
  }
  
  /**
   * Determines if audio levels should be logged based on sampling frequency
   * @returns True if levels should be logged
   */
  private shouldLogLevels(): boolean {
    // Only log levels occasionally (every 20th chunk) to avoid excessive logging
    return Math.random() < 0.05 && (logger.getLogLevel() <= 4);
  }
  
  /**
   * Log audio levels for debugging
   * @param audioData Float32Array containing audio samples
   */
  private logAudioLevels(audioData: Float32Array): void {
    // Only calculate levels in debug mode to save performance
    if (logger.getLogLevel() <= 4) { // DEBUG level is 4
      try {
        // Calculate RMS level
        let sum = 0;
        const maxAmplitude = 1.0; // Max value for 1.0 range
        
        for (let i = 0; i < audioData.length; i++) {
          sum += (audioData[i] / maxAmplitude) ** 2;
        }
        
        const rms = Math.sqrt(sum / audioData.length);
        const dbFS = 20 * Math.log10(rms); // dB relative to full scale
        
        // Find peak level
        let peak = 0;
        for (let i = 0; i < audioData.length; i++) {
          peak = Math.max(peak, Math.abs(audioData[i]) / maxAmplitude);
        }
        
        const peakDbFS = 20 * Math.log10(peak);
        
        // Log only if there's significant audio
        if (dbFS > -60) { // -60 dBFS threshold
          logger.debug(LogCategory.AUDIO, `Audio levels: RMS=${dbFS.toFixed(2)} dBFS, Peak=${peakDbFS.toFixed(2)} dBFS`);
        }
      } catch (e) {
        // Ignore errors in debug calculations
      }
    }
  }
  
  /**
   * Flush the audio buffer and send to server
   */
  async flushBuffer(): Promise<void> {
    // Skip if buffer is empty
    if (this.audioBuffer.length === 0) {
      logger.debug(LogCategory.AUDIO, 'Buffer flush called but buffer is empty');
      return;
    }
    
    // Clear the buffer timer
    if (this.bufferTimer !== null) {
      clearTimeout(this.bufferTimer);
      this.bufferTimer = null;
    }
    
    // Combine all buffered chunks into a single Float32Array
    const combinedBuffer = combineAudioChunks(this.audioBuffer);
    
    logger.debug(LogCategory.AUDIO, `Flushing buffer with ${this.audioBuffer.length} chunks, combined into ${combinedBuffer.length} samples`);
    
    logger.info(LogCategory.AUDIO, `Flushing audio buffer`, {
      chunks: this.audioBuffer.length,
      samples: combinedBuffer.length,
      bytes: combinedBuffer.length * Float32Array.BYTES_PER_ELEMENT,
      isServiceConnected: this.webSocketService.isConnected()
    });
    
    // Clear buffer immediately to allow new data to be added
    this.audioBuffer = [];
    this.accumulatedBytes = 0;
    
    // Ensure connection before sending
    const isConnected = await this.checkAndEnsureConnection();
    if (!isConnected) {
      logger.warn(LogCategory.WS, 'Cannot send audio: Failed to establish WebSocket connection');
      return;
    }
    
    // Send the combined buffer
    this.sendAudioData(combinedBuffer);
  }
  
  /**
   * Register a callback for streaming status changes
   * @param callback The callback function
   */
  onStatusChange(callback: StatusChangeCallback): void {
    this.statusChangeCallbacks.push(callback);
    logger.debug(LogCategory.WS, 'Status change callback registered');
  }
  
  /**
   * Notify all status change callbacks
   * @param status The connection status
   * @param message Optional status message
   */
  private notifyStatusChange(status: boolean, message?: string): void {
    logger.info(LogCategory.WS, `Status change: ${status}`, { message });
    
    this.statusChangeCallbacks.forEach(callback => {
      try {
        callback(status, message);
      } catch (error) {
        logger.error(LogCategory.ERROR, 'Error in status change callback', error);
      }
    });
  }
  
  /**
   * Generate a unique service ID for logging
   * @returns A unique service ID
   */
  private generateServiceId(): string {
    return `audio-bridge-${Math.floor(Math.random() * 1000)}`;
  }

  /**
   * Checks and ensures an active WebSocket connection
   * @returns Promise that resolves when connection is verified
   */
  async checkAndEnsureConnection(): Promise<boolean> {
    // If already connected, return true
    if (this.webSocketService.isConnected()) {
      logger.debug(LogCategory.WS, 'WebSocket connection verified');
      return true;
    }
    
    // Get current state
    const state = this.webSocketService.getState();
    
    logger.info(LogCategory.WS, `WebSocket connection check: current state ${state}`);
    
    // If already connecting/reconnecting, wait a bit
    if (state === 'connecting' || state === 'reconnecting') {
      logger.info(LogCategory.WS, 'Connection in progress, waiting...');
      
      // Wait for connection to establish
      return new Promise<boolean>((resolve) => {
        const checkInterval = window.setInterval(() => {
          if (this.webSocketService.isConnected()) {
            clearInterval(checkInterval);
            logger.info(LogCategory.WS, 'Connection established while waiting');
            resolve(true);
          }
        }, 100);
        
        // Timeout after 5 seconds
        window.setTimeout(() => {
          clearInterval(checkInterval);
          logger.warn(LogCategory.WS, 'Timed out waiting for connection');
          resolve(false);
        }, 5000);
      });
    }
    
    // Try to connect
    try {
      logger.info(LogCategory.WS, 'Attempting to establish connection');
      await this.webSocketService.connect();
      
      return true;
    } catch (error) {
      logger.error(LogCategory.ERROR, 'Failed to establish connection', error);
      return false;
    }
  }
} 