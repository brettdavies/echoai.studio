'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { useTranslation } from 'react-i18next';
import { Volume2, VolumeX } from 'lucide-react';
import DashAudioPlayerLogger from '../utils/DashAudioPlayerLogger';
import AudioProcessor from './AudioProcessor';
/// <reference path="../types/dashjs.d.ts" />

interface DashAudioPlayerProps {
  url: string;
  className?: string;
  onPlaybackStarted?: () => void;
  onPlaybackStateChange?: (isPlaying: boolean) => void;
}

const DashAudioPlayer: React.FC<DashAudioPlayerProps> = ({ 
  url = 'https://a.files.bbci.co.uk/ms6/live/3441A116-B12E-4D2F-ACA8-C1984642FA4B/audio/simulcast/dash/nonuk/pc_hd_abr_v2/cfsgc/bbc_world_service_news_internet.mpd',
  className = '',
  onPlaybackStarted,
  onPlaybackStateChange,
}) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<dashjs.MediaPlayerInstance | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const loggerRef = useRef<DashAudioPlayerLogger | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8); // Default volume to 80%
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);
  const [isMuted, setIsMuted] = useState(false); // Track muted state - default to not muted
  const intervalCleanupRef = useRef<(() => void) | null>(null); // Ref to store interval cleanup function
  const audioProcessorRef = useRef<any>(null);
  
  // Load dash.js from CDN
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Initialize logger
    if (!loggerRef.current) {
      loggerRef.current = new DashAudioPlayerLogger();
    }
    
    // Flag to track initialization within this effect
    let isInitializing = false;
    
    // Skip if already initialized or currently initializing
    if (initialized || playerRef.current || isInitializing) {
      console.log('Player already initialized or initializing, skipping setup');
      return;
    }
    
    isInitializing = true;
    
    const loadDashScript = () => {
      return new Promise<void>((resolve, reject) => {
        // Log status before loading script
        console.log('Attempting to load dash.js from CDN...');
        
        // Check if script already exists
        if (document.querySelector('script[src*="dash.all.min.js"]')) {
          // If script exists but dashjs is not defined, remove and reload
          if (!window.dashjs) {
            console.log('Found dash.js script tag but no dashjs object, reloading...');
            const oldScript = document.querySelector('script[src*="dash.all.min.js"]');
            if (oldScript) {
              oldScript.remove();
            }
          } else {
            console.log('dash.js already loaded and available in window object');
            resolve();
            return;
          }
        }

        const script = document.createElement('script');
        // Use the latest version from the CDN
        script.src = 'https://cdn.dashjs.org/latest/dash.all.min.js';
        script.async = true;
        console.log(`Loading dash.js from ${script.src}...`);
        
        script.onload = () => {
          console.log('Script loaded, checking for window.dashjs object...');
          // Add a safety check before resolving
          if (window.dashjs) {
            console.log('dash.js successfully loaded and available in window object');
            resolve();
          } else {
            console.warn('Script loaded but dashjs object not found in window');
            // If dashjs still not defined after script load, try global assignment
            const checkInterval = setInterval(() => {
              console.log('Checking for dashjs object...');
              if (window.dashjs) {
                console.log('dashjs object now available in window');
                clearInterval(checkInterval);
                resolve();
              }
            }, 100);
            
            // Give up after 2 seconds
            setTimeout(() => {
              clearInterval(checkInterval);
              console.error('Timed out waiting for dashjs object');
              reject(new Error('dash.js failed to initialize after script load'));
            }, 2000);
          }
        };
        script.onerror = () => {
          console.error('Failed to load dash.js script');
          reject(new Error('Failed to load dash.js script'));
        };
        document.head.appendChild(script);
      });
    };

    let isMounted = true;
    
    loadDashScript()
      .then(() => {
        if (!isMounted) return;
        console.log('dash.js loaded successfully');
        // Wait longer to ensure dash.js is properly initialized
        setTimeout(() => {
          if (!isMounted) return;
          // Double-check dashjs is available
          if (window.dashjs) {
            console.log('Initializing player with dash.js version:', window.dashjs.Version || 'unknown');
            initializeDashPlayer();
          } else {
            console.error('dash.js not found in window object');
            setError('Could not load the dash.js library properly');
          }
          isInitializing = false;
        }, 300); // Increased delay for initialization
      })
      .catch(err => {
        if (!isMounted) return;
        console.error('Error loading dash.js:', err);
        setError('Could not load the dash.js library. Please check your internet connection.');
        isInitializing = false;
      });

    // Cleanup when component unmounts
    return () => {
      isMounted = false;
      cleanupDashPlayer();
    };
  }, []);

  // Effect to update visualization when playback state changes
  useEffect(() => {
    if (isPlaying && analyserRef.current && audioContextRef.current) {
      // Make sure audio context is running when playing
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(console.warn);
      }
    }
  }, [isPlaying]);

  // Initialize dash.js player
  const initializeDashPlayer = () => {
    if (!videoRef.current || initialized || typeof window === 'undefined' || !window.dashjs) return;

    try {
      console.log('Initializing dash.js player...');
      
      // Set initialized flag early to prevent multiple initialization attempts
      setInitialized(true);
      
      // Clear previous player if it exists
      if (playerRef.current) {
        playerRef.current.reset();
        playerRef.current = null;
      }
      
      // Create a new player instance
      const player = window.dashjs.MediaPlayer().create();
      playerRef.current = player;
      
      // Check if running latest version (v5+) which has different APIs
      console.log('Player instance created successfully');
      
      // Configure player settings
      console.log('Configuring player settings...');
      
      try {
        // Latest version settings
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
        console.log('Player settings updated successfully');
      } catch (settingsError) {
        console.warn('Error updating settings, might be using older dash.js version:', settingsError);
        // Fallback for older versions if needed
      }

      console.log('Initializing player with video element and URL:', url);
      // Initialize player with video element and MPD URL
      // Set autoPlay to false
      player.initialize(videoRef.current, url, false);
      console.log('Player initialized successfully');
      
      try {
        // Set volume and mute
        player.setVolume(volume); // Set volume to 80%
        player.setMute(false); // Don't mute by default
        console.log('Volume and mute settings applied, player not muted');
      } catch (volumeError) {
        console.warn('Error setting volume/mute:', volumeError);
      }
      
      console.log('Setting up event listeners...');
      // Add event listeners - handle both latest and older dash.js versions
      try {
        // Set up event listeners for v5
        player.on('error', (error: any) => {
          console.error('Dash player error:', error);
          setError(`Dash.js error: ${error?.event?.message || 'Unknown error'}`);
        });
        
        // Add listener to log specs once stream is initialized
        player.on('streamInitialized', () => {
          console.log('Stream initialized successfully');
          
          // Log stream specifications using our logger utility
          if (loggerRef.current && playerRef.current) {
            // Wait a bit to ensure all data is loaded
            setTimeout(() => {
              try {
                // loggerRef.current?.logStreamSpecifications(
                //   playerRef.current!, 
                //   audioContextRef.current || undefined, 
                //   analyserRef.current || undefined
                // );
              } catch (error) {
                console.error('Error during stream specification logging:', error);
              }
            }, 1000);
          }
        });
        
        player.on('playbackStarted', () => {
          console.log('Playback started');
          
          // Start periodic logging using our logger utility
          if (loggerRef.current && playerRef.current && videoRef.current) {
            try {
              // Log stream specifications first
              // loggerRef.current.logStreamSpecifications(
              //   playerRef.current, 
              //   audioContextRef.current || undefined, 
              //   analyserRef.current || undefined
              // );
              
              // // Then start periodic logging
              // loggerRef.current.startLogging({
              //   player: playerRef.current,
              //   videoElement: videoRef.current,
              //   audioContext: audioContextRef.current || undefined,
              //   analyser: analyserRef.current || undefined,
              //   dataArray: dataArrayRef.current || undefined,
              //   isPlaying: true
              // });
            } catch (error) {
              console.error('Error starting stream logging:', error);
            }
          }
          
          setIsPlaying(true);
          setShowCanvas(true);
          if (onPlaybackStarted) {
            onPlaybackStarted();
          }
          if (onPlaybackStateChange) {
            onPlaybackStateChange(true);
          }
        });
        
        player.on('playbackPaused', () => {
          console.log('Playback paused');
          setIsPlaying(false);
          if (onPlaybackStateChange) {
            onPlaybackStateChange(false);
          }
        });

        // Handle autoplay restrictions
        player.on('playbackNotAllowed', () => {
          console.log('Playback not allowed due to autoplay restrictions, trying with muted audio');
          player.setMute(true);
          
          // Add small delay before trying to play again
          setTimeout(() => {
            try {
              player.play();
            } catch (e) {
              console.warn('Could not autoplay even with muted audio:', e);
            }
          }, 100);
        });
        
        // Add more event handlers for troubleshooting
        player.on('manifestLoaded', () => {
          console.log('Manifest loaded successfully');
        });
        
        player.on('playbackError', (error: any) => {
          console.error('Playback error:', error);
          setError(`Playback error: ${error?.message || 'Unknown playback error'}`);
        });
        
        console.log('Event listeners set up successfully');
        
        // Setup visualization
        setupAudioVisualization();
        
        console.log('dash.js player initialized successfully');
      } catch (err) {
        console.error('Error setting up event listeners:', err);
        setError('Error setting up event listeners');
      }
    } catch (err) {
      console.error('Error initializing DASH player:', err);
      setError(`Failed to initialize DASH player: ${err instanceof Error ? err.message : 'Unknown error'}`);
      // Reset initialized flag in case of error
      setInitialized(false);
    }
  };

  // Set up audio visualization
  const setupAudioVisualization = () => {
    // Initialize visualization for the audio
    setShowCanvas(true);
    
    try {
      // Check if audio context is supported
      if (typeof window === 'undefined' || !window.AudioContext && !(window as any).webkitAudioContext) {
        console.warn('DashAudioPlayer: AudioContext not supported in this browser');
        setupFakeVisualization();
        return;
      }
      
      const canvas = canvasRef.current;
      if (!canvas || !videoRef.current) {
        console.warn('DashAudioPlayer: Missing canvas or video element');
        setupFakeVisualization();
        return;
      }
      
      // Check if we already have a source node connected to this video element
      if (sourceNodeRef.current) {
        console.log('DashAudioPlayer: Audio visualization already set up, reusing existing connections');
        // Just make sure the visualization is running
        renderVisualization();
        return;
      }
      
      // Create audio context
      console.log('DashAudioPlayer: Creating new AudioContext');
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
      console.log('DashAudioPlayer: AudioContext created, state:', audioContextRef.current.state);
      
      // Create analyzer
      console.log('DashAudioPlayer: Creating AnalyserNode');
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      // Create buffer for frequency data
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
      
      // Connect video element to analyzer
      console.log('DashAudioPlayer: Creating MediaElementAudioSourceNode');
      sourceNodeRef.current = audioContextRef.current.createMediaElementSource(videoRef.current);
      
      // IMPORTANT: Create connections for audio flow with visualizer
      console.log('DashAudioPlayer: Setting up audio graph connections');
      
      // Wait for next frame to ensure stable connections
      setTimeout(() => {
        try {
          // Source -> Analyser -> Destination
          // This leaves the sourceNode free for the AudioProcessor to connect to
          console.log('DashAudioPlayer: Connecting source to analyser');
          sourceNodeRef.current?.connect(analyserRef.current!);
          console.log('DashAudioPlayer: Connecting analyser to destination');
          analyserRef.current?.connect(audioContextRef.current!.destination);
          console.log('DashAudioPlayer: Audio nodes connected successfully');
        } catch (error) {
          console.error('DashAudioPlayer: Error connecting audio nodes:', error);
        }
      }, 50);
      
      // Start visualization
      renderVisualization();
      
      console.log('DashAudioPlayer: Audio visualization set up with Web Audio API');
      
      // Try to resume the audio context after user interaction
      document.addEventListener('click', function resumeAudioContext() {
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          console.log('DashAudioPlayer: Attempting to resume AudioContext after user interaction');
          audioContextRef.current.resume().then(() => {
            console.log('DashAudioPlayer: AudioContext resumed by user interaction');
            document.removeEventListener('click', resumeAudioContext);
          });
        }
      }, { once: false });
      
    } catch (err) {
      console.warn('DashAudioPlayer: Error setting up Web Audio API visualization:', err);
      // Fall back to fake visualization
      setupFakeVisualization();
    }
  };
  
  // Set up fake visualization with random data as fallback
  const setupFakeVisualization = () => {
    console.log('Setting up fake visualization');
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;
    
    // Create a simple animation with random bars
    const dummyDataArray = new Array(64).fill(0);
    dataArrayRef.current = new Uint8Array(dummyDataArray.length);
    
    const updateDummyData = () => {
      if (!dataArrayRef.current) return;
      
      // Generate random values
      for (let i = 0; i < dataArrayRef.current.length; i++) {
        dataArrayRef.current[i] = (isPlaying ? Math.random() * 200 : Math.random() * 30);
      }
    };
    
    // Start the interval and store the ID
    const interval = window.setInterval(updateDummyData, 50);
    
    // Start visualization
    renderVisualization();
    
    // Store cleanup function for later
    intervalCleanupRef.current = () => {
      console.log('Cleaning up fake visualization interval');
      window.clearInterval(interval);
    };
  };

  // Render the audio visualization
  const renderVisualization = () => {
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
      if (!dataArray) return; // Add null check for dataArray
      
      // Clear the canvas
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Create a more modern gradient
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
        canvasCtx.roundRect(
          x, 
          canvas.height - barHeight, 
          barWidth, 
          barHeight,
          [3, 3, 0, 0] // Round top corners
        );
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
  };

  // Clean up resources
  const cleanupDashPlayer = () => {
    // Stop the logger
    if (loggerRef.current) {
      loggerRef.current.stopLogging();
    }
    
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
        console.warn('Error disconnecting source node:', e);
      }
      sourceNodeRef.current = null;
    }
    
    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect();
      } catch (e) {
        console.warn('Error disconnecting analyser node:', e);
      }
      analyserRef.current = null;
    }
    
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {
        console.warn('Error closing audio context:', e);
      }
      audioContextRef.current = null;
    }
    
    // Reset dash.js player
    if (playerRef.current) {
      try {
        playerRef.current.reset();
      } catch (e) {
        console.warn('Error resetting dash player:', e);
      }
      playerRef.current = null;
    }
    
    // Call the cleanup function for the fake visualization
    if (intervalCleanupRef.current) {
      intervalCleanupRef.current();
      intervalCleanupRef.current = null;
    }
    
    setInitialized(false);
    setShowCanvas(false);
  };

  // Handle play/pause
  const handlePlayPause = () => {
    if (!videoRef.current || !playerRef.current) return;
    
    if (isPlaying) {
      console.log('DashAudioPlayer: Pausing playback');
      playerRef.current.pause();
    } else {
      console.log('DashAudioPlayer: Starting playback');
      // Try to play the audio
      try {
        // Resume audio context if suspended
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          console.log('DashAudioPlayer: Resuming suspended audio context');
          audioContextRef.current.resume().then(() => {
            console.log('DashAudioPlayer: Audio context resumed successfully, state:', audioContextRef.current?.state);
          }).catch(err => {
            console.warn('DashAudioPlayer: Error resuming audio context:', err);
          });
        }
        
        console.log('DashAudioPlayer: Calling play() on player');
        const playPromise = playerRef.current.play();
        
        // Handle play promise (modern browsers return a promise from play())
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('DashAudioPlayer: Playback started successfully');
              if (onPlaybackStarted) {
                onPlaybackStarted();
              }
            })
            .catch((error: Error) => {
              console.error('DashAudioPlayer: Error starting playback:', error);
              
              // Autoplay was prevented, try muted
              if (error.name === 'NotAllowedError') {
                console.log('DashAudioPlayer: Autoplay prevented, trying with muted audio');
                playerRef.current?.setMute(true);
                setIsMuted(true);
                
                // Resume audio context again when trying muted
                if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                  audioContextRef.current.resume().catch(console.warn);
                }
                
                const mutePlayPromise = playerRef.current?.play();
                if (mutePlayPromise) {
                  mutePlayPromise.catch((e: Error) => {
                    console.error('DashAudioPlayer: Still could not play even when muted:', e);
                  });
                }
              }
            });
        }
      } catch (error) {
        console.error('DashAudioPlayer: Error calling play():', error);
      }
    }
  };

  // Handle volume change
  const handleVolumeChange = (values: number[]) => {
    const newVolume = values[0] / 100;
    setVolume(newVolume);
    
    if (playerRef.current) {
      playerRef.current.setVolume(newVolume);
      // If the volume is not zero, ensure the player is not muted
      if (newVolume > 0) {
        playerRef.current.setMute(false);
        setIsMuted(false);
      } else {
        playerRef.current.setMute(true);
        setIsMuted(true);
      }
    }
  };

  // Handle mute toggle
  const handleMuteToggle = () => {
    if (!playerRef.current) return;
    
    const newMutedState = !isMuted;
    playerRef.current.setMute(newMutedState);
    setIsMuted(newMutedState);
    
    // Ensure volume is still set appropriately
    if (!newMutedState && volume === 0) {
      // If unmuting with zero volume, set to a reasonable default
      const defaultVolume = 0.5;
      setVolume(defaultVolume);
      playerRef.current.setVolume(defaultVolume);
    }
  };

  // Handle retry
  const handleRetry = () => {
    setError(null);
    cleanupDashPlayer();
    setInitialized(false);
    
    // Reload dash.js script and reinitialize player
    const script = document.querySelector('script[src*="dash.all.min.js"]');
    if (script) {
      script.remove();
    }
    
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        const loadScript = document.createElement('script');
        loadScript.src = 'https://cdn.dashjs.org/latest/dash.all.min.js';
        loadScript.async = true;
        loadScript.onload = () => {
          console.log('dash.js reloaded successfully');
          // Give more time for initialization
          setTimeout(initializeDashPlayer, 300);
        };
        document.head.appendChild(loadScript);
      }
    }, 500);
  };

  if (error) {
    return (
      <div className={`w-full mx-auto rounded-lg bg-black/40 p-4 shadow-lg ${className}`}>
        <div className="text-center text-red-500 py-4">
          <p>{error}</p>
          <p className="mt-2 text-sm text-white/70">
            The MPD stream couldn't be played. Please try again.
          </p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRetry}
            className="mt-4 bg-slate-800 hover:bg-slate-700 text-white border-none"
          >
            Retry Connection
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full mx-auto rounded-lg bg-black/40 p-4 shadow-lg ${className}`}>
      {/* Use video element instead of audio for DASH - it works for both audio and video */}
      <video 
        ref={videoRef}
        className="hidden"
        playsInline
        onPlay={() => {
          setIsPlaying(true);
          if (onPlaybackStateChange) {
            onPlaybackStateChange(true);
          }
        }}
        onPause={() => {
          setIsPlaying(false);
          if (onPlaybackStateChange) {
            onPlaybackStateChange(false);
          }
        }}
        onEnded={() => {
          setIsPlaying(false);
          if (onPlaybackStateChange) {
            onPlaybackStateChange(false);
          }
        }}
        onError={(e) => {
          console.error('Video element error:', e);
          setError('Media playback error. Please try again.');
        }}
      />
      
      {/* Audio processor component */}
      {audioContextRef.current && videoRef.current && sourceNodeRef.current && (
        <AudioProcessor 
          audioContext={audioContextRef.current}
          mediaElement={videoRef.current}
          sourceNode={sourceNodeRef.current}
          isPlaying={isPlaying}
        />
      )}
      
      <div className="mb-4 bg-black/30 rounded-md overflow-hidden">
        <canvas 
          ref={canvasRef} 
          width={600} 
          height={80}
          className={`w-full h-20 ${showCanvas ? 'opacity-100' : 'opacity-0'}`}
        />
        {!showCanvas && (
          <div className="w-full h-20 flex items-center justify-center">
            <div className="animate-pulse text-white/50 text-xs">
              {t('audioPlayer.loading')}
            </div>
          </div>
        )}
      </div>
      
      <div className="flex flex-col space-y-4">
        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handlePlayPause}
              className="bg-slate-800 hover:bg-slate-700 text-white border-none"
            >
              {isPlaying ? t('audioPlayer.pause') : t('audioPlayer.play')}
            </Button>
            <span className="text-xs bg-red-700 text-white px-2 py-0.5 rounded-full">LIVE</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMuteToggle}
              className="text-white p-1"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <span className="text-xs text-white/70">{t('audioPlayer.volume')}</span>
            <Slider 
              value={[volume * 100]} 
              max={100}
              step={1}
              onValueChange={handleVolumeChange}
              className="w-24"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashAudioPlayer; 