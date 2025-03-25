import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  AudioCaptureEventType, 
  AudioCaptureState, 
  AudioExportFormat,
  AudioExportOptions,
  AudioProcessingOptions
} from '../../../types/audio-capture';
import { AudioCaptureManager } from './AudioCaptureManager';
import { audioLoggers } from '../../../utils/LoggerFactory';

/**
 * The result of using the useAudioCapture hook
 */
interface AudioCaptureHookResult {
  /**
   * The current state of the audio capture
   */
  state: AudioCaptureState;
  
  /**
   * Start capturing audio
   */
  startCapture: () => void;
  
  /**
   * Pause capturing audio
   */
  pauseCapture: () => void;
  
  /**
   * Resume capturing audio
   */
  resumeCapture: () => void;
  
  /**
   * Stop capturing audio
   */
  stopCapture: () => void;
  
  /**
   * Export the captured audio
   * 
   * @param options Export options
   */
  exportAudio: (options?: Partial<AudioExportOptions>) => Promise<string>;
  
  /**
   * Total duration of captured audio in seconds
   */
  duration: number;
  
  /**
   * Whether audio is currently being captured
   */
  isCapturing: boolean;
  
  /**
   * Whether audio capture is paused
   */
  isPaused: boolean;
  
  /**
   * Whether audio is being exported
   */
  isExporting: boolean;
  
  /**
   * Whether an error has occurred
   */
  hasError: boolean;
  
  /**
   * Error message if an error occurred
   */
  error: string | null;
}

/**
 * Options for the useAudioCapture hook
 */
interface UseAudioCaptureOptions {
  /**
   * The audio node to capture from
   */
  sourceNode?: AudioNode | null;
  
  /**
   * Optional destination node
   */
  destinationNode?: AudioNode | null;
  
  /**
   * Audio context to use, will create one if not provided
   */
  audioContext?: AudioContext | null;
  
  /**
   * Audio processing options
   */
  processingOptions?: Partial<AudioProcessingOptions>;
  
  /**
   * Whether to auto-export when stopping
   */
  autoExportOnStop?: boolean;
  
  /**
   * Auto-export options
   */
  autoExportOptions?: Partial<AudioExportOptions>;
}

/**
 * Hook for capturing audio from an AudioNode
 * 
 * @param options Options for the hook
 * @returns Audio capture state and controls
 */
