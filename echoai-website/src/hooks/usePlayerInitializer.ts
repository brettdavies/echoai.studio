import { useCallback, useRef } from 'react';
import { audioLoggers } from '../utils/LoggerFactory';

interface UsePlayerInitializerProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  url: string;
  volume: number;
  initialized: boolean;
  setInitialized: (initialized: boolean) => void;
  onError: (message: string) => void;
}

interface UsePlayerInitializerReturn {
  playerRef: React.RefObject<dashjs.MediaPlayerInstance | null>;
  initializePlayer: () => boolean;
  resetPlayer: () => void;
}

/**
 * Hook for initializing the dash.js player
 */
export function usePlayerInitializer({
  videoRef,
  url,
  volume,
  initialized,
  setInitialized,
  onError
}: UsePlayerInitializerProps): UsePlayerInitializerReturn {
  const playerRef = useRef<dashjs.MediaPlayerInstance | null>(null);
  
  // Reset player and clean up resources
  const resetPlayer = useCallback(() => {
    if (playerRef.current) {
      try {
        playerRef.current.reset();
      } catch (e) {
        audioLoggers.dashPlayer.warn('Error resetting dash player:', e);
      }
      playerRef.current = null;
    }
  }, []);
  
  // Initialize player
  const initializePlayer = useCallback((): boolean => {
    if (!videoRef.current || initialized || typeof window === 'undefined' || !window.dashjs) {
      return false;
    }

    try {
      audioLoggers.dashPlayer.info('Initializing dash.js player...');
      
      // Set initialized flag early to prevent multiple initialization attempts
      setInitialized(true);
      
      // Clear previous player if it exists
      resetPlayer();
      
      // Create a new player instance
      const player = window.dashjs.MediaPlayer().create();
      playerRef.current = player;
      
      audioLoggers.dashPlayer.info('Player instance created successfully');
      
      // Configure player settings
      try {
        player.updateSettings({
          debug: {
            logLevel: window.dashjs.Debug.LOG_LEVEL_WARNING
          },
          streaming: {
            buffer: {
              fastSwitchEnabled: true
            },
            liveCatchup: {
              enabled: true,
              maxDrift: 0.5
            }
          }
        });
        audioLoggers.dashPlayer.info('Player settings updated successfully');
      } catch (settingsError) {
        audioLoggers.dashPlayer.warn('Error updating settings, might be using older dash.js version:', settingsError);
      }

      audioLoggers.dashPlayer.info('Initializing player with video element and URL:', url);
      // Initialize player with video element and MPD URL (autoPlay: false)
      player.initialize(videoRef.current, url, false);
      audioLoggers.dashPlayer.info('Player initialized successfully');
      
      try {
        // Set volume and mute
        player.setVolume(volume);
        player.setMute(false);
        audioLoggers.dashPlayer.info('Volume and mute settings applied, player not muted');
      } catch (volumeError) {
        audioLoggers.dashPlayer.warn('Error setting volume/mute:', volumeError);
      }
      
      return true;
    } catch (err) {
      audioLoggers.dashPlayer.error('Error initializing DASH player:', err);
      onError(`Failed to initialize DASH player: ${err instanceof Error ? err.message : 'Unknown error'}`);
      // Reset initialized flag in case of error
      setInitialized(false);
      return false;
    }
  }, [videoRef, initialized, url, volume, setInitialized, onError, resetPlayer]);
  
  return {
    playerRef,
    initializePlayer,
    resetPlayer
  };
} 