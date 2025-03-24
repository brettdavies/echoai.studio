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
import { combineAudioChunks } from './AudioUtils';
import { 
  createBinaryMessage, 
  createJsonMessage, 
  createConfigMessage,
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
    
    // Set service ID for logger
    logger.setServiceId(this.serviceId);
    
    logger.info(LogCategory.AUDIO, 'AudioStreamingBridge created', {
      sampleRate: this.currentSampleRate,
      messageFormat: this.options.messageFormat,
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
      // Server doesn't currently support config messages
      // this.sendConfigMessage();
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
      } else {
        // Ensure we send config even if already connected
        logger.info(LogCategory.WS, 'WebSocket already connected, sending config');
        this.sendConfigMessage();
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
      
      // Server doesn't currently support config messages
      // if (this.webSocketService.isConnected()) {
      //   this.sendConfigMessage();
      // }
    }
  }
  
  /**
   * Process audio data and send it to the server
   * @param audioData The audio data to process
   * @returns A promise that resolves when the data is queued
   */
  async processAudioChunk(audioData: Float32Array): Promise<void> {
    // Skip if streaming is disabled
    if (!this.enabled) {
      return Promise.resolve();
    }
    
    logger.debug(LogCategory.AUDIO, `Processing audio chunk: ${audioData.length} samples, enabled: ${this.enabled}, connected: ${this.webSocketService.isConnected()}`);
    
    // Periodically check connection status (every ~10 chunks)
    if (this.sequenceNumber % 10 === 0) {
      await this.checkAndEnsureConnection();
    }
    
    // Add to buffer
    this.audioBuffer.push(audioData);
    this.accumulatedBytes += audioData.length * Float32Array.BYTES_PER_ELEMENT;
    
    logger.debug(LogCategory.AUDIO, `Added audio chunk to buffer`, {
      chunkSize: audioData.length,
      bufferSize: this.audioBuffer.length,
      totalBytes: this.accumulatedBytes,
      isServiceConnected: this.webSocketService.isConnected()
    });
    
    // Start buffer timer if not already running
    if (this.bufferTimer === null && this.options.bufferTimeout! > 0) {
      this.bufferTimer = window.setTimeout(() => {
        this.bufferTimer = null;
        logger.debug(LogCategory.AUDIO, 'Buffer timeout reached, flushing');
        this.flushBuffer();
      }, this.options.bufferTimeout);
    }
    
    // Flush if buffer size threshold reached
    if (this.accumulatedBytes >= this.options.maxBufferSize!) {
      logger.debug(LogCategory.AUDIO, `Buffer size threshold reached (${this.accumulatedBytes} bytes), flushing`);
      this.flushBuffer();
    }
    
    return Promise.resolve();
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
    
    console.log(`[BRIDGE DEBUG] Flushing buffer with ${this.audioBuffer.length} chunks, combined into ${combinedBuffer.length} samples`);
    
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
   * Send audio data to the server
   * @param audioData The audio data to send
   */
  private sendAudioData(audioData: Float32Array): void {
    if (!this.webSocketService.isConnected() || audioData.length === 0) {
      if (!this.webSocketService.isConnected()) {
        logger.warn(LogCategory.WS, 'Cannot send audio data: WebSocket not connected', {
          state: this.webSocketService.getState(),
          enabled: this.enabled,
          serviceId: this.serviceId
        });
      } else {
        logger.warn(LogCategory.AUDIO, 'Cannot send audio data: Empty data');
      }
      return;
    }
    
    // Increment sequence number
    this.sequenceNumber++;
    
    logger.debug(LogCategory.AUDIO, `Preparing audio data for transmission`, {
      sequenceNumber: this.sequenceNumber,
      samples: audioData.length,
      sampleRate: this.currentSampleRate
    });
    
    try {
      // Process the audio data
      const { int16Data, metadata } = processAudioData(
        audioData, 
        this.currentSampleRate,
        this.options.addSequenceNumber ? this.sequenceNumber : 0,
        !!this.options.addTimestamp
      );
      
      // Log data that's being sent
      logger.debug(LogCategory.AUDIO, `Audio data processed for sending`, {
        format: metadata.format,
        channels: metadata.channels,
        sampleRate: metadata.sampleRate,
        messageFormat: this.options.messageFormat,
        bytes: int16Data.byteLength,
        firstFewSamples: Array.from(new Int16Array(int16Data.slice(0, 10)))
      });
      
      if (this.options.messageFormat === 'binary') {
        // Send as binary message
        const binaryMessage = createBinaryMessage(int16Data, metadata);
        logger.debug(LogCategory.AUDIO, `Created binary message with size ${binaryMessage.byteLength} bytes`);
        
        this.webSocketService.send(binaryMessage, 5, true)
          .then(() => {
            logger.debug(LogCategory.AUDIO, `Binary audio data sent successfully`, { 
              bytes: binaryMessage.byteLength,
              sequence: this.sequenceNumber
            });
          })
          .catch(error => {
            logger.error(LogCategory.ERROR, 'Error sending binary audio data', error);
          });
      } else {
        // Send as JSON message
        const jsonMessage = createJsonMessage(int16Data, metadata, !!this.options.base64Encode);
        logger.debug(LogCategory.AUDIO, `Created JSON message with size ${jsonMessage.length} characters`);
        
        this.webSocketService.send(jsonMessage, 5, true)
          .then(() => {
            logger.debug(LogCategory.AUDIO, `JSON audio data sent successfully`, { 
              bytes: jsonMessage.length,
              sequence: this.sequenceNumber
            });
          })
          .catch(error => {
            logger.error(LogCategory.ERROR, 'Error sending JSON audio data', error);
          });
      }
    } catch (error) {
      logger.error(LogCategory.ERROR, 'Failed to prepare or send audio data', error);
    }
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
   * Send configuration message to server
   * Note: Currently not used as the server doesn't support config messages
   * @private
   */
  private sendConfigMessage(): void {
    // Implementation removed as server doesn't support config messages
    logger.info(LogCategory.WS, 'Config messages not supported by current server');
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
      
      // Server doesn't currently support config messages
      // this.sendConfigMessage();
      
      return true;
    } catch (error) {
      logger.error(LogCategory.ERROR, 'Failed to establish connection', error);
      return false;
    }
  }
} 