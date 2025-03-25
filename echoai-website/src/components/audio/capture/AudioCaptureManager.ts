import { 
  AudioCaptureEvent, 
  AudioCaptureEventType, 
  AudioCaptureState,
  AudioProcessingOptions
} from '../../../types/audio-capture';
import { AudioCaptureNode } from './AudioCaptureNode';
import { audioLoggers } from '../../../utils/LoggerFactory';

/**
 * AudioCaptureManager
 * 
 * Manages the audio capture process, buffering audio chunks,
 * and coordinating with the AudioCaptureNode.
 */
export class AudioCaptureManager {
  private audioContext: AudioContext | null = null;
  private captureNode: AudioCaptureNode | null = null;
  private state: AudioCaptureState = AudioCaptureState.INACTIVE;
  private originalSampleRate: number = 0;
  private audioChunks: Float32Array[] = [];
  private processingOptions: AudioProcessingOptions = {
    resample: false,
    targetSampleRate: 44100,
    timeStretch: 1.0
  };
  
  // Event callbacks
  private eventListeners: Map<AudioCaptureEventType, ((event: AudioCaptureEvent) => void)[]> = new Map();
  
  /**
   * Create a new AudioCaptureManager
   * 
   * @param options Processing options
   */
  constructor(options?: Partial<AudioProcessingOptions>) {
    if (options) {
      this.processingOptions = {
        ...this.processingOptions,
        ...options
      };
    }
    audioLoggers.audioCapture.info('AudioCaptureManager: Created new instance', { processingOptions: this.processingOptions });
  }
  
