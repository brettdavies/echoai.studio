import { useEffect, useRef } from 'react';
import { AudioProcessorProps } from './audio/types';
import { DEFAULT_PROCESSING_OPTIONS } from './audio/constants';
import { AudioProcessingSystem } from './audio/AudioProcessingSystem';

/**
 * Component that processes audio in real-time
 * 
 * Uses a facade pattern to coordinate the audio processing system
 */
const AudioProcessor = ({
  audioContext,
  mediaElement,
  sourceNode,
  isPlaying,
  processingOptions = DEFAULT_PROCESSING_OPTIONS,
}: AudioProcessorProps) => {
  // Reference to the audio processing system
  const systemRef = useRef<AudioProcessingSystem | null>(null);
  
  // Playback state ref for callbacks
  const isPlayingRef = useRef<boolean>(false);
  
  // Initialize or update the audio processing system when dependencies change
  useEffect(() => {
    const initializeSystem = async () => {
      // Skip if dependencies are missing
      if (!audioContext || !mediaElement || !sourceNode) return;
      
      try {
        // Create a new system if it doesn't exist
        if (!systemRef.current) {
          // Create audio processor system with audio data callback
          const system = new AudioProcessingSystem(
            audioContext,
            sourceNode,
            processingOptions,
            handleAudioData
          );
          
          // Initialize the system
          await system.initialize();
          
          // Set initial playback state
          system.setPlaybackState(isPlayingRef.current);
          
          // Store reference
          systemRef.current = system;
        } else {
          // Update existing system
          systemRef.current.updateOptions(processingOptions);
          systemRef.current.updateSourceNode(sourceNode);
        }
      } catch (error) {
        console.error('Failed to initialize audio processing system:', error);
      }
    };
    
    initializeSystem();
    
    // Cleanup function
    return () => {
      if (systemRef.current) {
        systemRef.current.cleanup();
        systemRef.current = null;
      }
    };
  }, [audioContext, mediaElement, sourceNode, processingOptions]);
  
  // Handle audio data callback
  const handleAudioData = async (audioData: Float32Array) => {
    if (!isPlayingRef.current || !systemRef.current) return;
    
    // Get the processor core using the getter method
    const processorCore = systemRef.current.getProcessorCore();
    if (processorCore) {
      processorCore.setOriginalSampleRate(audioContext.sampleRate);
      await processorCore.processAudioChunk(audioData);
    }
  };
  
  // Keep isPlayingRef in sync with the isPlaying prop
  useEffect(() => {
    isPlayingRef.current = isPlaying;
    
    // Notify the system about playback state change
    if (systemRef.current) {
      systemRef.current.setPlaybackState(isPlaying);
    }
  }, [isPlaying]);
  
  // Handle playback state changes - start/stop processing
  useEffect(() => {
    if (!systemRef.current) return;
    
    if (isPlaying) {
      systemRef.current.startProcessing();
    } else {
      systemRef.current.stopProcessing();
    }
  }, [isPlaying]);
  
  return null;
};

export default AudioProcessor; 