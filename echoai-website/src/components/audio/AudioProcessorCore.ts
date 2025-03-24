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
  private originalChunks: Float32Array[] = [];
  
  // Processed data storage
  private processedData: Map<string, Float32Array[]> = new Map();
  
  // Active processor modules
  private processorModules: AudioProcessorModule[] = [];
  
  // Original sample rate
  private originalSampleRate: number = 0;
  
  /**
   * Creates a new AudioProcessorCore
   * @param processingOptions The processing options
   */
  constructor(private processingOptions: ProcessingOptions) {
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
    // Store original chunk
    this.originalChunks.push(audioChunk);
    
    // Process through each module
    for (const module of this.processorModules) {
      try {
        // Get the storage array for this processor
        const processedChunks = this.processedData.get(module.name) || [];
        
        // Process the chunk
        const processedChunk = await module.processChunk(
          audioChunk,
          this.originalSampleRate
        );
        
        // Store the processed chunk
        processedChunks.push(processedChunk);
        this.processedData.set(module.name, processedChunks);
      } catch (error) {
        audioLoggers.processor.error(`Error in processor module ${module.name}:`, error);
      }
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
    if (this.originalChunks.length === 0) {
      audioLoggers.processor.info('No audio data to save');
      return;
    }
    
    // Get processor names
    const processorNames = this.processorModules.map(module => module.name);
    
    // Process and finalize audio with each processor
    for (const module of this.processorModules) {
      try {
        // Check if module has finalize method
        if (module.finalize) {
          const chunks = this.processedData.get(module.name) || [];
          const processedAudio = await module.finalize(chunks, this.originalSampleRate);
          
          // Replace chunks with finalized data
          const finalizedChunks = [processedAudio.data];
          this.processedData.set(module.name, finalizedChunks);
        }
      } catch (error) {
        audioLoggers.processor.error(`Error finalizing processor ${module.name}:`, error);
      }
    }
    
    // Save all audio files
    await AudioFileManager.saveAllAudioFiles(
      this.originalChunks,
      this.processedData,
      this.originalSampleRate,
      this.processingOptions,
      processorNames
    );
    
    // Clear data after saving
    this.clearData();
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