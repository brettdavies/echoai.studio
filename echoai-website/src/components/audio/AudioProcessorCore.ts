import { AudioProcessorModule, ProcessingOptions } from './types';
import { createRubberBandModule } from './RubberBandProcessor';
import { needsProcessing } from './utils';
import { AudioFileManager } from './AudioFileManager';
import { audioLoggers } from '../../utils/LoggerFactory';

/**
 * Core processing logic for audio processing, extracted from the AudioProcessor component
 * to reduce component size and improve modularity
 */
export class AudioProcessorCore {
  // Raw audio data
  protected originalChunks: Float32Array[] = [];
  
  // Processed audio data by processor
  protected processedData: Map<string, Float32Array[]> = new Map();
  
  // Processor modules
  protected processorModules: AudioProcessorModule[] = [];
  
  // Original sample rate
  protected originalSampleRate: number = 0;
  
  // Batch processing properties
  private pendingChunks: Float32Array[] = [];
  private batchDurationMs: number = 250; // 250ms batch size
  private batchSampleCount: number = 0;
  private isProcessingBatch: boolean = false;
  
  /**
   * Constructor
   * @param processingOptions Processing options
   */
  constructor(protected processingOptions: ProcessingOptions) {
    this.initializeProcessors();
  }
  
  /**
   * Updates processing options
   * @param options New processing options
   */
  updateOptions(options: ProcessingOptions): void {
    this.processingOptions = options;
    this.initializeProcessors();
  }
  
  /**
   * Gets the original sample rate
   */
  getOriginalSampleRate(): number {
    return this.originalSampleRate;
  }
  
  /**
   * Sets the original sample rate
   * @param sampleRate The sample rate
   */
  setOriginalSampleRate(sampleRate: number): void {
    this.originalSampleRate = sampleRate;
  }
  
  /**
   * Processes an audio chunk through all registered processors
   * @param audioChunk The audio chunk to process
   */
  async processAudioChunk(audioChunk: Float32Array): Promise<void> {
    // Debug - track original audio data
    audioLoggers.processor.debug(`Received chunk with ${audioChunk.length} samples, first few values:`, 
      Array.from(audioChunk.slice(0, 5)));
    
    // Store original chunk
    this.originalChunks.push(audioChunk);
    
    // Calculate batch size if not already done
    if (this.batchSampleCount === 0 && this.originalSampleRate > 0) {
      this.batchSampleCount = Math.ceil(this.originalSampleRate * (this.batchDurationMs / 1000));
      audioLoggers.processor.debug(`Batch size calculated: ${this.batchSampleCount} samples for ${this.batchDurationMs}ms at ${this.originalSampleRate}Hz`);
    }
    
    // Add to pending chunks
    this.pendingChunks.push(audioChunk);
    
    // Calculate total length of pending chunks
    const pendingLength = this.pendingChunks.reduce((acc, chunk) => acc + chunk.length, 0);
    
    // Only process when we have enough data or if processing is explicitly forced
    if (pendingLength >= this.batchSampleCount && !this.isProcessingBatch) {
      audioLoggers.processor.debug(`Processing batch of ${this.pendingChunks.length} chunks (${pendingLength} samples)`);
      
      // Set flag to prevent reentrant processing
      this.isProcessingBatch = true;
      
      try {
        // Process all pending chunks as a batch through each module
        for (const module of this.processorModules) {
          try {
            // Get the storage array for this processor
            const processedChunks = this.processedData.get(module.name) || [];
            
            // Process each chunk in the batch
            for (const chunk of this.pendingChunks) {
              // Debug before processing
              audioLoggers.processor.debug(`Processing through module ${module.name}`);
              
              // Process the chunk
              const processedChunk = await module.processChunk(
                chunk,
                this.originalSampleRate
              );
              
              // Skip empty chunks
              if (processedChunk.length > 0) {
                // Debug after processing
                audioLoggers.processor.debug(`Module ${module.name} produced chunk with ${processedChunk.length} samples`);
                
                // Store the processed chunk
                processedChunks.push(processedChunk);
              }
            }
            
            this.processedData.set(module.name, processedChunks);
          } catch (error) {
            audioLoggers.processor.error(`Error in processor module ${module.name}:`, error);
          }
        }
        
        // Clear pending chunks after processing
        this.pendingChunks = [];
      } finally {
        // Clear processing flag
        this.isProcessingBatch = false;
      }
    } else {
      audioLoggers.processor.debug(`Added to batch queue: ${pendingLength}/${this.batchSampleCount} samples (${Math.floor(pendingLength / Math.max(1, this.batchSampleCount) * 100)}% of batch)`);
    }
  }
  
