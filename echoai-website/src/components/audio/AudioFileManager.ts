// import { ProcessingOptions, ProcessedAudio } from './types';
// import { createFilename, saveWAVFile, combineAudioChunks } from './utils';
// import { audioLoggers } from '../../utils/LoggerFactory';
// import { isDebugMode } from '../../utils/environment';

// /**
//  * Manages audio file operations such as saving WAV files
//  */
// export class AudioFileManager {
//   /**
//    * Saves all audio files (raw and processed)
//    * @param originalChunks The original audio chunks
//    * @param processedData Map of processor name to processed chunks
//    * @param originalSampleRate The original sample rate
//    * @param processingOptions The processing options
//    * @param processors List of processor names
//    * @returns A promise that resolves when all files are saved
//    */
//   static async saveAllAudioFiles(
//     originalChunks: Float32Array[],
//     processedData: Map<string, Float32Array[]>,
//     originalSampleRate: number,
//     processingOptions: ProcessingOptions,
//     processors: string[]
//   ): Promise<void> {
//     audioLoggers.session.debug('AudioFileManager.saveAllAudioFiles called', {
//       originalChunksLength: originalChunks.length,
//       processorsCount: processors.length,
//       isDebugMode: isDebugMode()
//     });
    
//     // Skip file saving if not in debug mode
//     if (!isDebugMode()) {
//       audioLoggers.session.debug('Audio file saving skipped (not in debug mode)');
//       return;
//     }
    
//     // For debugging, if no chunks, add a small silent chunk
//     if (originalChunks.length === 0) {
//       audioLoggers.session.info('No audio data to save, creating test audio');
//       // Create a small debug chunk - 0.5 second of silence
//       const sampleRate = originalSampleRate || 44100;
//       const debugChunk = new Float32Array(Math.floor(sampleRate * 0.5));
//       originalChunks.push(debugChunk);
      
//       // Add to processors too
//       for (const processorName of processors) {
//         const chunks = processedData.get(processorName) || [];
//         if (chunks.length === 0) {
//           chunks.push(debugChunk);
//           processedData.set(processorName, chunks);
//         }
//       }
//     }
    
//     audioLoggers.session.debug('Preparing to save audio files');
    
//     try {
//       // Create date-based filename
//       const date = new Date();
//       const timestamp = date.toISOString().replace(/[:.]/g, '-');
      
//       // Save original audio
//       try {
//         audioLoggers.session.debug('Saving original audio');
//         const originalAudio = combineAudioChunks(originalChunks);
//         const originalFilename = createFilename('original', timestamp, processingOptions);
//         await saveWAVFile(originalAudio, originalSampleRate, originalFilename);
//         audioLoggers.session.debug('Original audio saved successfully');
//       } catch (error) {
//         audioLoggers.session.error('Error saving original audio:', error);
//       }
      
//       // Save processed audio for each processor
//       for (const processorName of processors) {
//         try {
//           const chunks = processedData.get(processorName);
          
//           if (chunks && chunks.length > 0) {
//             audioLoggers.session.debug(`Saving ${processorName} audio`);
//             const processedAudio = combineAudioChunks(chunks);
//             const processedFilename = createFilename(processorName, timestamp, processingOptions);
//             await saveWAVFile(
//               processedAudio, 
//               processingOptions.resample ? processingOptions.targetSampleRate! : originalSampleRate,
//               processedFilename
//             );
//             audioLoggers.session.debug(`${processorName} audio saved successfully`);
//           } else {
//             audioLoggers.session.debug(`No ${processorName} chunks to save`);
//           }
//         } catch (error) {
//           audioLoggers.session.error(`Error saving ${processorName} audio:`, error);
//         }
//       }
      
//       audioLoggers.session.debug('All audio files saved successfully');
//     } catch (error) {
//       audioLoggers.session.error('Error saving audio files:', error);
//     }
//   }
  
//   /**
//    * Combines audio chunks for a specific processor
//    * @param chunks The audio chunks
//    * @param processorName The processor name (null for original chunks)
//    * @param originalSampleRate The original sample rate
//    * @param processingOptions The processing options
//    * @returns The combined audio data
//    */
//   private static combineAudioData(
//     chunks: Float32Array[],
//     processorName: string | null,
//     originalSampleRate: number,
//     processingOptions?: ProcessingOptions
//   ): ProcessedAudio {
//     const sampleRate = processorName && processingOptions?.resample 
//       ? processingOptions.targetSampleRate! 
//       : originalSampleRate;
    
//     // Combine chunks
//     const combinedData = combineAudioChunks(chunks);
    
//     return { 
//       data: combinedData, 
//       sampleRate 
//     };
//   }
// } 