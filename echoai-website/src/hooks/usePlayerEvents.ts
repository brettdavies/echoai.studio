import { useCallback, useEffect } from 'react';
import { audioLoggers } from '../utils/LoggerFactory';

interface UsePlayerEventsProps {
  player: dashjs.MediaPlayerInstance | null;
  onError: (message: string) => void;
  onPlaybackStarted: (() => void) | undefined;
  onPlaybackStateChange: ((isPlaying: boolean) => void) | undefined;
  setIsPlaying: (isPlaying: boolean) => void;
  setShowCanvas: (show: boolean) => void;
  setIsMuted: (muted: boolean) => void;
}

/**
 * Hook for managing dash.js player events
 */
export function usePlayerEvents({
  player,
  onError,
  onPlaybackStarted,
  onPlaybackStateChange,
  setIsPlaying,
  setShowCanvas,
  setIsMuted
}: UsePlayerEventsProps): void {
  // Set up event handlers
  const setupEventListeners = useCallback(() => {
    if (!player) return;
    
    try {
      // Error event
      player.on('error', (error: any) => {
        audioLoggers.dashPlayer.error('Dash player error:', error);
        onError(`Dash.js error: ${error?.event?.message || 'Unknown error'}`);
      });
      
      // Stream initialization
      player.on('streamInitialized', () => {
        audioLoggers.dashPlayer.info('Stream initialized successfully');
      });
      
      // Playback started
      player.on('playbackStarted', () => {
        audioLoggers.dashPlayer.info('Playback started');
        
        setIsPlaying(true);
        setShowCanvas(true);
        
        if (onPlaybackStarted) {
          onPlaybackStarted();
        }
        
        if (onPlaybackStateChange) {
          onPlaybackStateChange(true);
        }
      });
      
      // Playback paused
      player.on('playbackPaused', () => {
        audioLoggers.dashPlayer.info('Playback paused');
        setIsPlaying(false);
        
        if (onPlaybackStateChange) {
          onPlaybackStateChange(false);
        }
      });
      
      // Handle autoplay restrictions
      player.on('playbackNotAllowed', () => {
        audioLoggers.dashPlayer.info('Playback not allowed due to autoplay restrictions, trying with muted audio');
        player.setMute(true);
        setIsMuted(true);
        
        // Add small delay before trying to play again
        setTimeout(() => {
          try {
            player.play();
          } catch (e) {
            audioLoggers.dashPlayer.warn('Could not autoplay even with muted audio:', e);
          }
        }, 100);
      });
      
      // Manifest loaded
      player.on('manifestLoaded', () => {
        audioLoggers.dashPlayer.info('Manifest loaded successfully');
      });
      
      // Playback error
      player.on('playbackError', (error: any) => {
        audioLoggers.dashPlayer.error('Playback error:', error);
        onError(`Playback error: ${error?.message || 'Unknown playback error'}`);
      });
      
      audioLoggers.dashPlayer.info('Event listeners set up successfully');
    } catch (err) {
      audioLoggers.dashPlayer.error('Error setting up event listeners:', err);
      onError('Error setting up event listeners');
    }
  }, [
    player, 
    onError, 
    setIsPlaying, 
    setShowCanvas, 
    setIsMuted, 
    onPlaybackStarted, 
    onPlaybackStateChange
  ]);

  // Set up event listeners when player changes
  useEffect(() => {
    if (player) {
      setupEventListeners();
    }
    
    // No cleanup needed as dash.js handles this internally when reset
  }, [player, setupEventListeners]);
} 