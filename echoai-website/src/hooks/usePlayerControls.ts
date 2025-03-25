import { useCallback } from 'react';
import { audioLoggers } from '../utils/LoggerFactory';

interface UsePlayerControlsProps {
  player: dashjs.MediaPlayerInstance | null;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  onPlaybackStarted?: () => void;
  setVolume: (volume: number) => void;
  setIsMuted: (isMuted: boolean) => void;
}

interface UsePlayerControlsReturn {
  handlePlayPause: () => void;
  handleVolumeChange: (values: number[]) => void;
  handleMuteToggle: () => void;
}

/**
 * Hook for player control functions (play/pause, volume, mute)
 */
export function usePlayerControls({
  player,
  isPlaying,
  volume,
  isMuted,
  onPlaybackStarted,
  setVolume,
  setIsMuted,
}: UsePlayerControlsProps): UsePlayerControlsReturn {
  // Handle play/pause
  const handlePlayPause = useCallback(() => {
    if (!player) return;
    
    if (isPlaying) {
      audioLoggers.dashPlayer.info('Pausing playback');
      player.pause();
    } else {
      audioLoggers.dashPlayer.info('Starting playback');
      // Try to play the audio
      try {
        const playPromise = player.play();
        
        // Handle play promise (modern browsers return a promise from play())
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              audioLoggers.dashPlayer.info('Playback started successfully');
              if (onPlaybackStarted) {
                onPlaybackStarted();
              }
            })
            .catch((error: Error) => {
              audioLoggers.dashPlayer.error('Error starting playback:', error);
              
              // Autoplay was prevented, try muted
              if (error.name === 'NotAllowedError') {
                audioLoggers.dashPlayer.info('Autoplay prevented, trying with muted audio');
                player?.setMute(true);
                setIsMuted(true);
                
                const mutePlayPromise = player?.play();
                if (mutePlayPromise && typeof mutePlayPromise.catch === 'function') {
                  mutePlayPromise.catch((e: Error) => {
                    audioLoggers.dashPlayer.error('Still could not play even when muted:', e);
                  });
                }
              }
            });
        }
      } catch (error) {
        audioLoggers.dashPlayer.error('Error calling play():', error);
      }
    }
  }, [isPlaying, player, onPlaybackStarted, setIsMuted]);
  
  // Handle volume change
  const handleVolumeChange = useCallback((values: number[]) => {
    if (!player) return;
    
    const newVolume = values[0] / 100;
    setVolume(newVolume);
    
    player.setVolume(newVolume);
    // If the volume is not zero, ensure the player is not muted
    if (newVolume > 0) {
      player.setMute(false);
      setIsMuted(false);
    } else {
      player.setMute(true);
      setIsMuted(true);
    }
  }, [player, setVolume, setIsMuted]);
  
  // Handle mute toggle
  const handleMuteToggle = useCallback(() => {
    if (!player) return;
    
    const newMutedState = !isMuted;
    player.setMute(newMutedState);
    setIsMuted(newMutedState);
    
    // Ensure volume is still set appropriately
    if (!newMutedState && volume === 0) {
      // If unmuting with zero volume, set to a reasonable default
      const defaultVolume = 0.5;
      setVolume(defaultVolume);
      player.setVolume(defaultVolume);
    }
  }, [player, isMuted, volume, setIsMuted, setVolume]);
  
  return {
    handlePlayPause,
    handleVolumeChange,
    handleMuteToggle
  };
} 