export function useAudioCapture(options: UseAudioCaptureOptions = {}): AudioCaptureHookResult {
  // Manager ref to avoid recreating on each render
  const managerRef = useRef<AudioCaptureManager | null>(null);
  
  // State for UI updates
  const [state, setState] = useState<AudioCaptureState>(AudioCaptureState.INACTIVE);
  const [duration, setDuration] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize manager on mount
  useEffect(() => {
    // Check if Audio Worklet API is supported
    if (typeof AudioWorkletNode === 'undefined') {
      const errorMsg = 'AudioWorklet API is not supported in this browser';
      audioLoggers.audioCapture.error(`useAudioCapture: ${errorMsg}`);
      setError(errorMsg);
      return;
    }
    
    audioLoggers.audioCapture.info('useAudioCapture: Initializing audio capture hook');
    
    // Create manager
    const manager = new AudioCaptureManager(options.processingOptions);
    managerRef.current = manager;
    
    // Set up event listeners
    manager.addEventListener(AudioCaptureEventType.CAPTURE_START, () => {
      audioLoggers.audioCapture.info('useAudioCapture: Capture started');
      setState(AudioCaptureState.CAPTURING);
      setError(null);
    });
    
    manager.addEventListener(AudioCaptureEventType.CAPTURE_PAUSE, () => {
      audioLoggers.audioCapture.info('useAudioCapture: Capture paused');
      setState(AudioCaptureState.PAUSED);
    });
    
    manager.addEventListener(AudioCaptureEventType.CAPTURE_RESUME, () => {
      audioLoggers.audioCapture.info('useAudioCapture: Capture resumed');
      setState(AudioCaptureState.CAPTURING);
    });
    
    manager.addEventListener(AudioCaptureEventType.CAPTURE_STOP, (event) => {
      audioLoggers.audioCapture.info('useAudioCapture: Capture stopped', {
        duration: event.details?.duration
      });
      setState(AudioCaptureState.INACTIVE);
      if (event.details?.duration) {
        setDuration(event.details.duration);
      }
      
      // Auto-export if enabled
      if (options.autoExportOnStop && managerRef.current) {
        audioLoggers.audioCapture.info('useAudioCapture: Auto-exporting after stop');
        const exportOptions = options.autoExportOptions || {
          format: AudioExportFormat.WAV,
          autoDownload: true,
          normalize: true
        };
        
        setState(AudioCaptureState.EXPORTING);
        
        managerRef.current.exportAudio(exportOptions)
          .catch(err => {
            const errorMsg = err instanceof Error ? err.message : 'Export failed';
            audioLoggers.audioCapture.error(`useAudioCapture: Export error: ${errorMsg}`, err);
            setError(errorMsg);
            setState(AudioCaptureState.ERROR);
          });
      }
    });
    
    manager.addEventListener(AudioCaptureEventType.EXPORT_START, () => {
      audioLoggers.audioCapture.info('useAudioCapture: Export started');
      setState(AudioCaptureState.EXPORTING);
    });
    
    manager.addEventListener(AudioCaptureEventType.EXPORT_COMPLETE, () => {
      audioLoggers.audioCapture.info('useAudioCapture: Export completed');
      setState(AudioCaptureState.INACTIVE);
    });
    
    manager.addEventListener(AudioCaptureEventType.EXPORT_ERROR, (event) => {
      const errorMsg = event.details?.error || 'Export failed';
      audioLoggers.audioCapture.error(`useAudioCapture: Export error: ${errorMsg}`);
      setState(AudioCaptureState.ERROR);
      setError(errorMsg);
    });
    
    manager.addEventListener(AudioCaptureEventType.PROCESSOR_ERROR, (event) => {
      const errorMsg = event.details?.error || 'Processor error';
      audioLoggers.audioCapture.error(`useAudioCapture: Processor error: ${errorMsg}`);
      setState(AudioCaptureState.ERROR);
      setError(errorMsg);
    });
    
    // Initialize manager
    audioLoggers.audioCapture.debug('useAudioCapture: Initializing capture manager');
    manager.initialize()
      .then(() => {
        // Connect to source if provided
        if (options.sourceNode) {
          audioLoggers.audioCapture.debug('useAudioCapture: Connecting to provided source node');
          manager.connect(options.sourceNode, options.destinationNode || undefined);
        }
      })
      .catch(err => {
        const errorMsg = err instanceof Error ? err.message : 'Initialization failed';
        audioLoggers.audioCapture.error(`useAudioCapture: Initialization error: ${errorMsg}`, err);
        setError(errorMsg);
        setState(AudioCaptureState.ERROR);
      });
    
    // Cleanup on unmount
    return () => {
      audioLoggers.audioCapture.info('useAudioCapture: Cleaning up resources');
      if (managerRef.current) {
        managerRef.current.dispose();
      }
    };
  }, []); // Empty dependency array - only run on mount
  
  // Connect to source when it changes
  useEffect(() => {
    const manager = managerRef.current;
    if (!manager || !options.sourceNode) return;
    
    try {
      audioLoggers.audioCapture.debug('useAudioCapture: Updating source node connection');
      manager.connect(options.sourceNode, options.destinationNode || undefined);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Connection failed';
      audioLoggers.audioCapture.error(`useAudioCapture: Connection error: ${errorMsg}`, err);
      setError(errorMsg);
      setState(AudioCaptureState.ERROR);
    }
  }, [options.sourceNode, options.destinationNode]);
  
  // Define control functions
  const startCapture = useCallback(() => {
    if (managerRef.current) {
      try {
        audioLoggers.audioCapture.info('useAudioCapture: Starting capture');
        managerRef.current.start();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Start failed';
        audioLoggers.audioCapture.error(`useAudioCapture: Start error: ${errorMsg}`, err);
        setError(errorMsg);
        setState(AudioCaptureState.ERROR);
      }
    }
  }, []);
  
  const pauseCapture = useCallback(() => {
    if (managerRef.current) {
      try {
        audioLoggers.audioCapture.info('useAudioCapture: Pausing capture');
        managerRef.current.pause();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Pause failed';
        audioLoggers.audioCapture.error(`useAudioCapture: Pause error: ${errorMsg}`, err);
        setError(errorMsg);
        setState(AudioCaptureState.ERROR);
      }
    }
  }, []);
  
  const resumeCapture = useCallback(() => {
    if (managerRef.current) {
      try {
        audioLoggers.audioCapture.info('useAudioCapture: Resuming capture');
        managerRef.current.resume();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Resume failed';
        audioLoggers.audioCapture.error(`useAudioCapture: Resume error: ${errorMsg}`, err);
        setError(errorMsg);
        setState(AudioCaptureState.ERROR);
      }
    }
  }, []);
  
  const stopCapture = useCallback(() => {
    if (managerRef.current) {
      try {
        audioLoggers.audioCapture.info('useAudioCapture: Stopping capture');
        managerRef.current.stop();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Stop failed';
        audioLoggers.audioCapture.error(`useAudioCapture: Stop error: ${errorMsg}`, err);
        setError(errorMsg);
        setState(AudioCaptureState.ERROR);
      }
    }
  }, []);
  
  const exportAudio = useCallback(async (exportOptions?: Partial<AudioExportOptions>) => {
    if (!managerRef.current) {
      const errorMsg = 'Audio capture not initialized';
      audioLoggers.audioCapture.error(`useAudioCapture: ${errorMsg}`);
      throw new Error(errorMsg);
    }
    
    try {
      audioLoggers.audioCapture.info('useAudioCapture: Exporting audio', exportOptions);
      return await managerRef.current.exportAudio(exportOptions);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Export failed';
      audioLoggers.audioCapture.error(`useAudioCapture: Export error: ${errorMsg}`, err);
      setError(errorMsg);
      setState(AudioCaptureState.ERROR);
      throw err;
    }
  }, []);
  
  return {
    state,
    startCapture,
    pauseCapture,
    resumeCapture,
    stopCapture,
    exportAudio,
    duration,
    isCapturing: state === AudioCaptureState.CAPTURING,
    isPaused: state === AudioCaptureState.PAUSED,
    isExporting: state === AudioCaptureState.EXPORTING,
    hasError: state === AudioCaptureState.ERROR,
    error
  };
} 