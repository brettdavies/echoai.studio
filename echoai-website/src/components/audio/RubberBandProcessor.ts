import { AudioProcessorModule, ProcessedAudio, ProcessingOptions } from './types';
import { combineAudioChunks } from './utils';
import { 
  createRubberBandNode, 
  loadRubberBandModule, 
  getRubberBandModule 
} from './RubberBandLoader';
import { 
  RubberBandConfig, 
  DEFAULT_RUBBERBAND_CONFIG,
  createRubberBandOptions,
  configureRubberBandNode
} from './RubberBandConfig';

/**
 * Creates a RubberBand processor module
 * @param options Processing options for the module
 * @param config Configuration for the RubberBand processor
 * @returns An AudioProcessorModule
 */
export const createRubberBandModule = (
  options: ProcessingOptions, 
  config: Partial<RubberBandConfig> = {}
): AudioProcessorModule => {
  // Merge default config with provided config
  const fullConfig = { ...DEFAULT_RUBBERBAND_CONFIG, ...config };
  
  // Module-level state
  let rubberBand: any = null;
  let isInitialized = false;
  let initializationFailed = false;
  let tempContext: AudioContext | null = null;
  
  /**
   * Safely initializes the RubberBand module
   * @param sampleRate The sample rate of the audio
   * @returns A promise that resolves to a boolean indicating success
   */
  const initializeRubberBand = async (sampleRate: number): Promise<boolean> => {
    if (isInitialized) return true;
    if (initializationFailed) return false;
    
    try {
      console.log('Initializing RubberBand processor (first time only)...');
      
      // Load module
      await loadRubberBandModule();
      
      // Create temporary context for processing
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      tempContext = new AudioContextClass();
      
      // Create node options
      const nodeOptions = createRubberBandOptions(
        sampleRate,
        fullConfig,
        options
      );
      
      // Create RubberBand node
      const node = await createRubberBandNode(
        tempContext,
        sampleRate,
        fullConfig.processorPath,
        nodeOptions
      );
      
      // Add error handler
      node.onprocessorerror = (event: Event) => {
        console.error('AudioWorklet processor error:', event);
        initializationFailed = true;
      };
      
      // Configure the node
      configureRubberBandNode(node, options);
      
      // Store reference
      rubberBand = node;
      isInitialized = true;
      
      console.log('RubberBand initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize RubberBand:', error);
      initializationFailed = true;
      return false;
    }
  };
  
  /**
   * Creates a processor interface to process audio chunks
   */
  return {
    name: 'rubberband',
    
    processChunk: async (chunk: Float32Array, sampleRate: number): Promise<Float32Array> => {
      // Initialize if needed
      if (!isInitialized && !initializationFailed) {
        const success = await initializeRubberBand(sampleRate);
        if (!success) return chunk;
      }
      
      // Skip if initialization failed
      if (initializationFailed) return chunk;
      
      try {
        // Create an offline context for processing this chunk
        const offlineCtx = new OfflineAudioContext({
          numberOfChannels: fullConfig.numberOfChannels,
          length: chunk.length * (options.timeStretch || 1.0), // Estimate output length
          sampleRate: options.resample ? options.targetSampleRate! : sampleRate
        });
        
        // Create a buffer with the input data
        const inputBuffer = offlineCtx.createBuffer(1, chunk.length, sampleRate);
        const channelData = inputBuffer.getChannelData(0);
        channelData.set(chunk);
        
        // Create a source node
        const source = offlineCtx.createBufferSource();
        source.buffer = inputBuffer;
        
        // Create node options
        const nodeOptions = createRubberBandOptions(
          sampleRate,
          fullConfig,
          options
        );
        
        // Create a separate RubberBand node for this chunk
        const chunkNode = await createRubberBandNode(
          offlineCtx as unknown as BaseAudioContext, // Type cast to fix TS error
          sampleRate,
          fullConfig.processorPath,
          nodeOptions
        );
        
        // Configure the node
        configureRubberBandNode(chunkNode, options);
        
        // Connect audio graph
        source.connect(chunkNode);
        chunkNode.connect(offlineCtx.destination);
        
        // Process audio
        source.start();
        const renderedBuffer = await offlineCtx.startRendering();
        
        // Extract processed data
        const processedChunk = renderedBuffer.getChannelData(0);
        
        // Log occasionally
        if (Math.random() < 0.1) {
          console.log(`Processed chunk: ${chunk.length} → ${processedChunk.length} samples`);
        }
        
        return processedChunk;
      } catch (error) {
        console.error('Error processing chunk:', error);
        return chunk; // Return original on error
      }
    },
    
    finalize: async (chunks: Float32Array[], inputSampleRate: number): Promise<ProcessedAudio> => {
      try {
        // Skip if no data
        if (chunks.length === 0) {
          console.warn('No audio data to process');
          return {
            data: new Float32Array(0),
            sampleRate: inputSampleRate,
            processingFailed: true
          };
        }
        
        // Combine all processed chunks
        console.log(`Combining ${chunks.length} processed chunks`);
        const combinedData = combineAudioChunks(chunks);
        
        console.log(`RubberBand processing complete: ${combinedData.length} samples at ${options.resample ? options.targetSampleRate : inputSampleRate}Hz`);
        
        // Clean up resources
        await cleanup();
        
        return {
          data: combinedData,
          sampleRate: options.resample ? options.targetSampleRate! : inputSampleRate,
          processingFailed: false
        };
      } catch (error) {
        console.error('Error in RubberBand finalization:', error);
        await cleanup();
        
        return {
          data: new Float32Array(0),
          sampleRate: inputSampleRate,
          processingFailed: true
        };
      }
    }
  };
  
  /**
   * Cleans up resources
   */
  async function cleanup(): Promise<void> {
    try {
      if (tempContext && typeof tempContext.close === 'function') {
        await tempContext.close();
        tempContext = null;
      }
      
      // Clear references for garbage collection
      rubberBand = null;
      isInitialized = false;
    } catch (err) {
      console.warn('Failed to clean up RubberBand resources:', err);
    }
  }
}; 