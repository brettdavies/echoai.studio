import { useEffect, useRef, useState } from 'react';
import { AudioProcessorProps } from './audio/types';
import { DEFAULT_PROCESSING_OPTIONS } from './audio/constants';
import { AudioProcessingSystem } from './audio/AudioProcessingSystem';
import { createAudioStreaming, StreamingAudioProcessor } from '../services/websocket';

/**
 * Extended props interface with streaming support
 */
interface AudioProcessorPropsWithStreaming extends AudioProcessorProps {
  // Optional WebSocket server URL for streaming
  streamingUrl?: string;
  
  // Optional streaming enabled state
  streamingEnabled?: boolean;
  
  // Optional callback for streaming status changes
  onStreamingStatusChange?: (status: boolean, message?: string) => void;
}

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
  streamingUrl,
  streamingEnabled = false,
  onStreamingStatusChange,
}: AudioProcessorPropsWithStreaming) => {
  // Reference to the audio processing system
  const systemRef = useRef<AudioProcessingSystem | null>(null);
  
  // Reference to the streaming processor when enabled
  const streamingProcessorRef = useRef<StreamingAudioProcessor | null>(null);
  
  // Playback state ref for callbacks
  const isPlayingRef = useRef<boolean>(false);
  
  // Streaming state
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  
  // Initialize or update the audio processing system when dependencies change
  useEffect(() => {
    const initializeSystem = async () => {
      // Skip if dependencies are missing
      if (!audioContext || !mediaElement || !sourceNode) return;
      
      try {
        // Create a new system if it doesn't exist
        if (!systemRef.current) {
          // Check if streaming is enabled and URL is provided
          if (streamingUrl) {
            // Create streaming processor
            const streamingProcessor = createAudioStreaming({
              serverUrl: streamingUrl,
              processingOptions,
            });
            
            // Store reference
            streamingProcessorRef.current = streamingProcessor;
            
            // Register streaming status callback
            if (onStreamingStatusChange) {
              streamingProcessor.onStreamingStatusChange(onStreamingStatusChange);
            }
            
            // Enable/disable streaming based on prop
            streamingProcessor.setStreaming(streamingEnabled);
            setIsStreaming(streamingEnabled);
            
            // Create audio processor system with streaming processor
            const system = new AudioProcessingSystem(
              audioContext,
              sourceNode,
              processingOptions,
              handleAudioData,
              streamingProcessor // Pass streaming processor to system
            );
            
            // Initialize the system
            await system.initialize();
            
            // Set initial playback state
            system.setPlaybackState(isPlayingRef.current);
            
            // Store reference
            systemRef.current = system;
          } else {
            // Create standard audio processor system without streaming
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
          }
        } else {
          // Update existing system
          systemRef.current.updateOptions(processingOptions);
          systemRef.current.updateSourceNode(sourceNode);
          
          // Update streaming processor if it exists
          if (streamingProcessorRef.current) {
            streamingProcessorRef.current.updateOptions(processingOptions);
          }
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
      
      // Reset streaming processor
      streamingProcessorRef.current = null;
    };
  }, [audioContext, mediaElement, sourceNode, processingOptions, streamingUrl]);
  
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
  
  // Update streaming state when streamingEnabled prop changes
  useEffect(() => {
    if (streamingProcessorRef.current && streamingEnabled !== isStreaming) {
      streamingProcessorRef.current.setStreaming(streamingEnabled);
      setIsStreaming(streamingEnabled);
    }
  }, [streamingEnabled, isStreaming]);
  
  return null;
};

export default AudioProcessor; 