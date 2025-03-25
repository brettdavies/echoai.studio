import { AudioProcessorMessage, AudioProcessorMessageType } from '../../../types/audio-capture';
import { audioLoggers } from '../../../utils/LoggerFactory';

/**
 * AudioCaptureNode
 * 
 * Manages the AudioWorkletNode for capturing audio data.
 * Interfaces between the main thread and the audio worklet processor.
 */
export class AudioCaptureNode {
  private readonly audioContext: AudioContext;
  private workletNode: AudioWorkletNode | null = null;
  private sourceNode: AudioNode | null = null;
  private destinationNode: AudioNode | null = null;
  private isCapturing: boolean = false;
  private isLoaded: boolean = false;
  private processorSampleRate: number = 0;
  
  // Callbacks
  private onChunkCallback: ((chunk: Float32Array) => void) | null = null;
  private onReadyCallback: ((sampleRate: number) => void) | null = null;
  private onErrorCallback: ((error: Error) => void) | null = null;
  
  /**
   * Create a new AudioCaptureNode
   * 
   * @param audioContext The AudioContext to use
   */
  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
    audioLoggers.audioCapture.debug('AudioCaptureNode: Created new instance');
  }
  
  /**
   * Initialize the audio worklet
   * 
   * @returns Promise that resolves when the worklet is loaded
   */
  async initialize(): Promise<void> {
    if (this.isLoaded) {
      audioLoggers.audioCapture.debug('AudioCaptureNode: Already initialized, skipping');
      return;
    }
    
    try {
      audioLoggers.audioCapture.info('AudioCaptureNode: Loading audio-capture-processor worklet');
      // Load the worklet processor
      await this.audioContext.audioWorklet.addModule('/src/components/audio/capture/audio-capture-processor.js');
      
      audioLoggers.audioCapture.info('AudioCaptureNode: Creating AudioWorkletNode');
      // Create the worklet node
      this.workletNode = new AudioWorkletNode(this.audioContext, 'audio-capture-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        processorOptions: {
          chunkSize: 4096 // Default chunk size
        }
      });
      
      // Set up message handler
      this.workletNode.port.onmessage = this.handleProcessorMessage.bind(this);
      
      this.isLoaded = true;
      audioLoggers.audioCapture.info('AudioCaptureNode: Successfully initialized');
    } catch (error) {
      audioLoggers.audioCapture.error('AudioCaptureNode: Failed to initialize', error);
      this.isLoaded = false;
      if (this.onErrorCallback) {
        this.onErrorCallback(error instanceof Error ? error : new Error('Failed to load audio worklet'));
      }
      throw error;
    }
  }
  
  /**
   * Connect to an audio source
   * 
   * @param sourceNode The source AudioNode to capture from
   * @param destinationNode Optional destination to connect the output to
   * @returns This AudioCaptureNode for chaining
   */
  connect(sourceNode: AudioNode, destinationNode?: AudioNode): AudioCaptureNode {
    if (!this.isLoaded || !this.workletNode) {
      audioLoggers.audioCapture.error('AudioCaptureNode: Attempted to connect before initialization');
      throw new Error('AudioCaptureNode not initialized');
    }
    
    this.sourceNode = sourceNode;
    this.destinationNode = destinationNode || this.audioContext.destination;
    
    audioLoggers.audioCapture.info('AudioCaptureNode: Connecting audio graph');
    // Connect the source to the worklet
    sourceNode.connect(this.workletNode);
    
    // Connect the worklet to the destination if provided
    if (this.destinationNode) {
      this.workletNode.connect(this.destinationNode);
      audioLoggers.audioCapture.debug('AudioCaptureNode: Connected to destination node');
    }
    
    return this;
  }
  
  /**
   * Disconnect the audio nodes
   */
  disconnect(): void {
    audioLoggers.audioCapture.info('AudioCaptureNode: Disconnecting audio nodes');
    
    if (this.sourceNode && this.workletNode) {
      try {
        this.sourceNode.disconnect(this.workletNode);
        audioLoggers.audioCapture.debug('AudioCaptureNode: Source node disconnected');
      } catch (e) {
        audioLoggers.audioCapture.warn('AudioCaptureNode: Error disconnecting source node', e);
      }
    }
    
    if (this.workletNode && this.destinationNode) {
      try {
        this.workletNode.disconnect(this.destinationNode);
        audioLoggers.audioCapture.debug('AudioCaptureNode: Worklet node disconnected');
      } catch (e) {
        audioLoggers.audioCapture.warn('AudioCaptureNode: Error disconnecting worklet node', e);
      }
    }
    
    this.sourceNode = null;
    this.destinationNode = null;
  }
  
  /**
   * Start capturing audio
   * 
   * @param options Capture options
   */
  startCapture(options: { chunkSize?: number } = {}): void {
    if (!this.isLoaded || !this.workletNode) {
      audioLoggers.audioCapture.error('AudioCaptureNode: Attempted to start capture before initialization');
      throw new Error('AudioCaptureNode not initialized');
    }
    
    if (this.isCapturing) {
      audioLoggers.audioCapture.debug('AudioCaptureNode: Already capturing, skipping start');
      return; // Already capturing
    }
    
    this.isCapturing = true;
    
    const chunkSize = options.chunkSize || 4096;
    audioLoggers.audioCapture.info(`AudioCaptureNode: Starting capture with chunk size ${chunkSize}`);
    
    // Send message to worklet to start capturing
    this.workletNode.port.postMessage({
      type: 'start_capture',
      data: {
        chunkSize
      }
    });
  }
  
  /**
   * Stop capturing audio
   */
  stopCapture(): void {
    if (!this.isLoaded || !this.workletNode || !this.isCapturing) {
      audioLoggers.audioCapture.debug('AudioCaptureNode: Not capturing, skipping stop');
      return;
    }
    
    audioLoggers.audioCapture.info('AudioCaptureNode: Stopping capture');
    this.isCapturing = false;
    
    // Send message to worklet to stop capturing
    this.workletNode.port.postMessage({
      type: 'stop_capture'
    });
  }
  
  /**
   * Request the current buffer from the processor
   */
  requestBuffer(): void {
    if (!this.isLoaded || !this.workletNode) {
      audioLoggers.audioCapture.warn('AudioCaptureNode: Attempted to request buffer before initialization');
      return;
    }
    
    audioLoggers.audioCapture.info('AudioCaptureNode: Requesting buffer from processor');
    // Send message to worklet to get the buffer
    this.workletNode.port.postMessage({
      type: 'get_buffer'
    });
  }
  
  /**
   * Reset the capture node
   */
  reset(): void {
    if (!this.isLoaded || !this.workletNode) {
      audioLoggers.audioCapture.warn('AudioCaptureNode: Attempted to reset before initialization');
      return;
    }
    
    audioLoggers.audioCapture.info('AudioCaptureNode: Resetting capture node');
    this.isCapturing = false;
    
    // Send message to worklet to reset
    this.workletNode.port.postMessage({
      type: 'reset'
    });
  }
  
  /**
   * Set callback for when an audio chunk is processed
   * 
   * @param callback Function to call with the audio chunk
   */
  onChunk(callback: (chunk: Float32Array) => void): void {
    this.onChunkCallback = callback;
  }
  
  /**
   * Set callback for when the processor is ready
   * 
   * @param callback Function to call when the processor is ready
   */
  onReady(callback: (sampleRate: number) => void): void {
    this.onReadyCallback = callback;
    
    // If already ready, call the callback immediately
    if (this.isLoaded && this.processorSampleRate > 0) {
      callback(this.processorSampleRate);
    }
  }
  
  /**
   * Set callback for errors
   * 
   * @param callback Function to call when an error occurs
   */
  onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }
  
  /**
   * Handle messages from the audio worklet processor
   * 
   * @param event The message event
   */
  private handleProcessorMessage(event: MessageEvent<AudioProcessorMessage>): void {
    const { type, payload } = event.data;
    
    switch (type) {
      case AudioProcessorMessageType.PROCESSOR_READY:
        this.processorSampleRate = payload.sampleRate;
        audioLoggers.audioCapture.info(`AudioCaptureNode: Processor ready with sample rate ${payload.sampleRate}Hz`);
        if (this.onReadyCallback) {
          this.onReadyCallback(this.processorSampleRate);
        }
        break;
        
      case AudioProcessorMessageType.CHUNK_PROCESSED:
        if (this.onChunkCallback && payload.audioData) {
          audioLoggers.audioCapture.debug(`AudioCaptureNode: Received audio chunk with ${payload.audioData.length} samples`);
          this.onChunkCallback(payload.audioData);
        }
        break;
        
      case AudioProcessorMessageType.ERROR:
        const errorMsg = payload.message || 'Unknown processor error';
        audioLoggers.audioCapture.error(`AudioCaptureNode: Processor error: ${errorMsg}`);
        if (this.onErrorCallback) {
          this.onErrorCallback(new Error(errorMsg));
        }
        break;
        
      default:
        audioLoggers.audioCapture.warn(`AudioCaptureNode: Unknown message type: ${type}`);
    }
  }
  
  /**
   * Get the processor sample rate
   * 
   * @returns The processor sample rate or 0 if not ready
   */
  getProcessorSampleRate(): number {
    return this.processorSampleRate;
  }
  
  /**
   * Check if the node is capturing
   * 
   * @returns True if capturing, false otherwise
   */
  isActive(): boolean {
    return this.isCapturing;
  }
} 