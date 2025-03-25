import { AudioExportFormat, AudioExportOptions } from '../../../types/audio-export';
import { audioLoggers } from '../../../utils/LoggerFactory';

/**
 * AudioFileExporter
 * 
 * Handles exporting audio data to various file formats and triggering downloads.
 */
export class AudioFileExporter {
  /**
   * Export audio data to a file
   * 
   * @param audioData The audio data to export
   * @param sampleRate The sample rate of the audio data
   * @param options Export options
   * @returns A Promise that resolves with the exported blob URL
   */
  static async exportAudio(
    audioData: Float32Array,
    sampleRate: number,
    options: AudioExportOptions
  ): Promise<string> {
    audioLoggers.audioCapture.info('AudioFileExporter: Starting audio export', {
      sampleCount: audioData.length,
      sampleRate,
      format: options.format,
      normalize: options.normalize
    });
    
    let blob: Blob;
    
    // Export based on the format
    switch (options.format) {
      case AudioExportFormat.WAV:
        audioLoggers.audioCapture.debug('AudioFileExporter: Creating WAV blob');
        blob = AudioFileExporter.createWavBlob(audioData, sampleRate, options.normalize);
        break;
      case AudioExportFormat.MP3:
        audioLoggers.audioCapture.error('AudioFileExporter: MP3 export not implemented');
        throw new Error('MP3 export not implemented');
      default:
        audioLoggers.audioCapture.error(`AudioFileExporter: Unsupported export format: ${options.format}`);
        throw new Error(`Unsupported export format: ${options.format}`);
    }
    
    // Create a URL for the blob
    const url = URL.createObjectURL(blob);
    audioLoggers.audioCapture.debug('AudioFileExporter: Created blob URL', { url });
    
    // If autoDownload is enabled, trigger a download
    if (options.autoDownload) {
      const filename = options.filename || AudioFileExporter.generateFilename(options.format);
      audioLoggers.audioCapture.info('AudioFileExporter: Triggering download', { filename });
      await AudioFileExporter.triggerDownload(url, filename);
    }
    
    audioLoggers.audioCapture.info('AudioFileExporter: Export completed successfully');
    return url;
  }
  
  /**
   * Create a WAV blob from audio data
   * 
   * @param audioData The audio data to export
   * @param sampleRate The sample rate of the audio data
   * @param normalize Whether to normalize the audio
   * @returns A Blob containing the WAV file
   */
  private static createWavBlob(
    audioData: Float32Array,
    sampleRate: number,
    normalize = false
  ): Blob {
    // If normalize is enabled, normalize the audio to peak at ±1.0
    if (normalize) {
      audioLoggers.audioCapture.debug('AudioFileExporter: Normalizing audio data');
      audioData = AudioFileExporter.normalizeAudio(audioData);
    }
    
    // WAV format uses 16-bit PCM
    const numSamples = audioData.length;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = 1 * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = numSamples * bytesPerSample;
    
    audioLoggers.audioCapture.debug('AudioFileExporter: Creating WAV buffer', {
      numSamples,
      bitsPerSample,
      sampleRate,
      dataSize
    });
    
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    
    // RIFF identifier
    AudioFileExporter.writeString(view, 0, 'RIFF');
    // RIFF chunk length
    view.setUint32(4, 36 + dataSize, true);
    // RIFF type
    AudioFileExporter.writeString(view, 8, 'WAVE');
    // Format chunk identifier
    AudioFileExporter.writeString(view, 12, 'fmt ');
    // Format chunk length
    view.setUint32(16, 16, true);
    // Sample format (1 for PCM)
    view.setUint16(20, 1, true);
    // Number of channels
    view.setUint16(22, 1, true);
    // Sample rate
    view.setUint32(24, sampleRate, true);
    // Byte rate (sample rate * block align)
    view.setUint32(28, byteRate, true);
    // Block align (channels * bytes per sample)
    view.setUint16(32, blockAlign, true);
    // Bits per sample
    view.setUint16(34, bitsPerSample, true);
    // Data chunk identifier
    AudioFileExporter.writeString(view, 36, 'data');
    // Data chunk length
    view.setUint32(40, dataSize, true);
    
    // Write audio data
    const floatToInt16 = (sample: number) => sample < 0 ? Math.max(-1, sample) * 0x8000 : Math.min(1, sample) * 0x7FFF;
    
    // Convert the float samples to 16-bit integers
    // We must take special care with endianness
    for (let i = 0; i < numSamples; i++) {
      const sample = floatToInt16(audioData[i]);
      view.setInt16(44 + i * bytesPerSample, sample, true);
    }
    
    audioLoggers.audioCapture.debug('AudioFileExporter: WAV buffer created successfully');
    
    // Create a blob from the buffer
    return new Blob([buffer], { type: 'audio/wav' });
  }
  
  /**
   * Normalize audio to peak at ±1.0
   * 
   * @param audioData The audio data to normalize
   * @returns The normalized audio data
   */
  private static normalizeAudio(audioData: Float32Array): Float32Array {
    // Find the maximum absolute value
    let maxAbs = 0;
    for (let i = 0; i < audioData.length; i++) {
      maxAbs = Math.max(maxAbs, Math.abs(audioData[i]));
    }
    
    // If the audio is already normalized or silent, return as is
    if (maxAbs <= 0 || maxAbs >= 1) {
      audioLoggers.audioCapture.debug(`AudioFileExporter: Audio ${maxAbs <= 0 ? 'is silent' : 'already normalized'}, skipping normalization`);
      return audioData;
    }
    
    // Normalize
    const normalized = new Float32Array(audioData.length);
    const normFactor = 1 / maxAbs;
    
    audioLoggers.audioCapture.debug(`AudioFileExporter: Normalizing audio with factor ${normFactor.toFixed(4)}, max amplitude was ${maxAbs.toFixed(4)}`);
    
    for (let i = 0; i < audioData.length; i++) {
      normalized[i] = audioData[i] * normFactor;
    }
    
    return normalized;
  }
  
  /**
   * Write a string to a DataView
   * 
   * @param view The DataView to write to
   * @param offset The offset to write at
   * @param string The string to write
   */
  private static writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
  
  /**
   * Trigger a download of a blob URL
   * 
   * @param url The blob URL to download
   * @param filename The filename to use for the download
   * @returns A Promise that resolves when the download is triggered
   */
  private static async triggerDownload(url: string, filename: string): Promise<void> {
    audioLoggers.audioCapture.debug(`AudioFileExporter: Triggering download for ${filename}`);
    
    // Create a link element
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    // Add the link to the document
    document.body.appendChild(link);
    
    // Click the link to trigger the download
    link.click();
    
    // Remove the link from the document
    document.body.removeChild(link);
    
    // Give the browser some time to start the download
    await new Promise(resolve => setTimeout(resolve, 100));
    
    audioLoggers.audioCapture.debug('AudioFileExporter: Download triggered');
  }
  
  /**
   * Generate a filename based on current date/time
   * 
   * @param format The audio format
   * @returns A generated filename
   */
  private static generateFilename(format: AudioExportFormat): string {
    const date = new Date();
    const timestamp = date.toISOString()
      .replace(/[-:]/g, '')
      .replace(/\..+/, '')
      .replace('T', '_');
    
    const filename = `audio_capture_${timestamp}.${format.toLowerCase()}`;
    audioLoggers.audioCapture.debug(`AudioFileExporter: Generated filename: ${filename}`);
    return filename;
  }
} 