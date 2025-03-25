import { audioLoggers } from '../../../utils/LoggerFactory';
import { AudioExportFormat, AudioExportOptions, AudioExportEventType } from '../../../types/audio-export';
import { AudioFileExporter } from './AudioFileExporter';

/**
 * Manages audio save operations
 */
export class AudioSaveManager {
  // Event listeners
  private static eventListeners: Map<AudioExportEventType, ((event: any) => void)[]> = new Map();
  
  /**
   * Save audio data to file
   * 
   * @param audioData Audio data to save
   * @param sampleRate Sample rate of the audio
   * @param options Export options
   * @returns Promise resolving to the URL of the saved file
   */
  static async saveAudio(
    audioData: Float32Array,
    sampleRate: number,
    options: Partial<AudioExportOptions> = {}
  ): Promise<string> {
    const fullOptions: AudioExportOptions = {
      format: options.format || AudioExportFormat.WAV,
      autoDownload: options.autoDownload !== false,
      filename: options.filename,
      normalize: options.normalize || false
    };
    
    audioLoggers.audioCapture.info('AudioSaveManager: Saving audio', {
      dataLength: audioData.length,
      sampleRate,
      options: fullOptions
    });
    
    // Emit start event
    AudioSaveManager._emitEvent(AudioExportEventType.EXPORT_START, {
      format: fullOptions.format,
      sampleCount: audioData.length,
      sampleRate
    });
    
    let url: string;
    try {
      url = await AudioFileExporter.exportAudio(audioData, sampleRate, fullOptions);
      
      // Emit completion event
      AudioSaveManager._emitEvent(AudioExportEventType.EXPORT_COMPLETE, {
        url,
        format: fullOptions.format,
        filename: fullOptions.filename
      });
      
      audioLoggers.audioCapture.info('AudioSaveManager: Audio saved successfully', { url });
      return url;
    } catch (error) {
      audioLoggers.audioCapture.error('AudioSaveManager: Error saving audio', error);
      
      // Emit error event
      AudioSaveManager._emitEvent(AudioExportEventType.EXPORT_ERROR, { error });
      
      throw error;
    }
  }
  
  /**
   * Add an event listener
   * 
   * @param eventType Event type to listen for
   * @param listener Listener callback
   */
  static addEventListener(eventType: AudioExportEventType, listener: (event: any) => void): void {
    if (!AudioSaveManager.eventListeners.has(eventType)) {
      AudioSaveManager.eventListeners.set(eventType, []);
    }
    
    AudioSaveManager.eventListeners.get(eventType)!.push(listener);
    audioLoggers.audioCapture.debug(`AudioSaveManager: Added event listener for ${eventType}`);
  }
  
  /**
   * Remove an event listener
   * 
   * @param eventType Event type to remove listener from
   * @param listener Listener to remove
   */
  static removeEventListener(eventType: AudioExportEventType, listener: (event: any) => void): void {
    if (!AudioSaveManager.eventListeners.has(eventType)) {
      return;
    }
    
    const listeners = AudioSaveManager.eventListeners.get(eventType)!;
    const index = listeners.indexOf(listener);
    
    if (index !== -1) {
      listeners.splice(index, 1);
      audioLoggers.audioCapture.debug(`AudioSaveManager: Removed event listener for ${eventType}`);
    }
  }
  
  /**
   * Emit an event to all registered listeners
   * 
   * @param eventType Event type to emit
   * @param data Event data
   * @private
   */
  private static _emitEvent(eventType: AudioExportEventType, data: any): void {
    if (!AudioSaveManager.eventListeners.has(eventType)) {
      return;
    }
    
    const event = {
      type: eventType,
      timestamp: Date.now(),
      ...data
    };
    
    audioLoggers.audioCapture.debug(`AudioSaveManager: Emitting event ${eventType}`, event);
    
    for (const listener of AudioSaveManager.eventListeners.get(eventType)!) {
      try {
        listener(event);
      } catch (error) {
        audioLoggers.audioCapture.error('AudioSaveManager: Error in event listener', error);
      }
    }
  }
} 