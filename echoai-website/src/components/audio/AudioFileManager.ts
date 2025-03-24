import { ProcessingOptions, ProcessedAudio } from './types';
import { createFilename, saveWAVFile, combineAudioChunks } from './utils';
import { audioLoggers } from '../../utils/LoggerFactory';

/**
 * Manages audio file operations such as saving WAV files
 */
export class AudioFileManager {
  /**
   * Saves all audio files (raw and processed)
   * @param originalChunks The original audio chunks
   * @param processedData Map of processor name to processed chunks
   * @param originalSampleRate The original sample rate
   * @param processingOptions The processing options
   * @param processors List of processor names
   * @returns A promise that resolves when all files are saved
   */
  static async saveAllAudioFiles(
    originalChunks: Float32Array[],
    processedData: Map<string, Float32Array[]>,
    originalSampleRate: number,
    processingOptions: ProcessingOptions,
    processors: string[]
  ): Promise<void> {
    if (originalChunks.length === 0) {
      audioLoggers.session.info('No audio data to save');
      return;
    }
    
    try {
      audioLoggers.session.info('Preparing to save audio files...');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      // Save original raw audio file
      const originalAudio = this.combineAudioData(originalChunks, null, originalSampleRate);
      audioLoggers.session.info(`Saving raw audio: ${originalAudio.data.length} samples at ${originalAudio.sampleRate}Hz`);
      await saveWAVFile(
        originalAudio.data, 
        originalAudio.sampleRate, 
        `raw_${originalAudio.sampleRate}hz_${timestamp}.wav`
      );
      
      // Check if we have any processors
      if (processors.length === 0) {
        audioLoggers.session.info('No processing modules active, only raw audio saved');
        return;
      }
      
      // Process and save files
      const savePromises: Promise<void>[] = [];
      
      // Flag to track if we've saved a resampled file
      let resampledFileSaved = false;
      
      // Save output from each processor
      for (const processorName of processors) {
        try {
          const processorChunks = processedData.get(processorName) || [];
          const processedAudio = this.combineAudioData(
            processorChunks, 
            processorName, 
            originalSampleRate, 
            processingOptions
          );
          
          // Skip saving if processing failed or resulted in empty data
          if (processedAudio.processingFailed || processedAudio.data.length === 0) {
            audioLoggers.processor.info(`Skipping save for ${processorName} due to processing failure or empty result`);
            continue;
          }
          
          // Generate filename based on processing options
          const isResampled = 
            processorName === 'rubberband' && 
            processingOptions.resample && 
            processingOptions.targetSampleRate !== originalSampleRate;
          
          const filename = createFilename(
            processorName,
            processedAudio.sampleRate,
            {
              timeStretch: processingOptions.timeStretch,
              pitchShift: processingOptions.pitchShift,
              formantPreservation: processingOptions.formantPreservation,
              isResampled
            }
          );
          
          audioLoggers.session.info(`Saving processed audio: ${filename} with ${processedAudio.data.length} samples`);
          
          // Save this processed version
          savePromises.push(
            saveWAVFile(
              processedAudio.data,
              processedAudio.sampleRate,
              filename
            )
          );
          
          if (isResampled) {
            resampledFileSaved = true;
          }
        } catch (error) {
          audioLoggers.processor.error(`Error saving processed audio for ${processorName}:`, error);
        }
      }
      
      // Wait for all files to be saved
      await Promise.all(savePromises);
      
      const filesSaved = 1 + savePromises.length; // 1 raw + processed files
      audioLoggers.session.info(`${filesSaved} audio files saved: raw and processed versions.`);
    } catch (error) {
      audioLoggers.session.error('Error saving audio files:', error);
    }
  }
  
  /**
   * Combines audio chunks for a specific processor
   * @param chunks The audio chunks
   * @param processorName The processor name (null for original chunks)
   * @param originalSampleRate The original sample rate
   * @param processingOptions The processing options
   * @returns The combined audio data
   */
  private static combineAudioData(
    chunks: Float32Array[],
    processorName: string | null,
    originalSampleRate: number,
    processingOptions?: ProcessingOptions
  ): ProcessedAudio {
    const sampleRate = processorName && processingOptions?.resample 
      ? processingOptions.targetSampleRate! 
      : originalSampleRate;
    
    // Combine chunks
    const combinedData = combineAudioChunks(chunks);
    
    return { 
      data: combinedData, 
      sampleRate 
    };
  }
} 