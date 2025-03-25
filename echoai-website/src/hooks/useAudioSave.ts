import { useState, useEffect, useCallback } from 'react';
import { AudioSaveManager } from '../components/audio/save/AudioSaveManager';
import { AudioExportEventType, AudioExportFormat, AudioExportOptions } from '../types/audio-export';
import { audioLoggers } from '../utils/LoggerFactory';

/**
 * Hook for managing audio save operations
 * 
 * @param defaultOptions Default export options
 * @returns Methods and state for audio saving
 */
export const useAudioSave = (defaultOptions?: Partial<AudioExportOptions>) => {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastSavedUrl, setLastSavedUrl] = useState<string | null>(null);
  
  // Save audio data
  const saveAudio = useCallback(async (
    audioData: Float32Array,
    sampleRate: number,
    options?: Partial<AudioExportOptions>
  ) => {
    const mergedOptions = {
      ...defaultOptions,
      ...options
    };
    
    audioLoggers.audioCapture.debug('useAudioSave: Saving audio', {
      dataLength: audioData.length,
      sampleRate,
      options: mergedOptions
    });
    
    setIsSaving(true);
    setError(null);
    
    try {
      const url = await AudioSaveManager.saveAudio(audioData, sampleRate, mergedOptions);
      setLastSavedUrl(url);
      return url;
    } catch (e) {
      const saveError = e instanceof Error ? e : new Error('Unknown error while saving audio');
      setError(saveError);
      throw saveError;
    } finally {
      setIsSaving(false);
    }
  }, [defaultOptions]);
  
  // Handle save events
  useEffect(() => {
    const handleExportStart = () => {
      setIsSaving(true);
      setError(null);
    };
    
    const handleExportComplete = (event: any) => {
      setIsSaving(false);
      setLastSavedUrl(event.url);
    };
    
    const handleExportError = (event: any) => {
      setIsSaving(false);
      setError(event.error instanceof Error ? event.error : new Error(event.error?.toString() || 'Unknown error'));
    };
    
    // Register event listeners
    AudioSaveManager.addEventListener(AudioExportEventType.EXPORT_START, handleExportStart);
    AudioSaveManager.addEventListener(AudioExportEventType.EXPORT_COMPLETE, handleExportComplete);
    AudioSaveManager.addEventListener(AudioExportEventType.EXPORT_ERROR, handleExportError);
    
    // Clean up event listeners on unmount
    return () => {
      AudioSaveManager.removeEventListener(AudioExportEventType.EXPORT_START, handleExportStart);
      AudioSaveManager.removeEventListener(AudioExportEventType.EXPORT_COMPLETE, handleExportComplete);
      AudioSaveManager.removeEventListener(AudioExportEventType.EXPORT_ERROR, handleExportError);
    };
  }, []);
  
  return {
    saveAudio,
    isSaving,
    error,
    lastSavedUrl,
    clearError: () => setError(null),
    clearLastSavedUrl: () => setLastSavedUrl(null)
  };
}; 