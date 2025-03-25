import { audioLoggers } from '../../../utils/LoggerFactory';
import { 
  AudioBatchOptions, 
  AudioBatchState, 
  AudioBatchEventType, 
  BatchStrategy 
} from '../../../types/audio-batch';

/**
 * Manages audio batching operations
 */
export class AudioBatchManager {
  // Configuration
  private options: AudioBatchOptions;
  
  // State
  private state: AudioBatchState = AudioBatchState.INACTIVE;
  private sampleRate: number = 44100; // Default sample rate
  
  // Data storage
  private inputData: Float32Array | null = null;
  private batches: Float32Array[] = [];
  
  // Event listeners
  private eventListeners: Map<AudioBatchEventType, ((event: any) => void)[]> = new Map();
  
  /**
   * Create a new AudioBatchManager
   * 
   * @param options Batching options
   */
  constructor(options: AudioBatchOptions) {
    // Set default values for options
    this.options = {
      strategy: options.strategy || BatchStrategy.FIXED_SIZE,
      batchSize: options.batchSize || 4096,
      batchDuration: options.batchDuration || 1.0,
      processIncomplete: options.processIncomplete !== false,
      overlap: options.overlap || 0
    };
    
    audioLoggers.audioCapture.info('AudioBatchManager: Created new instance', { options: this.options });
  }
  
  /**
   * Process audio data into batches
   * 
   * @param audioData Audio data to batch
   * @param sampleRate Sample rate of the audio data
   * @returns Array of batched audio data
   */
  process(audioData: Float32Array, sampleRate: number): Float32Array[] {
    if (audioData.length === 0) {
      audioLoggers.audioCapture.warn('AudioBatchManager: Empty audio data provided');
      return [];
    }
    
    this.sampleRate = sampleRate;
    this.inputData = audioData;
    this.batches = [];
    this.state = AudioBatchState.BATCHING;
    
    audioLoggers.audioCapture.info('AudioBatchManager: Starting batching process', {
      dataLength: audioData.length,
      sampleRate,
      strategy: this.options.strategy
    });
    
    // Emit start event
    this._emitEvent(AudioBatchEventType.BATCH_START, {
      dataLength: audioData.length,
      sampleRate,
      options: this.options
    });
    
    try {
      // Process according to strategy
      switch (this.options.strategy) {
        case BatchStrategy.FIXED_SIZE:
          this._processFixedSizeBatches(audioData);
          break;
          
        case BatchStrategy.TIME_BASED:
          this._processTimeBasedBatches(audioData, sampleRate);
          break;
          
        case BatchStrategy.DYNAMIC:
          this._processDynamicBatches(audioData, sampleRate);
          break;
          
        default:
          throw new Error(`Unknown batch strategy: ${this.options.strategy}`);
      }
      
      this.state = AudioBatchState.COMPLETE;
      
      // Emit complete event
      this._emitEvent(AudioBatchEventType.BATCH_COMPLETE, {
        batchCount: this.batches.length,
        totalSamples: audioData.length
      });
      
      audioLoggers.audioCapture.info('AudioBatchManager: Batching complete', {
        batchCount: this.batches.length,
        inputLength: audioData.length
      });
      
      return this.batches;
    } catch (error) {
      this.state = AudioBatchState.ERROR;
      
      // Emit error event
      this._emitEvent(AudioBatchEventType.BATCH_ERROR, { error });
      
      audioLoggers.audioCapture.error('AudioBatchManager: Error during batching', error);
      throw error;
    }
  }
  
  /**
   * Get the processed batches
   * 
   * @returns Array of audio batches
   */
  getBatches(): Float32Array[] {
    return this.batches;
  }
  
  /**
   * Process audio data into fixed-size batches
   * 
   * @param audioData Audio data to batch
   * @private
   */
  private _processFixedSizeBatches(audioData: Float32Array): void {
    const batchSize = this.options.batchSize || 4096;
    const overlap = Math.min(this.options.overlap || 0, batchSize - 1);
    
    audioLoggers.audioCapture.debug('AudioBatchManager: Processing fixed-size batches', {
      batchSize,
      overlap,
      dataLength: audioData.length
    });
    
    // Calculate the number of batches
    const effectiveStep = batchSize - overlap;
    const fullBatchCount = Math.floor((audioData.length - overlap) / effectiveStep);
    const hasPartialBatch = (audioData.length - overlap) % effectiveStep > 0;
    const totalBatches = fullBatchCount + (hasPartialBatch && this.options.processIncomplete ? 1 : 0);
    
    for (let i = 0; i < totalBatches; i++) {
      const startIdx = i * effectiveStep;
      const endIdx = Math.min(startIdx + batchSize, audioData.length);
      
      // Create batch
      const batch = audioData.slice(startIdx, endIdx);
      this.batches.push(batch);
      
      // Emit progress event
      this._emitEvent(AudioBatchEventType.BATCH_PROGRESS, {
        currentBatch: i + 1,
        totalBatches,
        progress: (i + 1) / totalBatches
      });
    }
  }
  
