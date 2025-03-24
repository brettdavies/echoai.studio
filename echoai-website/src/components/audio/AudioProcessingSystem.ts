import { AudioConnectionManager } from './AudioConnectionManager';
import { AudioProcessorCore } from './AudioProcessorCore';
import { AudioWorkletManager } from './AudioWorkletManager';
import { AudioSessionManager } from './AudioSessionManager';
import { ProcessingOptions } from './types';
import { setupUserInteractionHandlers } from './AudioContextHelper';
import { audioLoggers } from '../../utils/LoggerFactory';

/**
 * Main coordinator for the audio processing system 
 * Acts as a facade to simplify interaction with the various managers
 */
export class AudioProcessingSystem {
  private processorCore: AudioProcessorCore | null = null;
  private workletManager: AudioWorkletManager | null = null;
  private connectionManager: AudioConnectionManager | null = null;
  private sessionManager: AudioSessionManager | null = null;
  private userInteractionCleanup: (() => void) | null = null;
  
  /**
   * Creates a new AudioProcessingSystem
   * @param audioContext The audio context to use
   * @param sourceNode The source node to connect to
   * @param processingOptions Processing options
   * @param onAudioDataCallback Callback for processed audio data
   * @param customProcessorCore Optional custom processor core (e.g., StreamingAudioProcessor)
   */
  constructor(
    private audioContext: AudioContext,
    private sourceNode: MediaElementAudioSourceNode | null,
    private processingOptions: ProcessingOptions,
    private onAudioDataCallback: (audioData: Float32Array) => void,
    customProcessorCore?: AudioProcessorCore
  ) {
    // If a custom processor core is provided, use it
    if (customProcessorCore) {
      this.processorCore = customProcessorCore;
    }
  }
  
  /**
   * Initializes all necessary audio managers
   * @returns A promise that resolves when all managers are initialized
   */
  async initialize(): Promise<void> {
    // Skip if required components are missing
    if (!this.audioContext || !this.sourceNode) {
      audioLoggers.processor.error('Cannot initialize audio system: missing AudioContext or source node');
      return;
    }
    
    try {
      // Create processor core if not already set via constructor
      if (!this.processorCore) {
        this.processorCore = new AudioProcessorCore(this.processingOptions);
      }
      
      // Create connection manager
      this.connectionManager = new AudioConnectionManager(
        this.audioContext,
        this.sourceNode
      );
      
      // Set up user interaction handlers for auto-play policies
      this.userInteractionCleanup = setupUserInteractionHandlers(
        () => this.connectionManager!.ensureAudioContextResumed()
      );
      
      // Create and initialize worklet manager
      this.workletManager = new AudioWorkletManager(this.audioContext);
      this.workletManager.setAudioDataCallback(this.onAudioDataCallback);
      await this.workletManager.initialize();
      
      // Create session manager
      this.sessionManager = new AudioSessionManager(
        this.processorCore,
        this.connectionManager,
        this.workletManager
      );
      
      audioLoggers.processor.info('Audio processing system initialized successfully');
    } catch (error) {
      audioLoggers.processor.error('Failed to initialize audio processing system:', error);
      this.cleanup();
      throw error;
    }
  }
  
  /**
   * Updates the processing options
   * @param options New processing options
   */
  updateOptions(options: ProcessingOptions): void {
    this.processingOptions = options;
    
    if (this.processorCore) {
      this.processorCore.updateOptions(options);
    }
  }
  
  /**
   * Updates the source node
   * @param sourceNode New source node
   */
  updateSourceNode(sourceNode: MediaElementAudioSourceNode): void {
    this.sourceNode = sourceNode;
    
    if (this.connectionManager) {
      this.connectionManager.updateSourceNode(sourceNode);
    }
  }
  
  /**
   * Sets the playback state
   * @param isPlaying Whether audio is playing
   */
  setPlaybackState(isPlaying: boolean): void {
    if (this.workletManager) {
      this.workletManager.setPlaybackState(isPlaying);
    }
  }
  
  /**
   * Starts audio processing
   */
  async startProcessing(): Promise<void> {
    if (!this.sessionManager) {
      audioLoggers.processor.error('Cannot start processing: session manager not initialized');
      return;
    }
    
    await this.sessionManager.startProcessing();
  }
  
  /**
   * Stops audio processing
   */
  async stopProcessing(): Promise<void> {
    if (!this.sessionManager) {
      audioLoggers.processor.error('Cannot stop processing: session manager not initialized');
      return;
    }
    
    await this.sessionManager.stopProcessing();
  }
  
  /**
   * Cleans up all resources
   */
  cleanup(): void {
    // Clean up session manager
    if (this.sessionManager) {
      this.sessionManager.cleanup();
    }
    
    // Clean up worklet manager
    if (this.workletManager) {
      this.workletManager.dispose();
    }
    
    // Clean up user interaction handlers
    if (this.userInteractionCleanup) {
      this.userInteractionCleanup();
    }
    
    // Reset all managers
    this.processorCore = null;
    this.workletManager = null;
    this.connectionManager = null;
    this.sessionManager = null;
  }
  
  /**
   * Gets the processor core
   * @returns The processor core or null if not initialized
   */
  getProcessorCore(): AudioProcessorCore | null {
    return this.processorCore;
  }
} 