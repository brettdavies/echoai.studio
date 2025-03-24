import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { AudioProcessorProps } from './audio/types';
import { DEFAULT_PROCESSING_OPTIONS } from './audio/constants';
import { AudioProcessingSystem } from './audio/AudioProcessingSystem';
import { 
  createAudioStreaming, 
  StreamingAudioProcessor
} from '../services/websocket';
import { audioLogger, LogLevel } from '../utils/Logger';
import { useWebSocket } from '../contexts/WebSocketContext';
import { DEFAULT_WS_URL } from '../config';

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
  
  // Optional logging configuration
  loggerConfig?: {
    level?: LogLevel;
    enableWasm?: boolean;
    enableResampler?: boolean;
    enableWorklet?: boolean;
    enableProcessor?: boolean;
  };
}

/**
 * Component that processes audio in real-time
 * 
 * Uses a facade pattern to coordinate the audio processing system
 */
const AudioProcessor = forwardRef<any, AudioProcessorPropsWithStreaming>(({
  audioContext,
  mediaElement,
  sourceNode,
  isPlaying,
  processingOptions = DEFAULT_PROCESSING_OPTIONS,
  streamingUrl = DEFAULT_WS_URL,
  streamingEnabled = false,
  onStreamingStatusChange,
  loggerConfig,
}, ref) => {
  // Reference to the audio processing system
  const systemRef = useRef<AudioProcessingSystem | null>(null);
  
  // Reference to the streaming processor when enabled
  const streamingProcessorRef = useRef<StreamingAudioProcessor | null>(null);
  
  // Playback state ref for callbacks
  const isPlayingRef = useRef<boolean>(isPlaying);
  
  // Streaming state
  const [isStreaming, setIsStreaming] = useState<boolean>(streamingEnabled);
  
  // Get the global WebSocket service
  const { webSocketService, connect, isConnected } = useWebSocket();
  
  // Expose the streamingProcessor and system to the parent component via ref
  useImperativeHandle(ref, () => ({
    getStreamingProcessor: () => streamingProcessorRef.current,
    getSystem: () => systemRef.current,
    setStreaming: (enabled: boolean) => {
      audioLogger.logProcessor(LogLevel.INFO, `Setting streaming state via ref: ${enabled}`);
      if (streamingProcessorRef.current) {
        streamingProcessorRef.current.setStreaming(enabled);
        setIsStreaming(enabled);
      }
    }
  }), []);
  
  // Configure logger based on props
  useEffect(() => {
    if (loggerConfig) {
      audioLogger.configure(loggerConfig);
      audioLogger.logProcessor(LogLevel.INFO, 'Audio processor logger configured', loggerConfig);
    }
  }, [loggerConfig]);
  
  // Initialize or update the audio processing system when dependencies change
  useEffect(() => {
    const initializeSystem = async () => {
      // Skip if dependencies are missing
      if (!audioContext || !mediaElement || !sourceNode) {
        audioLogger.logProcessor(LogLevel.DEBUG, 'Missing audio dependencies, skipping initialization');
        return;
      }
      
      try {
        // Create a new system if it doesn't exist
        if (!systemRef.current) {
          audioLogger.logProcessor(LogLevel.INFO, 'Creating new audio processing system');
          
          // Check if streaming is enabled and URL is provided
          if (streamingUrl) {
            audioLogger.logProcessor(LogLevel.INFO, `Streaming enabled (${streamingEnabled}), creating streaming processor`, {
              url: streamingUrl,
              usingGlobalWebSocket: !!webSocketService
            });
            
            // Ensure WebSocket is connected if specified
            if (streamingUrl && !isConnected() && webSocketService) {
              try {
                audioLogger.logProcessor(LogLevel.INFO, 'Connecting to WebSocket server:', streamingUrl);
                await connect(streamingUrl);
              } catch (error) {
                audioLogger.logProcessor(LogLevel.ERROR, 'Failed to connect to WebSocket server', error);
              }
            }
            
            // Create streaming processor
            const streamingProcessor = createAudioStreaming({
              serverUrl: streamingUrl,
              processingOptions,
              loggerOptions: loggerConfig, // Pass logger options to factory
              ...(webSocketService ? { webSocketService } : {}) // Only include if not null
            });
            
            // Store reference
            streamingProcessorRef.current = streamingProcessor;
            
            // Register streaming status callback
            if (onStreamingStatusChange) {
              streamingProcessor.onStreamingStatusChange((status, message) => {
                audioLogger.logProcessor(LogLevel.INFO, `Streaming status changed: ${status}`, { message });
                onStreamingStatusChange(status, message);
              });
            }
            
            // Enable/disable streaming based on prop
            audioLogger.logProcessor(LogLevel.INFO, `Explicitly setting streaming state to: ${streamingEnabled}`);
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
            
            audioLogger.logProcessor(LogLevel.INFO, 'Audio processing system with streaming initialized');
          } else {
            audioLogger.logProcessor(LogLevel.INFO, 'Creating standard audio processor without streaming');
            
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
            
            audioLogger.logProcessor(LogLevel.INFO, 'Standard audio processing system initialized');
          }
        } else {
          // Update existing system
          audioLogger.logProcessor(LogLevel.DEBUG, 'Updating existing audio processing system', {
            processingOptions
          });
          
          systemRef.current.updateOptions(processingOptions);
          systemRef.current.updateSourceNode(sourceNode);
          
          // Update streaming processor if it exists
          if (streamingProcessorRef.current) {
            streamingProcessorRef.current.updateOptions(processingOptions);
            audioLogger.logProcessor(LogLevel.DEBUG, 'Updated streaming processor options');
          }
        }
      } catch (error) {
        audioLogger.logProcessor(LogLevel.ERROR, 'Failed to initialize audio processing system', error);
      }
    };
    
    initializeSystem();
    
    // Cleanup function
    return () => {
      if (systemRef.current) {
        audioLogger.logProcessor(LogLevel.INFO, 'Cleaning up audio processing system');
        systemRef.current.cleanup();
        systemRef.current = null;
      }
      
      // Reset streaming processor
      streamingProcessorRef.current = null;
    };
  }, [audioContext, mediaElement, sourceNode, processingOptions, streamingUrl, onStreamingStatusChange, streamingEnabled, loggerConfig, webSocketService, connect, isConnected]);
  
  // Handle audio data callback
  const handleAudioData = async (audioData: Float32Array) => {
    // Always log some sample data to debug audio processing
    const sampleValues = Array.from(audioData.slice(0, 5)).map(v => v.toFixed(4));
    audioLogger.logProcessor(LogLevel.INFO, `Received audio chunk: ${audioData.length} samples, is playing: ${isPlayingRef.current}, streaming: ${isStreaming}`);
    audioLogger.logProcessor(LogLevel.INFO, `Audio data samples: [${sampleValues.join(', ')}]`);
    
    if (!isPlayingRef.current) {
      audioLogger.logProcessor(LogLevel.DEBUG, `Not processing audio because isPlaying is false`);
      return;
    }
    
    if (!systemRef.current) {
      audioLogger.logProcessor(LogLevel.ERROR, `Cannot process audio: system is null`);
      return;
    }
    
    // Log before processing with streaming info
    audioLogger.logProcessor(LogLevel.INFO, `About to process audio chunk with streaming=${isStreaming}`);
    
    try {
      // Get the processor core
      const processorCore = systemRef.current.getProcessorCore();
      if (processorCore) {
        processorCore.setOriginalSampleRate(audioContext.sampleRate);
        
        // Process the audio data
        await processorCore.processAudioChunk(audioData);
        
        // Log successful processing
        audioLogger.logProcessor(LogLevel.INFO, `Successfully processed audio chunk with sample rate ${audioContext.sampleRate}`);
      } else {
        audioLogger.logProcessor(LogLevel.WARN, `No processor core available to process audio`);
      }
    } catch (error) {
      audioLogger.logProcessor(LogLevel.ERROR, `Error processing audio chunk: ${error}`);
    }
  };
  
  // Keep isPlayingRef in sync with the isPlaying prop
  useEffect(() => {
    isPlayingRef.current = isPlaying;
    
    // Notify the system about playback state change
    if (systemRef.current) {
      audioLogger.logProcessor(LogLevel.INFO, `Setting playback state: ${isPlaying}`);
      systemRef.current.setPlaybackState(isPlaying);
    }
    
    // Ensure streaming is enabled when playing
    if (isPlaying && streamingEnabled && streamingProcessorRef.current) {
      audioLogger.logProcessor(LogLevel.INFO, `Ensuring streaming is enabled during playback`);
      streamingProcessorRef.current.setStreaming(true);
      setIsStreaming(true);
    }
  }, [isPlaying, streamingEnabled]);
  
  // Handle playback state changes - start/stop processing
  useEffect(() => {
    if (!systemRef.current) return;
    
    if (isPlaying) {
      audioLogger.logProcessor(LogLevel.INFO, 'Starting audio processing');
      systemRef.current.startProcessing();
    } else {
      audioLogger.logProcessor(LogLevel.INFO, 'Stopping audio processing');
      systemRef.current.stopProcessing();
    }
  }, [isPlaying]);
  
  // Update streaming state when streamingEnabled prop changes
  useEffect(() => {
    audioLogger.logProcessor(LogLevel.INFO, `[DEBUG] Checking streaming state: streamingEnabled=${streamingEnabled}, isStreaming=${isStreaming}, streamingProcessor exists=${!!streamingProcessorRef.current}`);
    
    if (streamingProcessorRef.current && streamingEnabled !== isStreaming) {
      audioLogger.logProcessor(LogLevel.INFO, `Setting streaming state: ${streamingEnabled}`);
      streamingProcessorRef.current.setStreaming(streamingEnabled);
      setIsStreaming(streamingEnabled);
    }
  }, [streamingEnabled, isStreaming]);
  
  return null;
});

export default AudioProcessor; 