  /**
   * Process audio data into time-based batches
   * 
   * @param audioData Audio data to batch
   * @param sampleRate Sample rate of the audio data
   * @private
   */
  private _processTimeBasedBatches(audioData: Float32Array, sampleRate: number): void {
    const batchDuration = this.options.batchDuration || 1.0; // Default 1 second
    const batchSize = Math.floor(batchDuration * sampleRate);
    const overlap = Math.min(
      Math.floor((this.options.overlap || 0) * sampleRate),
      batchSize - 1
    );
    
    audioLoggers.audioCapture.debug('AudioBatchManager: Processing time-based batches', {
      batchDuration,
      batchSize,
      overlap,
      dataLength: audioData.length
    });
    
    // Use the fixed-size implementation with calculated batch size
    this.options.batchSize = batchSize;
    this.options.overlap = overlap;
    this._processFixedSizeBatches(audioData);
  }
  
  /**
   * Process audio data into dynamic batches
   * This is a placeholder for more sophisticated dynamic batching
   * 
   * @param audioData Audio data to batch
   * @param sampleRate Sample rate of the audio data
   * @private
   */
  private _processDynamicBatches(audioData: Float32Array, sampleRate: number): void {
    audioLoggers.audioCapture.debug('AudioBatchManager: Processing dynamic batches', {
      dataLength: audioData.length,
      sampleRate
    });
    
    // For now, this is a simple implementation that analyzes audio energy
    // to find reasonable batch boundaries
    
    // Default batch size as fallback
    const defaultBatchSize = Math.floor(sampleRate * 0.5); // 0.5 seconds
    const minBatchSize = Math.floor(sampleRate * 0.1); // 0.1 seconds minimum
    
    let startIdx = 0;
    let batchCount = 0;
    
    while (startIdx < audioData.length) {
      // Find a good boundary by looking for low-energy points
      const maxBatchSize = Math.min(defaultBatchSize * 2, audioData.length - startIdx);
      let endIdx = this._findOptimalBatchBoundary(audioData, startIdx, maxBatchSize);
      
      // Ensure minimum batch size
      if (endIdx - startIdx < minBatchSize && startIdx + minBatchSize <= audioData.length) {
        endIdx = startIdx + minBatchSize;
      }
      
      // Create batch
      const batch = audioData.slice(startIdx, endIdx);
      this.batches.push(batch);
      batchCount++;
      
      // Emit progress event
      this._emitEvent(AudioBatchEventType.BATCH_PROGRESS, {
        currentBatch: batchCount,
        progress: endIdx / audioData.length
      });
      
      // Move to next position
      startIdx = endIdx;
    }
  }
  
  /**
   * Find an optimal batch boundary based on audio characteristics
   * Simple algorithm that looks for low-energy points
   * 
   * @param audioData Audio data
   * @param startIdx Start index
   * @param maxLength Maximum length to search
   * @returns End index for the batch
   * @private
   */
  private _findOptimalBatchBoundary(
    audioData: Float32Array,
    startIdx: number,
    maxLength: number
  ): number {
    const endIdx = Math.min(startIdx + maxLength, audioData.length);
    
    // If we're close to the end, just return the end
    if (endIdx >= audioData.length - 10) {
      return audioData.length;
    }
    
    // Look for a quiet point (low amplitude) near the end
    const searchStart = Math.max(startIdx + Math.floor(maxLength * 0.8), startIdx + 10);
    let minEnergy = Number.MAX_VALUE;
    let bestPosition = endIdx;
    
    // Simple energy calculation over small windows
    const windowSize = 5;
    for (let i = searchStart; i < endIdx - windowSize; i++) {
      let energy = 0;
      for (let j = 0; j < windowSize; j++) {
        energy += Math.abs(audioData[i + j]);
      }
      
      if (energy < minEnergy) {
        minEnergy = energy;
        bestPosition = i + Math.floor(windowSize / 2);
      }
    }
    
    return bestPosition;
  }
  
  /**
   * Add an event listener
   * 
   * @param eventType Event type to listen for
   * @param listener Listener callback
   */
  addEventListener(eventType: AudioBatchEventType, listener: (event: any) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    
    this.eventListeners.get(eventType)!.push(listener);
    audioLoggers.audioCapture.debug(`AudioBatchManager: Added event listener for ${eventType}`);
  }
  
  /**
   * Remove an event listener
   * 
   * @param eventType Event type to remove listener from
   * @param listener Listener to remove
   */
  removeEventListener(eventType: AudioBatchEventType, listener: (event: any) => void): void {
    if (!this.eventListeners.has(eventType)) {
      return;
    }
    
    const listeners = this.eventListeners.get(eventType)!;
    const index = listeners.indexOf(listener);
    
    if (index !== -1) {
      listeners.splice(index, 1);
      audioLoggers.audioCapture.debug(`AudioBatchManager: Removed event listener for ${eventType}`);
    }
  }
  
  /**
   * Emit an event to all registered listeners
   * 
   * @param eventType Event type to emit
   * @param data Event data
   * @private
   */
  private _emitEvent(eventType: AudioBatchEventType, data: any): void {
    if (!this.eventListeners.has(eventType)) {
      return;
    }
    
    const event = {
      type: eventType,
      timestamp: Date.now(),
      ...data
    };
    
    audioLoggers.audioCapture.debug(`AudioBatchManager: Emitting event ${eventType}`, event);
    
    for (const listener of this.eventListeners.get(eventType)!) {
      try {
        listener(event);
      } catch (error) {
        audioLoggers.audioCapture.error('AudioBatchManager: Error in event listener', error);
      }
    }
  }
} 