'use client';

import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DashAudioPlayerProps } from '../../types/dash-player';
import { useDashPlayer } from '../../hooks/useDashPlayer';
import { useAudioVisualization } from '../../hooks/useAudioVisualization';
import { useAudioOrchestrator } from '../../hooks/useAudioOrchestrator';
import { audioLoggers } from '../../utils/LoggerFactory';
import AudioVisualizer from './AudioVisualizer';
import PlayerControls from './PlayerControls';
import ErrorDisplay from './ErrorDisplay';

/**
 * DashAudioPlayer component for streaming audio using dash.js
 */
const DashAudioPlayer: React.FC<DashAudioPlayerProps> = ({ 
  url = 'https://a.files.bbci.co.uk/ms6/live/3441A116-B12E-4D2F-ACA8-C1984642FA4B/audio/simulcast/dash/nonuk/pc_hd_abr_v2/cfsgc/bbc_world_service_news_internet.mpd',
  className = '',
  onPlaybackStarted,
  onPlaybackStateChange,
  streamingUrl,
  streamingEnabled = false,
  enableCapture = false,
}) => {
  // Log streaming configuration
  audioLoggers.dashPlayer.info(`DashAudioPlayer: Component initialized with streamingEnabled=${streamingEnabled}, streamingUrl=${streamingUrl}, enableCapture=${enableCapture}`);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioProcessorRef = useRef<any>(null);
  const setupAttemptedRef = useRef(false);
  
  // Use custom hook for dash player management
  const {
    videoRef,
    playerRef,
    isPlaying,
    volume,
    isMuted,
    error,
    initialized,
    showCanvas,
    handlePlayPause,
    handleVolumeChange,
    handleMuteToggle,
    handleRetry
  } = useDashPlayer({
    url,
    onPlaybackStarted,
    onPlaybackStateChange
  });
  
  // Use custom hook for audio visualization
  const {
    audioContext,
    analyser,
    sourceNode,
    dataArray,
    setupAudioVisualization,
    cleanupAudioNodes
  } = useAudioVisualization({
    videoRef,
    canvasRef,
    isPlaying,
    showCanvas
  });
  
  // Use audio orchestrator when capture is enabled
  const { isCapturing, error: orchestratorError } = useAudioOrchestrator({
    enabled: enableCapture,
    audioContext,
    sourceNode,
    isPlaying
  });
  
  // Set up audio visualization when player is initialized - only attempt once
  useEffect(() => {
    // Use a ref to ensure we only attempt setup once regardless of StrictMode's double-rendering
    if (initialized && videoRef.current && !setupAttemptedRef.current) {
      // Mark that we've attempted setup to prevent multiple calls
      setupAttemptedRef.current = true;
      
      audioLoggers.dashPlayer.info('DashAudioPlayer: Setting up audio visualization');
      setupAudioVisualization().then(success => {
        if (success) {
          audioLoggers.dashPlayer.info('DashAudioPlayer: Audio visualization set up successfully');
        } else {
          audioLoggers.dashPlayer.warn('DashAudioPlayer: Failed to set up audio visualization, playback will continue without visualization');
          // Even if visualization fails, we can still play audio
        }
      });
    }
    
    // Clean up on unmount - this only runs when component is unmounted
    return () => {
      cleanupAudioNodes();
    };
  }, [initialized, videoRef, setupAudioVisualization, cleanupAudioNodes]);
  
  // Effect to update audio processor when playback state changes
  useEffect(() => {
    if (isPlaying && analyser && audioContext && streamingEnabled) {
      // Resume audio context if suspended
      if (audioContext.state === 'suspended') {
        audioContext.resume().catch(err => 
          audioLoggers.dashPlayer.warn('Error resuming AudioContext:', err)
        );
      }
      
      // Set up audio processor for streaming if needed
      if (audioProcessorRef.current && streamingEnabled) {
        audioLoggers.dashPlayer.info('DashAudioPlayer: Enabling streaming via processor');
        audioProcessorRef.current.setStreaming(true);
      }
    }
  }, [isPlaying, analyser, audioContext, streamingEnabled]);
  
  // Log orchestrator errors
  useEffect(() => {
    if (orchestratorError) {
      audioLoggers.dashPlayer.error('Audio orchestrator error:', orchestratorError);
    }
  }, [orchestratorError]);
  
  // Render error display if there's an error
  if (error || orchestratorError) {
    const errorMessage = error || (orchestratorError ? orchestratorError.message : '');
    return <ErrorDisplay error={errorMessage} onRetry={handleRetry} className={className} />;
  }

  return (
    <div className={`w-full mx-auto rounded-lg bg-black/40 p-4 shadow-lg ${className}`}>
      {/* Video element for DASH playback (hidden) */}
      <video 
        ref={videoRef}
        className="hidden"
        playsInline
        onPlay={() => {
          console.log("[PLAYER DEBUG] Video element started playing");
        }}
        onPause={() => {
          console.log("[PLAYER DEBUG] Video element paused");
        }}
        onEnded={() => {
          console.log("[PLAYER DEBUG] Video element playback ended");
        }}
        onError={(e) => {
          console.log("[PLAYER DEBUG] Video element error", e);
          audioLoggers.dashPlayer.error('Video element error:', e);
        }}
      />
      
      {/* Audio visualization component */}
      <AudioVisualizer 
        ref={canvasRef}
        showCanvas={showCanvas}
      />
      
      {/* Player controls component */}
      <PlayerControls
        isPlaying={isPlaying}
        isMuted={isMuted}
        volume={volume}
        onPlayPause={handlePlayPause}
        onVolumeChange={handleVolumeChange}
        onMuteToggle={handleMuteToggle}
        enableCapture={enableCapture}
        isCapturing={isCapturing}
        sourceNode={sourceNode}
        audioContext={audioContext}
      />
    </div>
  );
};

export default DashAudioPlayer; 