  /**
   * Initialize the audio context and capture node
   * 
   * @returns Promise that resolves when initialized
   */
  async initialize(): Promise<void> {
    try {
      audioLoggers.audioCapture.info('AudioCaptureManager: Initializing');
      
      // Create audio context if it doesn't exist
      if (!this.audioContext) {
        audioLoggers.audioCapture.debug('AudioCaptureManager: Creating new AudioContext');
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      // Create capture node
      audioLoggers.audioCapture.debug('AudioCaptureManager: Creating audio capture node');
      this.captureNode = new AudioCaptureNode(this.audioContext);
      
      // Set up event handlers
      this.captureNode.onReady((sampleRate) => {
        audioLoggers.audioCapture.info(`AudioCaptureManager: Processor ready with sample rate ${sampleRate}Hz`);
        this.originalSampleRate = sampleRate;
        this._emitEvent(AudioCaptureEventType.CAPTURE_START, { sampleRate });
      });
      
      this.captureNode.onChunk((chunk) => {
        this._handleAudioChunk(chunk);
      });
      
      this.captureNode.onError((error) => {
        audioLoggers.audioCapture.error(`AudioCaptureManager: Processor error: ${error.message}`);
        this.state = AudioCaptureState.ERROR;
        this._emitEvent(AudioCaptureEventType.PROCESSOR_ERROR, { error: error.message });
      });
      
      // Initialize the capture node
      await this.captureNode.initialize();
      
      // Set state to initialized but inactive
      this.state = AudioCaptureState.INACTIVE;
      audioLoggers.audioCapture.info('AudioCaptureManager: Successfully initialized');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown initialization error';
      audioLoggers.audioCapture.error(`AudioCaptureManager: Initialization error: ${errorMsg}`, error);
      this.state = AudioCaptureState.ERROR;
      this._emitEvent(AudioCaptureEventType.PROCESSOR_ERROR, { error: errorMsg });
      throw error;
    }
  }
  
  /**
   * Connect the capture node to an audio source
   * 
   * @param sourceNode The source AudioNode to capture from
   * @param destinationNode Optional destination to connect the output to
   */
  connect(sourceNode: AudioNode, destinationNode?: AudioNode): void {
    if (!this.captureNode) {
      audioLoggers.audioCapture.error('AudioCaptureManager: Attempted to connect before initialization');
      throw new Error('AudioCaptureManager not initialized');
    }
    
    audioLoggers.audioCapture.info('AudioCaptureManager: Connecting to audio source');
    this.captureNode.connect(sourceNode, destinationNode);
  }
  
  /**
   * Start capturing audio
   */
  start(): void {
    if (!this.captureNode) {
      audioLoggers.audioCapture.error('AudioCaptureManager: Attempted to start capture before initialization');
      throw new Error('AudioCaptureManager not initialized');
    }
    
    if (this.state === AudioCaptureState.CAPTURING) {
      audioLoggers.audioCapture.debug('AudioCaptureManager: Already capturing, skipping start');
      return; // Already capturing
    }
    
    audioLoggers.audioCapture.info('AudioCaptureManager: Starting audio capture');
    
    // Reset the audio chunks
    this.audioChunks = [];
    
    // Start capturing
    this.captureNode.startCapture();
    this.state = AudioCaptureState.CAPTURING;
    
    this._emitEvent(AudioCaptureEventType.CAPTURE_START, {
      sampleRate: this.originalSampleRate
    });
  }
  
  /**
   * Pause capturing audio
   */
  pause(): void {
    if (!this.captureNode || this.state !== AudioCaptureState.CAPTURING) {
      audioLoggers.audioCapture.debug(`AudioCaptureManager: Cannot pause, current state is ${this.state}`);
      return;
    }
    
    audioLoggers.audioCapture.info('AudioCaptureManager: Pausing audio capture');
    this.captureNode.stopCapture();
    this.state = AudioCaptureState.PAUSED;
    
    const totalSamples = this._getTotalSampleCount();
    audioLoggers.audioCapture.debug(`AudioCaptureManager: Paused with ${this.audioChunks.length} chunks, ${totalSamples} samples`);
    
    this._emitEvent(AudioCaptureEventType.CAPTURE_PAUSE, {
      chunksCount: this.audioChunks.length,
      totalSamples
    });
  }
  
  /**
   * Resume capturing audio
   */
  resume(): void {
    if (!this.captureNode || this.state !== AudioCaptureState.PAUSED) {
      audioLoggers.audioCapture.debug(`AudioCaptureManager: Cannot resume, current state is ${this.state}`);
      return;
    }
    
    audioLoggers.audioCapture.info('AudioCaptureManager: Resuming audio capture');
    this.captureNode.startCapture();
    this.state = AudioCaptureState.CAPTURING;
    
    this._emitEvent(AudioCaptureEventType.CAPTURE_RESUME);
  }
  
  /**
   * Stop capturing audio and finalize
   */
  stop(): void {
    if (!this.captureNode) {
      audioLoggers.audioCapture.debug('AudioCaptureManager: No capture node, skipping stop');
      return;
    }
    
    audioLoggers.audioCapture.info('AudioCaptureManager: Stopping audio capture');
    
    // If we're capturing, stop first
    if (this.state === AudioCaptureState.CAPTURING) {
      this.captureNode.stopCapture();
    }
    
    // Request any remaining buffer from processor
    this.captureNode.requestBuffer();
    
    const totalSamples = this._getTotalSampleCount();
    const duration = totalSamples / this.originalSampleRate;
    
    audioLoggers.audioCapture.info(`AudioCaptureManager: Stopped with ${this.audioChunks.length} chunks, ${totalSamples} samples, ${duration.toFixed(2)}s duration`);
    
    this.state = AudioCaptureState.INACTIVE;
    
    this._emitEvent(AudioCaptureEventType.CAPTURE_STOP, {
      chunksCount: this.audioChunks.length,
      totalSamples,
      duration
    });
  }
  
  /**
   * Get the captured audio data
   * 
   * @returns The combined audio data and sample rate
   */
  getCapturedAudio(): { data: Float32Array, sampleRate: number } {
    if (this.audioChunks.length === 0) {
      audioLoggers.audioCapture.warn('AudioCaptureManager: Attempted to get captured audio but no chunks available');
      return { data: new Float32Array(0), sampleRate: this.originalSampleRate };
    }
    
    const data = this.combineAudioChunks();
    
    return {
      data,
      sampleRate: this.originalSampleRate
    };
  }
  
  /**
   * Add an event listener
   * 
   * @param eventType The event type to listen for
   * @param callback The callback to call when the event occurs
   */
  addEventListener(eventType: AudioCaptureEventType, callback: (event: AudioCaptureEvent) => void): void {
    const listeners = this.eventListeners.get(eventType) || [];
    listeners.push(callback);
    this.eventListeners.set(eventType, listeners);
  }
  
  /**
   * Remove an event listener
   * 
   * @param eventType The event type to stop listening for
   * @param callback The callback to remove
   */
  removeEventListener(eventType: AudioCaptureEventType, callback: (event: AudioCaptureEvent) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (!listeners) return;
    
    const index = listeners.indexOf(callback);
    if (index !== -1) {
      listeners.splice(index, 1);
      this.eventListeners.set(eventType, listeners);
    }
  }
  
  /**
   * Get the current capture state
   * 
   * @returns The current state
   */
  getState(): AudioCaptureState {
    return this.state;
  }
  
  /**
   * Get the original sample rate
   * 
   * @returns The sample rate in Hz
   */
  getSampleRate(): number {
    return this.originalSampleRate;
  }
  
  /**
   * Get the total duration of captured audio
   * 
   * @returns The duration in seconds
   */
  getDuration(): number {
    return this._getTotalSampleCount() / this.originalSampleRate;
  }
  
  /**
   * Get the number of audio chunks captured
   * 
   * @returns The number of chunks
   */
  getChunksCount(): number {
    return this.audioChunks.length;
  }
  
  /**
   * Cleanup resources
   */
  dispose(): void {
    audioLoggers.audioCapture.info('AudioCaptureManager: Disposing resources');
    
    if (this.captureNode) {
      this.captureNode.disconnect();
      this.captureNode = null;
    }
    
    this.audioChunks = [];
    this.state = AudioCaptureState.INACTIVE;
    this.eventListeners.clear();
    
    audioLoggers.audioCapture.debug('AudioCaptureManager: Resources disposed');
  }
  
  /**
   * Handle an audio chunk from the capture node
   * 
   * @param chunk The audio chunk
   */
  private _handleAudioChunk(chunk: Float32Array): void {
    // Only store chunks if we're capturing
    if (this.state === AudioCaptureState.CAPTURING) {
      this.audioChunks.push(chunk);
      
      audioLoggers.audioCapture.debug(`AudioCaptureManager: Received chunk #${this.audioChunks.length} with ${chunk.length} samples`);
      
      this._emitEvent(AudioCaptureEventType.CHUNK_RECEIVED, {
        chunkSize: chunk.length,
        chunksCount: this.audioChunks.length,
        totalSamples: this._getTotalSampleCount()
      });
    } else {
      audioLoggers.audioCapture.debug(`AudioCaptureManager: Ignoring chunk - not capturing (state: ${this.state})`);
    }
  }
  
  /**
   * Combine all audio chunks into a single Float32Array
   * 
   * @returns Combined audio data
   */
  private combineAudioChunks(): Float32Array {
    // Calculate total length
    const totalLength = this._getTotalSampleCount();
    
    // Create a new buffer to hold all samples
    const combinedBuffer = new Float32Array(totalLength);
    
    // Copy each chunk into the combined buffer
    let offset = 0;
    for (const chunk of this.audioChunks) {
      combinedBuffer.set(chunk, offset);
      offset += chunk.length;
    }
    
    return combinedBuffer;
  }
  
  /**
   * Get the total number of samples in all chunks
   * 
   * @returns Total sample count
   */
  private _getTotalSampleCount(): number {
    return this.audioChunks.reduce((total, chunk) => total + chunk.length, 0);
  }
  
  /**
   * Emit an event to all registered listeners
   * 
   * @param type The event type
   * @param details Optional event details
   */
  private _emitEvent(type: AudioCaptureEventType, details?: any): void {
    const event: AudioCaptureEvent = {
      type,
      timestamp: Date.now(),
      details
    };
    
    const listeners = this.eventListeners.get(type) || [];
    listeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
  }
} 