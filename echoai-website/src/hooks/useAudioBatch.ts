import { useState, useCallback } from 'react';
import { AudioBatchManager } from '../components/audio/batch/AudioBatchManager';
import { 
  BatchStrategy, 
  AudioBatchOptions, 
  AudioBatchEventType 
} from '../types/audio-batch';
import { audioLoggers } from '../utils/LoggerFactory';

/**
 * Hook result for useAudioBatch
 */
interface AudioBatchHookResult {
  /**
   * Batch audio data into separate chunks
   * 
   * @param data Audio data to batch
   * @param sampleRate Sample rate of the audio data
   * @param options Batch options (override default options)
   * @returns Array of audio data batches
   */
  batchAudio: (
    data: Float32Array, 
    sampleRate: number, 
    options?: Partial<AudioBatchOptions>
  ) => Promise<Float32Array[]>;
  
  /**
   * Whether batching is in progress
   */
  isBatching: boolean;
  
  /**
   * Batching progress (0-1)
   */
  progress: number;
  
  /**
   * Number of batches created
   */
  batchCount: number;
  
  /**
   * Error during batching
   */
  error: Error | null;
  
  /**
   * Clear error
   */
  clearError: () => void;
}

/**
 * Hook for audio batching
 * 
 * @param defaultOptions Default batch options
 * @returns Audio batch hook result
 */
export function useAudioBatch(
  defaultOptions?: Partial<AudioBatchOptions>
): AudioBatchHookResult {
  const [isBatching, setIsBatching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [batchCount, setBatchCount] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  
  const batchAudio = useCallback(async (
    data: Float32Array,
    sampleRate: number,
    options?: Partial<AudioBatchOptions>
  ): Promise<Float32Array[]> => {
    // Combine default options with provided options
    const mergedOptions: AudioBatchOptions = {
      strategy: (options?.strategy || defaultOptions?.strategy || BatchStrategy.FIXED_SIZE),
      batchSize: options?.batchSize ?? defaultOptions?.batchSize,
      batchDuration: options?.batchDuration ?? defaultOptions?.batchDuration,
      processIncomplete: options?.processIncomplete ?? defaultOptions?.processIncomplete ?? true,
      overlap: options?.overlap ?? defaultOptions?.overlap ?? 0
    };
    
    audioLoggers.audioCapture.debug('useAudioBatch: Starting audio batching', {
      dataLength: data.length,
      sampleRate,
      options: mergedOptions
    });
    
    setIsBatching(true);
    setProgress(0);
    setBatchCount(0);
    setError(null);
    
    // Create batch manager
    const batchManager = new AudioBatchManager(mergedOptions);
    
    // Set up event listeners
    batchManager.addEventListener(AudioBatchEventType.BATCH_PROGRESS, (event) => {
      setProgress(event.progress || 0);
      if (event.currentBatch) {
        setBatchCount(event.currentBatch);
      }
    });
    
    batchManager.addEventListener(AudioBatchEventType.BATCH_ERROR, (event) => {
      setError(event.error instanceof Error ? event.error : new Error('Batching failed'));
    });
    
    try {
      // Process the audio
      const batches = batchManager.process(data, sampleRate);
      
      audioLoggers.audioCapture.info('useAudioBatch: Audio batching complete', {
        batchCount: batches.length
      });
      
      return batches;
    } catch (e) {
      const batchError = e instanceof Error ? e : new Error('Unknown error during batching');
      setError(batchError);
      throw batchError;
    } finally {
      setIsBatching(false);
    }
  }, [defaultOptions]);
  
  return {
    batchAudio,
    isBatching,
    progress,
    batchCount,
    error,
    clearError: () => setError(null)
  };
} 