  /**
   * Preloads the processor modules (useful for initializing WebAssembly)
   * @param sampleRate The sample rate to use for preloading
   */
  async preloadProcessors(sampleRate: number): Promise<void> {
    if (needsProcessing(this.processingOptions) && this.processorModules.length > 0) {
      try {
        audioLoggers.processor.info('Preloading audio processing modules...');
        await this.processorModules[0].processChunk(
          new Float32Array(0), 
          sampleRate
        );
      } catch (error) {
        audioLoggers.processor.error('Failed to preload audio processing modules:', error);
      }
    }
  }
  
  /**
   * Clears all audio data
   */
  clearData(): void {
    this.originalChunks = [];
    this.processedData.forEach((_, key) => {
      this.processedData.set(key, []);
    });
  }
  
  /**
   * Processes and saves all audio files
   */
  async saveAudioFiles(): Promise<void> {
    audioLoggers.processor.debug('saveAudioFiles called - chunks:', this.originalChunks.length);
    
    if (this.originalChunks.length === 0) {
      audioLoggers.processor.info('No audio data to save, aborting save operation');
      return; // Don't save anything if no audio data is available
    }
    
    audioLoggers.processor.debug('Has audio data, proceeding with save');
    
    // Get processor names
    const processorNames = this.processorModules.map(module => module.name);
    
    // Process and finalize audio with each processor
    for (const module of this.processorModules) {
      try {
        // Check if module has finalize method
        if (module.finalize) {
          const chunks = this.processedData.get(module.name) || [];
          audioLoggers.processor.debug(`Finalizing processor ${module.name} with ${chunks.length} chunks`);
          
          const processedAudio = await module.finalize(chunks, this.originalSampleRate);
          
          // Replace chunks with finalized data
          const finalizedChunks = [processedAudio.data];
          this.processedData.set(module.name, finalizedChunks);
          
          audioLoggers.processor.debug(`Finalized ${module.name} data: ${processedAudio.data.length} samples`);
        }
      } catch (error) {
        audioLoggers.processor.error(`Error finalizing processor ${module.name}:`, error);
      }
    }
    
    audioLoggers.processor.debug('About to call AudioFileManager.saveAllAudioFiles');
    
    // Save all audio files
    await AudioFileManager.saveAllAudioFiles(
      this.originalChunks,
      this.processedData,
      this.originalSampleRate,
      this.processingOptions,
      processorNames
    );
    
    audioLoggers.processor.debug('AudioFileManager.saveAllAudioFiles completed');
    
    // Clear data after saving
    this.clearData();
  }
  
  /**
   * Add an audio chunk directly for debugging
   * @param audioChunk The audio chunk to add
   */
  addDebugAudioChunk(audioChunk: Float32Array): void {
    audioLoggers.processor.debug(`Adding debug audio chunk with ${audioChunk.length} samples`);
    this.originalChunks.push(audioChunk);
  }
  
  /**
   * Initializes the processor modules
   */
  private initializeProcessors(): void {
    const modules: AudioProcessorModule[] = [];
    
    // Check if we need audio processing
    if (needsProcessing(this.processingOptions)) {
      // Add RubberBand module with options
      modules.push(createRubberBandModule(this.processingOptions));
      audioLoggers.processor.info('RubberBand processing enabled - processing and saving audio files');
    }
    
    this.processorModules = modules;
    
    // Initialize data storage for each processor
    this.processedData.clear();
    modules.forEach(module => {
      this.processedData.set(module.name, []);
    });
    
    audioLoggers.processor.info(`Initialized ${modules.length} audio processor modules`);
    
    // Log active processing options
    if (modules.length > 0) {
      audioLoggers.processor.debug('Active processing options:', {
        resample: this.processingOptions.resample,
        targetSampleRate: this.processingOptions.targetSampleRate,
        timeStretch: this.processingOptions.timeStretch,
        pitchShift: this.processingOptions.pitchShift,
        formantPreservation: this.processingOptions.formantPreservation
      });
    }
  }
  
  /**
   * Checks if there is any audio data to save
   */
  hasAudioData(): boolean {
    return this.originalChunks.length > 0;
  }
} 