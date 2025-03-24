import { ProcessedAudio } from './types';
import { audioLoggers } from '../../utils/LoggerFactory';
import { isDebugMode } from '../../utils/environment';

/**
 * Creates a WAV file from audio data
 * @param audioData The audio data as a Float32Array
 * @param sampleRate The sample rate of the audio
 * @returns A Blob containing the WAV file or null if not in debug mode
 */
export const createWAVFile = (audioData: Float32Array, sampleRate: number): Blob | null => {
  // Skip WAV file creation if not in debug mode
  if (!isDebugMode()) {
    audioLoggers.session.debug('WAV file creation skipped (not in debug mode)');
    return null;
  }

  const numChannels = 1;
  const bitsPerSample = 16; // Using 16-bit PCM for better compatibility
  const blockAlign = numChannels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;
  const dataSize = audioData.length * (bitsPerSample / 8);
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  
  // Write WAV header
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  // "RIFF" chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  
  // "fmt " sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // 1 = PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  
  // "data" sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);
  
  // Write audio data - convert Float32 to Int16
  const samples = new Int16Array(audioData.length);
  for (let i = 0; i < audioData.length; i++) {
    // Convert float to int16
    const s = Math.max(-1, Math.min(1, audioData[i]));
    samples[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  // Copy the samples to the buffer
  const sampleBytes = new Uint8Array(buffer, 44, dataSize);
  const sampleView = new DataView(sampleBytes.buffer, sampleBytes.byteOffset, sampleBytes.byteLength);
  
  for (let i = 0; i < samples.length; i++) {
    sampleView.setInt16(i * 2, samples[i], true);
  }
  
  return new Blob([buffer], { type: 'audio/wav' });
};

/**
 * Saves a WAV file from audio data
 * @param audioData The audio data as a Float32Array
 * @param sampleRate The sample rate of the audio
 * @param filename The filename to save as
 * @returns A promise that resolves when the file is saved or immediately if not in debug mode
 */
export const saveWAVFile = (
  audioData: Float32Array, 
  sampleRate: number, 
  filename: string
): Promise<void> => {
  // Skip WAV file saving if not in debug mode
  if (!isDebugMode()) {
    audioLoggers.session.debug('WAV file download skipped (not in debug mode)');
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    try {
      // Create WAV blob
      const wavBlob = createWAVFile(audioData, sampleRate);
      
      // If wavBlob is null (not in debug mode), resolve immediately
      if (!wavBlob) {
        resolve();
        return;
      }
      
      // Create download link
      const url = URL.createObjectURL(wavBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'block'; // Make it visible to ensure it triggers
      
      // Add link to body
      document.body.appendChild(link);
      
      // Click the link
      setTimeout(() => {
        try {
          link.click();
          audioLoggers.session.info('File download triggered for:', filename);
          
          // Clean up
          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            resolve();
          }, 1000);
        } catch (err) {
          audioLoggers.session.error('Error triggering download:', err);
          reject(err);
        }
      }, 100);
    } catch (error) {
      audioLoggers.session.error('Error saving WAV file:', error);
      reject(error);
    }
  });
};

/**
 * Combines audio chunks into a single Float32Array
 * @param chunks Array of audio chunks
 * @returns A single Float32Array containing all chunks
 */
export const combineAudioChunks = (chunks: Float32Array[]): Float32Array => {
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const combinedData = new Float32Array(totalLength);
  
  let offset = 0;
  for (const chunk of chunks) {
    combinedData.set(chunk, offset);
    offset += chunk.length;
  }
  
  return combinedData;
};

/**
 * Creates a result object similar to Rust's Result type
 * @param data The data if successful
 * @param error The error if failed
 * @returns An AudioProcessingResult object
 */
export function createResult<T>(data: T | null, error: Error | null = null): { 
  data: T | null; 
  error: Error | null; 
  isSuccess: boolean 
} {
  return {
    data,
    error,
    isSuccess: error === null
  };
}

/**
 * Creates a filename for an audio file based on processing options
 * @param moduleType The type of module that processed the audio
 * @param sampleRate The sample rate of the audio
 * @param options Additional options for the filename
 * @returns A filename string
 */
export const createFilename = (
  moduleType: string,
  sampleRate: number,
  options?: {
    timeStretch?: number;
    pitchShift?: number;
    formantPreservation?: boolean;
    isResampled?: boolean;
  }
): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  let filename = '';
  
  if (options?.isResampled) {
    filename = `resampled_${sampleRate}hz`;
  } else {
    filename = moduleType;
    
    if (options?.timeStretch && options.timeStretch !== 1.0) {
      filename += `_stretch${options.timeStretch.toFixed(2)}`;
    }
    
    if (options?.pitchShift && options.pitchShift !== 0.0) {
      filename += `_pitch${options.pitchShift.toFixed(1)}`;
    }
    
    if (options?.formantPreservation) {
      filename += '_formants';
    }
    
    filename += `_${sampleRate}hz`;
  }
  
  filename += `_${timestamp}.wav`;
  
  return filename;
};

/**
 * Predicate to determine if audio processing is needed
 * @param options Processing options
 * @returns Boolean indicating if processing is needed
 */
export const needsProcessing = (options: {
  resample?: boolean;
  targetSampleRate?: number;
  timeStretch?: number;
  pitchShift?: number;
}): boolean => {
  return (
    (options.resample && options.targetSampleRate !== undefined) || 
    (options.timeStretch !== undefined && options.timeStretch !== 1.0) || 
    (options.pitchShift !== undefined && options.pitchShift !== 0.0)
  );
}; 