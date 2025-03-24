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
import { audioLoggers } from '../../utils/LoggerFactory';

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
  let moduleInitialized = false;
  let moduleInitPromise: Promise<boolean> | null = null;
  let initializationFailed = false;
  let tempContext: AudioContext | null = null;
  
  // Batch processing state
  let pendingChunks: Float32Array[] = [];
  let batchSampleRate: number = 0;
  let batchDurationMs: number = 250; // 250ms batch size
  let batchSampleCount: number = 0; // Will be calculated based on sample rate
  
  // Tracking metrics
  let initCount = 0;
  let batchCount = 0;
  let totalChunkCount = 0;
  let nodeCreationCount = 0;
  
  /**
   * Safely initializes the RubberBand module
   * @param sampleRate The sample rate of the audio
   * @returns A promise that resolves to a boolean indicating success
   */
  const initializeRubberBand = async (sampleRate: number): Promise<boolean> => {
    // If we're already initialized, return success
    if (moduleInitialized) return true;
    
    // If initialization failed previously, don't retry
    if (initializationFailed) return false;
    
    // If we're already initializing, wait for that promise
    if (moduleInitPromise) {
      return moduleInitPromise;
    }
    
    // Start initialization
    initCount++;
    audioLoggers.resampler.debug(`Initialization #${initCount}, sample rate: ${sampleRate}Hz`);
    
    // Calculate batch sample count based on sample rate and batch duration
    batchSampleRate = sampleRate;
    batchSampleCount = Math.ceil(sampleRate * (batchDurationMs / 1000));
    audioLoggers.resampler.debug(`Batch size: ${batchDurationMs}ms = ${batchSampleCount} samples at ${sampleRate}Hz`);
    
    // Create initialization promise
    moduleInitPromise = (async () => {
      try {
        // Load module
        await loadRubberBandModule();
        
        // Create temporary context for main initialization
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        tempContext = new AudioContextClass();
        
        // Mark as initialized
        moduleInitialized = true;
        audioLoggers.resampler.info('Module initialized successfully');
        return true;
      } catch (error) {
        audioLoggers.resampler.error('Failed to initialize module:', error);
        initializationFailed = true;
        return false;
      } finally {
        // Clear promise
        moduleInitPromise = null;
      }
    })();
    
    return moduleInitPromise;
  };
  
  // Add a function for basic resampling as a fallback
  const basicResample = (
    input: Float32Array, 
    inputSampleRate: number,
    outputSampleRate: number
  ): Float32Array => {
    // Return the input if rates are the same
    if (inputSampleRate === outputSampleRate) {
      return input;
    }
    
    // Calculate ratio between the sample rates
    const ratio = outputSampleRate / inputSampleRate;
    const outputLength = Math.ceil(input.length * ratio);
    const output = new Float32Array(outputLength);
    
    // Simple nearest-neighbor resampling
    for (let i = 0; i < outputLength; i++) {
      // Find the corresponding position in the input array
      const inputIndex = Math.min(Math.floor(i / ratio), input.length - 1);
      output[i] = input[inputIndex];
    }
    
    audioLoggers.resampler.debug(`Performed basic resampling: ${input.length} samples at ${inputSampleRate}Hz -> ${output.length} samples at ${outputSampleRate}Hz`);
    return output;
  };
  
  /**
   * Processes a batch of audio chunks
   * @param chunks An array of audio chunks to process
   * @param sampleRate The sample rate of the audio
   * @returns A promise that resolves to the processed audio data
   */
  const processBatch = async (
    chunks: Float32Array[], 
    sampleRate: number
  ): Promise<Float32Array> => {
    if (chunks.length === 0) {
      return new Float32Array(0);
    }
    
    try {
      // Calculate total length of all chunks
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      
      // Create a combined buffer with all chunks
      const combinedInput = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        combinedInput.set(chunk, offset);
        offset += chunk.length;
      }
      
      batchCount++;
      audioLoggers.resampler.debug(`Processing batch #${batchCount} (${chunks.length} chunks, ${totalLength} samples)`);
      
      // Check if we have silent input (all zeros)
      const hasSilentInput = isAllZeros(combinedInput);
      if (hasSilentInput) {
        audioLoggers.resampler.warn(`Batch #${batchCount} contains all zeros, processing empty audio instead of skipping`);
        // Create an appropriately sized silent buffer that matches the expected output size
        const targetRate = options.resample ? options.targetSampleRate! : sampleRate;
        const expectedOutputLength = Math.ceil(
          totalLength * 
          (options.timeStretch || 1.0) * 
          (options.resample ? (targetRate / sampleRate) : 1.0)
        );
        audioLoggers.resampler.debug(`Creating silent buffer of ${expectedOutputLength} samples for silent input`);
        return new Float32Array(expectedOutputLength);
      }
      
      // Create an offline context sized for this batch
      const targetRate = options.resample ? options.targetSampleRate! : sampleRate;
      // Calculate the correct output length accounting for both timeStretch and sample rate change
      const outputLength = Math.ceil(
        totalLength * 
        (options.timeStretch || 1.0) * 
        (options.resample ? (targetRate / sampleRate) : 1.0)
      );
      
      audioLoggers.resampler.debug(`Calculated output length: ${outputLength} samples (from ${totalLength} input samples, timeStretch=${options.timeStretch || 1.0}, sampleRate=${sampleRate}->${targetRate})`);
      
      const context = new OfflineAudioContext({
        numberOfChannels: fullConfig.numberOfChannels,
        length: outputLength,
        sampleRate: targetRate
      });
      
      // This is a critical step - we need to resample the audio to match the context's sample rate
      // Create a buffer with the combined input data at the INPUT sample rate
      const sourceBuffer = context.createBuffer(1, totalLength, sampleRate);
      const sourceData = sourceBuffer.getChannelData(0);
      sourceData.set(combinedInput);
      
      // Now create the audio source
      const source = context.createBufferSource();
      source.buffer = sourceBuffer;
      
      // Debug the buffer we're sending to RubberBand
      audioLoggers.resampler.debug(`Processing batch with input buffer: length=${sourceBuffer.length}, sampleRate=${sourceBuffer.sampleRate}, context.sampleRate=${context.sampleRate}`);
      
      // Create node options with explicit sample rates
      const nodeOptions = createRubberBandOptions(
        sourceBuffer.sampleRate, // Use the source buffer's sample rate, not the context's
        fullConfig,
        options
      );
      
      // Create a processor node for this batch
      nodeCreationCount++;
      const processorNode = await createRubberBandNode(
        context as BaseAudioContext,
        sampleRate,
        fullConfig.processorPath,
        nodeOptions
      );
      
      // Add debugger hooks
      processorNode.onprocessorerror = (err: Event) => {
        audioLoggers.resampler.error(`Processor error in batch #${batchCount}:`, err);
      };
      
      // Configure the node with the same settings
      configureRubberBandNode(processorNode, options);
      
      // Connect audio graph
      source.connect(processorNode);
      processorNode.connect(context.destination);
      
      // Process audio
      source.start();
      const renderedBuffer = await context.startRendering();
      
      // Extract processed data
      const processedBatch = renderedBuffer.getChannelData(0);
      
      // Check if output is silent
      const hasSilentOutput = isAllZeros(processedBatch);
      if (hasSilentOutput) {
        audioLoggers.resampler.warn(`Batch #${batchCount} produced silent output, using basic resampling as fallback`);
        // Use basic resampling as fallback
        const targetRate = options.resample ? options.targetSampleRate! : sampleRate;
        
        // Apply time stretching first if needed
        let stretchedInput = combinedInput;
        if (options.timeStretch && options.timeStretch !== 1.0) {
          // Simple time stretching by duplicating/removing samples
          const stretchFactor = options.timeStretch || 1.0;
          const stretchedLength = Math.ceil(totalLength * stretchFactor);
          const stretched = new Float32Array(stretchedLength);
          
          for (let i = 0; i < stretchedLength; i++) {
            const idx = Math.min(Math.floor(i / stretchFactor), totalLength - 1);
            stretched[i] = combinedInput[idx];
          }
          stretchedInput = stretched;
          audioLoggers.resampler.debug(`Applied simple time stretching: ${totalLength} -> ${stretchedLength} samples (factor: ${stretchFactor})`);
        }
        
        // Then apply resampling if needed
        if (options.resample && targetRate !== sampleRate) {
          const resampled = basicResample(stretchedInput, sampleRate, targetRate);
          return resampled;
        }
        
        // If no resampling needed but we applied time stretch
        if (stretchedInput !== combinedInput) {
          return stretchedInput;
        }
        
        // If no processing was applied, return original (this shouldn't happen)
        audioLoggers.resampler.warn(`No processing applied in fallback, returning original`);
        return combinedInput;
      }
      
      // Log success
      audioLoggers.resampler.info(`Batch #${batchCount} processed successfully: ${processedBatch.length} samples`);
      return processedBatch;
    } catch (error) {
      audioLoggers.resampler.error('[RubberBand] Error processing batch:', error);
      
      // Use basic resampling as fallback
      const totalInputLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const targetRate = options.resample ? options.targetSampleRate! : sampleRate;
      
      // Combine original chunks
      const combinedInput = new Float32Array(totalInputLength);
      let offset = 0;
      for (const chunk of chunks) {
        combinedInput.set(chunk, offset);
        offset += chunk.length;
      }
      
      audioLoggers.resampler.warn(`Using basic resampling fallback due to processing error`);
      
      // Apply time stretching first if needed
      let stretchedInput = combinedInput;
      if (options.timeStretch && options.timeStretch !== 1.0) {
        // Simple time stretching by duplicating/removing samples
        const stretchFactor = options.timeStretch || 1.0;
        const stretchedLength = Math.ceil(totalInputLength * stretchFactor);
        const stretched = new Float32Array(stretchedLength);
        
        for (let i = 0; i < stretchedLength; i++) {
          const idx = Math.min(Math.floor(i / stretchFactor), totalInputLength - 1);
          stretched[i] = combinedInput[idx];
        }
        stretchedInput = stretched;
        audioLoggers.resampler.debug(`Applied simple time stretching in error handler: ${totalInputLength} -> ${stretchedLength} samples (factor: ${stretchFactor})`);
      }
      
      // Then apply resampling if needed
      if (options.resample && targetRate !== sampleRate) {
        const resampled = basicResample(stretchedInput, sampleRate, targetRate);
        return resampled;
      }
      
      // If no resampling needed but we applied time stretch
      if (stretchedInput !== combinedInput) {
        return stretchedInput;
      }
      
      // If no processing was applied, return original
      return combinedInput;
    }
  };
  
  /**
   * Checks if an audio buffer is all zeros (silent)
   */
  const isAllZeros = (buffer: Float32Array): boolean => {
    if (!buffer || buffer.length === 0) return true;
    
    // Only check a limited number of samples for performance
    // but enough to be confident in the result
    const maxCheckSamples = 1000;
    const step = Math.max(1, Math.floor(buffer.length / maxCheckSamples));
    
    // Set a very low threshold to detect true silence
    const silenceThreshold = 0.00001;
    
    // Count of non-zero samples needed to consider non-silent
    // Set to a very low value to avoid false positives
    const nonZeroThreshold = 3;
    let nonZeroCount = 0;
    
    // Check samples at regular intervals
    for (let i = 0; i < buffer.length; i += step) {
      if (Math.abs(buffer[i]) > silenceThreshold) {
        nonZeroCount++;
        
        if (nonZeroCount >= nonZeroThreshold) {
          audioLoggers.resampler.info(`Buffer has audio: ${nonZeroCount} non-zero samples detected in ${Math.ceil(i/step)} samples checked`);
          return false;
        }
      }
    }
    
    // If we didn't find enough non-zero samples in the regular check,
    // do a more thorough random sampling
    for (let i = 0; i < 10000; i++) {
      const idx = Math.floor(Math.random() * buffer.length);
      if (Math.abs(buffer[idx]) > silenceThreshold) {
        nonZeroCount++;
        
        if (nonZeroCount >= nonZeroThreshold) {
          audioLoggers.resampler.info(`Buffer has audio after random sampling: ${nonZeroCount} non-zero samples found`);
          return false;
        }
      }
    }
    
    // If we got here, the buffer is most likely silent
    audioLoggers.resampler.info(`Buffer appears to be completely silent after checking ${maxCheckSamples} + 10000 random samples`);
    return true;
  };
  
  // Define the processor interface
  const processor: AudioProcessorModule = {
    name: 'rubberband',
    
    processChunk: async (chunk: Float32Array, sampleRate: number): Promise<Float32Array> => {
      // Initialize if needed - only once
      if (!moduleInitialized && !initializationFailed) {
        const success = await initializeRubberBand(sampleRate);
        if (!success) return chunk;
      }
      
      // Skip if initialization failed
      if (initializationFailed) return chunk;
      
      // Store original sample rate on first chunk
      if (totalChunkCount === 0 && batchSampleRate === 0) {
        batchSampleRate = sampleRate;
        batchSampleCount = Math.ceil(sampleRate * (batchDurationMs / 1000));
        audioLoggers.resampler.debug(`Initial sample rate: ${sampleRate}Hz, input chunk size: ${chunk.length} samples`);
      }
      
      // Check for silent input
      if (chunk.length === 0 || isAllZeros(chunk)) {
        return new Float32Array(0);
      }
      
      // Track total chunks seen
      totalChunkCount++;
      
      // If sample rate changed, recalculate batch size
      if (sampleRate !== batchSampleRate) {
        batchSampleRate = sampleRate;
        batchSampleCount = Math.ceil(sampleRate * (batchDurationMs / 1000));
        audioLoggers.resampler.debug(`Sample rate changed to ${sampleRate}Hz, batch size: ${batchSampleCount} samples`);
      }
      
      // Add the chunk to pending chunks
      pendingChunks.push(chunk);
      
      // Calculate current batch length
      const currentBatchLength = pendingChunks.reduce((acc, chunk) => acc + chunk.length, 0);
      
      // Only process when we have enough audio data (250ms worth)
      if (currentBatchLength >= batchSampleCount) {
        // Take a copy of the pending chunks
        const chunksToProcess = [...pendingChunks];
        // Clear pending chunks
        pendingChunks = [];
        
        // Process the batch
        const processedBatch = await processBatch(chunksToProcess, sampleRate);
        
        // Every 5 batches, log a status update
        if (batchCount % 5 === 0) {
          audioLoggers.resampler.info(`Status: ${totalChunkCount} chunks, ${batchCount} batches, ${nodeCreationCount} nodes created`);
        }
        
        // Return the processed batch
        return processedBatch;
      }
      
      // For small batches that don't meet the threshold, return an empty array
      // The chunks will be processed later when enough have accumulated or during finalize
      return new Float32Array(0);
    },
    
    finalize: async (chunks: Float32Array[], inputSampleRate: number): Promise<ProcessedAudio> => {
      try {
        // Process any remaining chunks that haven't been batched yet
        if (pendingChunks.length > 0) {
          audioLoggers.resampler.info(`Processing remaining ${pendingChunks.length} pending chunks in finalize`);
          const processedPending = await processBatch(pendingChunks, inputSampleRate);
          if (processedPending.length > 0) {
            chunks.push(processedPending);
          }
          pendingChunks = [];
        }
        
        // Skip if no data
        if (chunks.length === 0) {
          audioLoggers.resampler.warn('[RubberBand] No audio data to process');
          return {
            data: new Float32Array(0),
            sampleRate: inputSampleRate,
            processingFailed: true
          };
        }
        
        // Filter out empty chunks
        const nonEmptyChunks = chunks.filter(chunk => chunk.length > 0);
        
        // Combine all processed chunks
        audioLoggers.resampler.info(`Finalizing: Combining ${nonEmptyChunks.length} non-empty chunks`);
        const combinedData = combineAudioChunks(nonEmptyChunks);
        
        // Check if our final result is silent
        const isSilent = isAllZeros(combinedData);
        if (isSilent) {
          audioLoggers.resampler.error('[RubberBand] ERROR: Final audio output is completely silent!');
        }
        
        // Log processing statistics
        const finalSampleRate = options.resample ? options.targetSampleRate! : inputSampleRate;
        audioLoggers.resampler.info(`Processing complete: ${combinedData.length} samples at ${finalSampleRate}Hz (${isSilent ? 'SILENT' : 'with audio'})`);
        audioLoggers.resampler.info(`Performance metrics:
- Total chunks received: ${totalChunkCount}
- Batches processed: ${batchCount}
- AudioWorkletNodes created: ${nodeCreationCount}
- Initialization count: ${initCount}
- Input chunks/batch: ${(totalChunkCount / Math.max(1, batchCount)).toFixed(2)}
- Average batch size: ${(combinedData.length / Math.max(1, batchCount)).toFixed(2)} samples`);
        
        // Clean up resources
        await cleanup();
        
        return {
          data: combinedData,
          sampleRate: finalSampleRate,
          processingFailed: false
        };
      } catch (error) {
        audioLoggers.resampler.error('[RubberBand] Error in finalization:', error);
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
      // Clean up contexts
      if (tempContext && typeof tempContext.close === 'function') {
        await tempContext.close();
        tempContext = null;
      }
      
      // Clear references for garbage collection
      moduleInitialized = false;
      pendingChunks = [];
      
      audioLoggers.resampler.info('[RubberBand] Resources cleaned up');
    } catch (err) {
      audioLoggers.resampler.warn('[RubberBand] Failed to clean up resources:', err);
    }
  }
  
  return processor;
}; 
