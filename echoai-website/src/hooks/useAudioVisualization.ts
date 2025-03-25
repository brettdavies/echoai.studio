import { useRef, useEffect, useCallback } from 'react';
import { audioLoggers } from '../utils/LoggerFactory';
import { AudioNodes, VisualizationData } from '../types/dash-player';

interface UseAudioVisualizationProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isPlaying: boolean;
  showCanvas: boolean;
}

interface UseAudioVisualizationReturn extends AudioNodes {
  dataArray: Uint8Array | null;
  setupAudioVisualization: () => Promise<boolean>;
  cleanupAudioNodes: () => void;
}

/**
 * Custom hook for handling audio visualization with Web Audio API
 */
export function useAudioVisualization({
  videoRef,
  canvasRef,
  isPlaying,
  showCanvas
}: UseAudioVisualizationProps): UseAudioVisualizationReturn {
  // Audio context and nodes
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationRef = useRef<number | null>(null);
  const isSetupRef = useRef(false);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  
  // Clean up audio nodes
  const cleanupAudioNodes = useCallback(() => {
    // Only clean up if we have actually set up
    if (!isSetupRef.current) return;
    
    // Cancel animation frame
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    // Clean up audio context and connections
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch (e) {
        audioLoggers.dashPlayer.warn('Error disconnecting source node:', e);
      }
      sourceNodeRef.current = null;
    }
    
    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect();
      } catch (e) {
        audioLoggers.dashPlayer.warn('Error disconnecting analyser node:', e);
      }
      analyserRef.current = null;
    }
    
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {
        audioLoggers.dashPlayer.warn('Error closing audio context:', e);
      }
      audioContextRef.current = null;
    }
    
    dataArrayRef.current = null;
    isSetupRef.current = false;
    videoElementRef.current = null;
  }, []);
  
  // Setup audio visualization
  const setupAudioVisualization = useCallback(async (): Promise<boolean> => {
    // Skip if already set up or video element is not available
    if (!videoRef.current) return false;
    
    // Check if we're already set up for this specific video element
    if (isSetupRef.current && videoElementRef.current === videoRef.current) {
      audioLoggers.dashPlayer.debug('Audio visualization already set up for this video element, skipping setup');
      
      // If audio context exists but is suspended, resume it
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        try {
          await audioContextRef.current.resume();
          audioLoggers.dashPlayer.debug('Resumed existing audio context');
        } catch (e) {
          audioLoggers.dashPlayer.warn('Error resuming existing AudioContext:', e);
        }
      }
      return true;
    }
    
    // If we get here, we either haven't set up yet or are setting up for a new video element
    // If we already have an audio context set up for a different video element, clean it up first
    if (isSetupRef.current && videoElementRef.current !== videoRef.current) {
      audioLoggers.dashPlayer.debug('Cleaning up existing audio context before creating a new one');
      cleanupAudioNodes();
    }
    
    try {
      // Store reference to current video element
      videoElementRef.current = videoRef.current;
      
      // Create AudioContext
      audioLoggers.dashPlayer.info('Creating new AudioContext');
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;
      
      audioLoggers.dashPlayer.info(`AudioContext created, state: ${ctx.state}`);
      
      // Create analyzer
      audioLoggers.dashPlayer.info('Creating AnalyserNode');
      const analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 256;
      analyserNode.smoothingTimeConstant = 0.8;
      analyserRef.current = analyserNode;
      
      // Create a buffer to store frequency data
      const bufferLength = analyserNode.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
      
      try {
        // Connect video element to the audio context
        audioLoggers.dashPlayer.info('Creating MediaElementAudioSourceNode');
        const sourceNode = ctx.createMediaElementSource(videoRef.current);
        sourceNodeRef.current = sourceNode;
        
        // Connect the source to the analyzer
        audioLoggers.dashPlayer.info('Setting up audio graph connections');
        sourceNode.connect(analyserNode);
        
        // Also connect analyzer to destination so we can hear the audio
        analyserNode.connect(ctx.destination);
        
        audioLoggers.dashPlayer.info('Audio visualization set up with Web Audio API');
        isSetupRef.current = true;
        return true;
      } catch (sourceError) {
        // If we failed to create the source node (already connected), 
        // clean up other nodes and gracefully fail
        audioLoggers.dashPlayer.warn('Could not create MediaElementSourceNode (might already be connected):', sourceError);
        
        if (analyserNode) {
          try {
            analyserNode.disconnect();
          } catch (e) {
            // Ignore disconnect errors
          }
        }
        
        if (ctx && ctx.state !== 'closed') {
          try {
            ctx.close();
          } catch (e) {
            // Ignore close errors
          }
        }
        
        audioContextRef.current = null;
        analyserRef.current = null;
        videoElementRef.current = null;
        return false;
      }
    } catch (error) {
      audioLoggers.dashPlayer.error('Error setting up audio visualization:', error);
      videoElementRef.current = null;
      return false;
    }
  }, [videoRef, cleanupAudioNodes]);
  
  // Render visualization
  const renderVisualization = useCallback(() => {
    if (!canvasRef.current || !dataArrayRef.current) return;
    
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;
    
    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      
      // Get frequency data if analyzer is available
      if (analyserRef.current && dataArrayRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      }
      
      const dataArray = dataArrayRef.current;
      if (!dataArray) return;
      
      // Clear the canvas
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Create a modern gradient
      const gradient = canvasCtx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, 'rgba(147, 51, 234, 0.8)'); // Brighter purple
      gradient.addColorStop(0.6, 'rgba(79, 70, 229, 0.6)'); // Indigo
      gradient.addColorStop(1, 'rgba(59, 130, 246, 0.4)'); // Blue
      
      const barWidth = (canvas.width / dataArray.length) * 2.5;
      let x = 0;
      
      // Draw bars with smooth animation
      for (let i = 0; i < dataArray.length; i++) {
        const barHeight = dataArray[i] / 2;
        
        // Draw a rounded rect for each bar
        canvasCtx.fillStyle = gradient;
        canvasCtx.beginPath();
        
        // Use roundRect if available, otherwise fallback to regular rect
        if (canvasCtx.roundRect) {
          canvasCtx.roundRect(
            x, 
            canvas.height - barHeight, 
            barWidth, 
            barHeight,
            [3, 3, 0, 0] // Round top corners
          );
        } else {
          canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        }
        
        canvasCtx.fill();
        
        x += barWidth + 1;
      }
      
      // Add glow effect
      canvasCtx.globalCompositeOperation = 'screen';
      canvasCtx.filter = 'blur(4px)';
      canvasCtx.globalAlpha = 0.3;
      
      // Draw glow
      x = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const barHeight = dataArray[i] / 2;
        canvasCtx.fillStyle = 'rgba(147, 51, 234, 0.5)';
        canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
      
      // Reset drawing context
      canvasCtx.globalCompositeOperation = 'source-over';
      canvasCtx.filter = 'none';
      canvasCtx.globalAlpha = 1.0;
    };
    
    draw();
  }, [canvasRef]);
  
  // Start and manage visualization
  useEffect(() => {
    if (showCanvas && isPlaying && isSetupRef.current) {
      // If audio context exists but is suspended (browser policy), resume it
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(err => 
          audioLoggers.dashPlayer.warn('Error resuming AudioContext:', err)
        );
      }
      
      // Start visualization if we have the necessary components
      if (canvasRef.current && dataArrayRef.current) {
        renderVisualization();
      }
    }
    
    // Cleanup when unmounting or when dependencies change
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [showCanvas, isPlaying, renderVisualization]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanupAudioNodes();
    };
  }, [cleanupAudioNodes]);
  
  return {
    audioContext: audioContextRef.current,
    analyser: analyserRef.current,
    sourceNode: sourceNodeRef.current,
    dataArray: dataArrayRef.current,
    setupAudioVisualization,
    cleanupAudioNodes
  };
} 