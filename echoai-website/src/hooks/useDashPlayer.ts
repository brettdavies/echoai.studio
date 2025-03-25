import { useState, useEffect, useRef, useCallback } from 'react';
import { audioLoggers } from '../utils/LoggerFactory';
import DashAudioPlayerLogger from '../utils/DashAudioPlayerLogger';
import { PlayerState } from '../types/dash-player';
import { useDashScriptLoader } from './useDashScriptLoader';
import { usePlayerInitializer } from './usePlayerInitializer';
import { usePlayerEvents } from './usePlayerEvents';
import { usePlayerControls } from './usePlayerControls';

interface UseDashPlayerProps {
  url: string;
  onPlaybackStarted?: () => void;
  onPlaybackStateChange?: (isPlaying: boolean) => void;
}

interface UseDashPlayerReturn extends PlayerState {
  videoRef: React.RefObject<HTMLVideoElement>;
  playerRef: React.RefObject<dashjs.MediaPlayerInstance | null>;
  handlePlayPause: () => void;
  handleVolumeChange: (values: number[]) => void;
  handleMuteToggle: () => void;
  handleRetry: () => void;
}

/**
 * Custom hook for managing dash.js player functionality
 * Composed of smaller, focused hooks
 */
export function useDashPlayer({
  url,
  onPlaybackStarted,
  onPlaybackStateChange,
}: UseDashPlayerProps): UseDashPlayerReturn {
  // Video reference
  const videoRef = useRef<HTMLVideoElement>(null);
  const loggerRef = useRef<DashAudioPlayerLogger | null>(null);
  
  // Player state
  const [playerState, setPlayerState] = useState<PlayerState>({
    isPlaying: false,
    volume: 0.8,
    isMuted: false,
    error: null,
    initialized: false,
    showCanvas: false,
  });
  
  const { isPlaying, volume, isMuted, error, initialized, showCanvas } = playerState;
  
  // State update callbacks
  const setError = useCallback((error: string | null) => {
    setPlayerState(prev => ({ ...prev, error }));
  }, []);
  
  const setIsPlaying = useCallback((isPlaying: boolean) => {
    setPlayerState(prev => ({ ...prev, isPlaying }));
    if (onPlaybackStateChange) {
      onPlaybackStateChange(isPlaying);
    }
  }, [onPlaybackStateChange]);
  
  const setVolume = useCallback((volume: number) => {
    setPlayerState(prev => ({ ...prev, volume }));
  }, []);
  
  const setIsMuted = useCallback((isMuted: boolean) => {
    setPlayerState(prev => ({ ...prev, isMuted }));
  }, []);
  
  const setInitialized = useCallback((initialized: boolean) => {
    setPlayerState(prev => ({ ...prev, initialized }));
  }, []);
  
  const setShowCanvas = useCallback((showCanvas: boolean) => {
    setPlayerState(prev => ({ ...prev, showCanvas }));
  }, []);
  
  // Use the script loader hook
  const { isLoaded, error: scriptError, reloadScript } = useDashScriptLoader();
  
  // Use the player initializer hook
  const { playerRef, initializePlayer, resetPlayer } = usePlayerInitializer({
    videoRef,
    url,
    volume,
    initialized,
    setInitialized,
    onError: setError
  });
  
  // Initialize the logger
  useEffect(() => {
    if (!loggerRef.current) {
      loggerRef.current = new DashAudioPlayerLogger();
    }
    
    return () => {
      if (loggerRef.current) {
        loggerRef.current.stopLogging();
      }
    };
  }, []);
  
  // Set script error if there is one
  useEffect(() => {
    if (scriptError) {
      setError(scriptError);
    }
  }, [scriptError, setError]);
  
  // Initialize player once script is loaded
  useEffect(() => {
    if (isLoaded && !initialized && !playerRef.current) {
      initializePlayer();
    }
  }, [isLoaded, initialized, initializePlayer, playerRef]);
  
  // Use the player events hook
  usePlayerEvents({
    player: playerRef.current,
    onError: setError,
    onPlaybackStarted,
    onPlaybackStateChange,
    setIsPlaying,
    setShowCanvas,
    setIsMuted
  });
  
  // Use the player controls hook
  const { 
    handlePlayPause,
    handleVolumeChange, 
    handleMuteToggle 
  } = usePlayerControls({
    player: playerRef.current,
    isPlaying,
    volume,
    isMuted,
    onPlaybackStarted,
    setVolume,
    setIsMuted
  });
  
  // Cleanup function
  const cleanupDashPlayer = useCallback(() => {
    // Reset dash.js player
    resetPlayer();
    
    setInitialized(false);
    setShowCanvas(false);
  }, [resetPlayer, setInitialized, setShowCanvas]);
  
  // Handle retry when there's an error
  const handleRetry = useCallback(async () => {
    setError(null);
    cleanupDashPlayer();
    
    // Reload the script and try again
    const success = await reloadScript();
    if (success) {
      setTimeout(() => {
        initializePlayer();
      }, 300);
    }
  }, [cleanupDashPlayer, reloadScript, initializePlayer, setError]);
  
  return {
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
  };
} 