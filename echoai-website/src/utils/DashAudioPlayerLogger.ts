/**
 * DashAudioPlayerLogger
 * 
 * A utility for logging detailed information about dash.js audio streams
 * This centralizes all logging functionality from the DashAudioPlayer component
 */

import { logger, LogLevel, LogCategory } from './Logger';

// Create a dedicated category for the dash player
const DASH_LOG_CATEGORY = LogCategory.AUDIO;

export interface LoggingContext {
  player: dashjs.MediaPlayerInstance;
  videoElement: HTMLVideoElement;
  audioContext?: AudioContext;
  analyser?: AnalyserNode;
  dataArray?: Uint8Array;
  isPlaying: boolean;
}

export class DashAudioPlayerLogger {
  private intervalId: number | null = null;
  private logInterval: number = 2000; // Log every 2 seconds by default
  private segmentIdentifiers: Set<string> = new Set(); // Store unique segment identifiers
  private lastPlayingState: boolean = false;
  private lastSegmentNumber: string | null = null;
  private logLevel: LogLevel = LogLevel.INFO;

  constructor(private loggingInterval: number = 2000) {
    this.logInterval = loggingInterval;
    
    // Set a specific service ID for this logger
    logger.setServiceId('DashPlayer');
  }

  /**
   * Set the log level for dash player logging
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Start periodic logging of stream information
   */
  startLogging(context: LoggingContext, onSegmentIdentified?: (id: string) => void): void {
    // Clean up any existing interval
    this.stopLogging();
    
    this.log(LogLevel.INFO, 'Starting periodic stream data logger');
    this.lastPlayingState = context.isPlaying;
    
    // Store interval ID for cleanup
    this.intervalId = window.setInterval(() => {
      // Check if the playing state has changed
      if (this.lastPlayingState !== context.isPlaying) {
        this.lastPlayingState = context.isPlaying;
        if (!context.isPlaying) {
          this.log(LogLevel.INFO, 'Pausing logging while playback is paused');
          return; // Exit early to prevent logging when paused
        } else {
          this.log(LogLevel.INFO, 'Resuming logging as playback has started');
        }
      }

      // Only log if player exists AND is playing
      if (!context.player || !context.isPlaying) {
        return;
      }
      
      try {
        this.log(LogLevel.DEBUG, 'Detailed Audio Stream Data');
        
        // Log basic timing information
        try {
          this.logTimingInfo(context);
        } catch (error) {
          this.log(LogLevel.WARN, 'Error logging timing info', error);
        }
        
        // Log fragment information
        let segmentId = null;
        try {
          segmentId = this.logFragmentInfo(context);
          
          // If we found a segment identifier, notify callback
          if (segmentId && !this.segmentIdentifiers.has(segmentId) && onSegmentIdentified) {
            this.segmentIdentifiers.add(segmentId);
            onSegmentIdentified(segmentId);
          }
        } catch (error) {
          this.log(LogLevel.WARN, 'Error logging fragment info', error);
        }
        
        // Log audio processing data
        try {
          this.logAudioProcessingData(context);
        } catch (error) {
          this.log(LogLevel.WARN, 'Error logging audio processing data', error);
        }
      } catch (error) {
        this.log(LogLevel.WARN, 'Error in logging cycle', error);
      }
    }, this.logInterval);
  }

  /**
   * Stop logging and clean up resources
   */
  stopLogging(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
      this.log(LogLevel.INFO, 'Stopping stream data logger');
    }
  }

  /**
   * Log one-time technical specifications of the stream
   */
  logStreamSpecifications(player: dashjs.MediaPlayerInstance, audioContext?: AudioContext, analyser?: AnalyserNode): void {
    try {
      this.log(LogLevel.INFO, 'DASH Stream Technical Specifications');
      
      // Get active audio track
      const activeAudioTrack = player.getCurrentTrackFor('audio');
      if (activeAudioTrack) {
        this.log(LogLevel.INFO, 'Active Audio Track', activeAudioTrack);
        this.log(LogLevel.INFO, 'Codec', { codec: activeAudioTrack.codec });
        this.log(LogLevel.INFO, 'Language', { lang: activeAudioTrack.lang || 'default' });
        
        // Get mediaInfo which contains detailed audio specs
        const mediaInfo = activeAudioTrack.mediaInfo;
        if (mediaInfo) {
          this.log(LogLevel.INFO, 'Audio Specifications', {
            sampleRate: mediaInfo.sampleRate || 'unknown',
            channels: mediaInfo.channelsCount || 'unknown',
            type: mediaInfo.type,
            mimeType: mediaInfo.mimeType
          });
          
          // Log bitrate safely - first try from mediaInfo
          try {
            if (mediaInfo.bitrateList && mediaInfo.bitrateList.length > 0) {
              this.log(LogLevel.INFO, 'Bitrate', { 
                bitrates: mediaInfo.bitrateList.map(b => b.bandwidth || b.bitrate).join(', ') || 'unknown' 
              });
            } else {
              this.log(LogLevel.INFO, 'Bitrate: No bitrate list available in mediaInfo');
            }
          } catch (e) {
            this.log(LogLevel.WARN, 'Error accessing bitrate information', e);
          }
          
          // Log resampling requirements for WebSocket implementation
          if (mediaInfo.sampleRate) {
            const originalSampleRate = mediaInfo.sampleRate;
            const targetSampleRate = 16000; // 16kHz for our WebSocket server
            this.log(LogLevel.INFO, 'Resampling Requirements', {
              required: originalSampleRate !== targetSampleRate,
              ratio: targetSampleRate / originalSampleRate,
              cpuLoad: originalSampleRate > targetSampleRate ? 'Low (downsampling)' : 'High (upsampling)'
            });
          }
          
          // Log channel mixing requirements
          if (mediaInfo.channelsCount && mediaInfo.channelsCount > 1) {
            this.log(LogLevel.INFO, 'Channel Mixing Required: Yes (need to convert to mono)');
          } else {
            this.log(LogLevel.INFO, 'Channel Mixing Required: No (already mono)');
          }
        }
      } else {
        this.log(LogLevel.INFO, 'No active audio track found');
      }
      
      // Try to get quality info safely
      try {
        // First check if the function exists
        if (typeof player.getBitrateInfoListFor === 'function') {
          const audioQualities = player.getBitrateInfoListFor('audio');
          if (audioQualities && audioQualities.length) {
            this.log(LogLevel.INFO, 'Available Audio Qualities', audioQualities);
          }
        } else {
          this.log(LogLevel.INFO, 'getBitrateInfoListFor method not available');
          
          // Try alternative ways to get bitrate info
          if (activeAudioTrack && activeAudioTrack.mediaInfo && activeAudioTrack.mediaInfo.bitrateList) {
            this.log(LogLevel.INFO, 'Available Audio Qualities (from mediaInfo)', 
              activeAudioTrack.mediaInfo.bitrateList);
          }
        }
      } catch (e) {
        this.log(LogLevel.WARN, 'Error getting bitrate information', e);
      }
      
      // Get buffer info safely
      try {
        if (typeof player.getBufferLength === 'function') {
          const bufferLength = player.getBufferLength('audio');
          this.log(LogLevel.INFO, 'Audio Buffer Information', {
            length: bufferLength,
            recommendedWsBufferSize: Math.min(bufferLength * 1000 / 3, 500),
            estimatedNetworkDelayTolerance: Math.min(bufferLength * 1000 / 2, 1000)
          });
        } else {
          this.log(LogLevel.INFO, 'getBufferLength method not available');
        }
      } catch (e) {
        this.log(LogLevel.WARN, 'Error getting buffer information', e);
      }
      
      // Get stream info (if available)
      try {
        if (typeof player.getDashMetrics === 'function') {
          const dashMetrics = player.getDashMetrics();
          if (dashMetrics) {
            // Try multiple ways to get adaptation info
            try {
              // Method 1: Use getCurrentAdaptationFor if available
              if (typeof dashMetrics.getCurrentAdaptationFor === 'function') {
                const adaptationSet = dashMetrics.getCurrentAdaptationFor('audio');
                if (adaptationSet) {
                  this.log(LogLevel.INFO, 'Adaptation Set', adaptationSet);
                }
              } else {
                this.log(LogLevel.INFO, 'getCurrentAdaptationFor method not available');
                
                // Method 2: Try to access via activeAudioTrack's adaptation
                if (activeAudioTrack && activeAudioTrack.adaptation) {
                  this.log(LogLevel.INFO, 'Adaptation Set (from track)', activeAudioTrack.adaptation);
                }
                
                // Method 3: Try to access from mediaInfo 
                if (activeAudioTrack && activeAudioTrack.mediaInfo && activeAudioTrack.mediaInfo.adaptation) {
                  this.log(LogLevel.INFO, 'Adaptation Set (from mediaInfo)', 
                    activeAudioTrack.mediaInfo.adaptation);
                }
              }
            } catch (e) {
              this.log(LogLevel.WARN, 'Error getting adaptation set', e);
            }
            
            // Log latency metrics if it's a live stream
            try {
              if (typeof player.isDynamic === 'function' && player.isDynamic()) {
                this.log(LogLevel.INFO, 'Live Stream Detected');
                
                let liveLatency: number | string = 'unknown';
                try {
                  if (typeof player.getCurrentLiveLatency === 'function') {
                    liveLatency = player.getCurrentLiveLatency();
                    this.log(LogLevel.INFO, 'Live Latency', { value: liveLatency });
                  }
                } catch (e) {
                  this.log(LogLevel.WARN, 'Error getting live latency', e);
                }
                
                try {
                  if (typeof player.getTargetLiveLatency === 'function') {
                    const targetLatency = player.getTargetLiveLatency();
                    this.log(LogLevel.INFO, 'Target Latency', { value: targetLatency });
                  }
                } catch (e) {
                  this.log(LogLevel.WARN, 'Error getting target latency', e);
                }
                
                // Add WebSocket relevant live stream metrics
                if (typeof liveLatency === 'number') {
                  this.log(LogLevel.INFO, 'WebSocket Relevant Metrics', {
                    maxAcceptableAdditionalLatency: Math.min(liveLatency * 500, 1000),
                    recommendedProcessingChunkSize: Math.min(liveLatency * 200, 500)
                  });
                }
              }
            } catch (e) {
              this.log(LogLevel.WARN, 'Error processing live stream metrics', e);
            }
          }
        }
      } catch (e) {
        this.log(LogLevel.WARN, 'Error getting dash metrics', e);
      }
      
      // Get audio context information
      if (audioContext) {
        this.log(LogLevel.INFO, 'Audio Context Information', {
          sampleRate: audioContext.sampleRate,
          state: audioContext.state,
          pcmValueType: 'Float32 (-1.0 to 1.0)',
          conversionNeeded: 'Yes (multiply by 32767 for 16-bit PCM)'
        });
        
        if (audioContext.sampleRate) {
          this.log(LogLevel.INFO, 'Resampling Method Options', {
            options: [
              'Web Audio API (limited browser support)',
              'JavaScript implementation (higher CPU usage)',
              'WebAssembly implementation (recommended)'
            ]
          });
        }
      }
      
      // Log audio node connections if available
      if (analyser) {
        this.log(LogLevel.INFO, 'Analyser Configuration', {
          fftSize: analyser.fftSize,
          frequencyBinCount: analyser.frequencyBinCount,
          potentialAudioWorkletSlot: analyser ? 
            'After sourceNode, before analyser' : 'Direct connection to destination'
        });
      }
      
      // Show estimation of WebSocket implementation difficulty
      const mediaInfo = activeAudioTrack?.mediaInfo;
      if (mediaInfo) {
        const originalSampleRate = mediaInfo.sampleRate || 0;
        const channelCount = mediaInfo.channelsCount || 0;
        
        let complexity = 'Medium';
        let bottlenecks = [];
        
        if (originalSampleRate > 0 && originalSampleRate !== 16000) {
          bottlenecks.push('Sample rate conversion');
          if (Math.abs(originalSampleRate / 16000 - 1) > 0.5) {
            complexity = 'High';
          }
        }
        
        if (channelCount > 1) {
          bottlenecks.push('Stereo to mono conversion');
        }
        
        try {
          if (typeof player.isDynamic === 'function' && player.isDynamic()) {
            bottlenecks.push('Live stream handling');
            complexity = 'High';
          }
        } catch (e) {
          this.log(LogLevel.WARN, 'Error checking if stream is dynamic', e);
        }
        
        this.log(LogLevel.INFO, 'WebSocket Implementation Complexity Assessment', {
          overallComplexity: complexity,
          potentialBottlenecks: bottlenecks.length ? bottlenecks.join(', ') : 'None identified'
        });
      } else {
        this.log(LogLevel.INFO, 'Unable to assess complexity (insufficient information)');
      }
    } catch (error) {
      this.log(LogLevel.WARN, 'Error logging stream specs', error);
    }
  }

  /**
   * Log timing information from player and video element
   */
  private logTimingInfo(context: LoggingContext): void {
    const { player, videoElement } = context;
    if (!videoElement) return;
    
    const currentTime = player.time();
    
    this.log(LogLevel.DEBUG, 'Timing Information', {
      playerTime: currentTime,
      currentTime: videoElement.currentTime,
      timestamp: new Date(videoElement.currentTime * 1000).toISOString().substr(11, 12)
    });
  }

  /**
   * Log fragment information and extract raw identifiers without creating any universal IDs
   * Returns a segment identifier if one can be found directly from the stream
   */
  private logFragmentInfo(context: LoggingContext): string | null {
    const { player, videoElement } = context;
    if (!videoElement) return null;
    
    this.log(LogLevel.DEBUG, 'Fragment Information');
    
    // Get buffer information safely
    let bufferLevel;
    try {
      if (typeof player.getBufferLength === 'function') {
        bufferLevel = player.getBufferLength('audio');
        this.log(LogLevel.DEBUG, 'Buffer Level', { seconds: bufferLevel });
      } else {
        this.log(LogLevel.DEBUG, 'getBufferLength method not available');
      }
    } catch (e) {
      this.log(LogLevel.WARN, 'Error getting buffer level', e);
    }
    
    // Track a segment ID if we can find one directly
    let segmentId: string | null = null;
    
    // Try different methods to get segment information
    let dashMetrics;
    try {
      if (typeof player.getDashMetrics === 'function') {
        dashMetrics = player.getDashMetrics();
      } else {
        this.log(LogLevel.DEBUG, 'getDashMetrics method not available');
      }
    } catch (e) {
      this.log(LogLevel.WARN, 'Error getting dash metrics', e);
    }
    
    if (dashMetrics) {
      // First try to get current buffer info and track info
      try {
        this.log(LogLevel.DEBUG, 'Current Track Info');
        
        // Log active audio track
        if (typeof player.getCurrentTrackFor === 'function') {
          const activeAudioTrack = player.getCurrentTrackFor('audio');
          if (activeAudioTrack) {
            this.log(LogLevel.DEBUG, 'Active Audio Track ID', activeAudioTrack.id);
            this.log(LogLevel.DEBUG, 'Active Audio Codec', activeAudioTrack.codec);
            
            if (activeAudioTrack.mediaInfo) {
              this.log(LogLevel.DEBUG, 'Audio Bitrate(s)', { 
                bitrates: activeAudioTrack.mediaInfo.bitrateList?.map(b => b.bitrate || b.bandwidth).join(', ') 
              });
              this.log(LogLevel.DEBUG, 'Audio Channels', activeAudioTrack.mediaInfo.channelsCount);
              this.log(LogLevel.DEBUG, 'Audio Sample Rate', activeAudioTrack.mediaInfo.sampleRate);
            }
          }
        }
      } catch (e) {
        this.log(LogLevel.WARN, 'Error getting track info', e);
      }
      
      // Try to log HTTP trace data directly from dashjs
      try {
        this.logHttpTraceData(dashMetrics);
      } catch (e) {
        this.log(LogLevel.WARN, 'Error logging HTTP trace data', e);
      }
      
      // Now focus on getting latest fragment request which contains response with URL and headers
      try {
        this.log(LogLevel.DEBUG, 'Segment Data');
        
        // Try dashjs v5+ API method first
        let latestFragmentRequest = null;
        let segmentUrl = null;
        let responseHeaders = null;
        
        // Method 1: Try to get latest fragment request
        if (typeof dashMetrics.getLatestFragmentRequestForQuality === 'function') {
          try {
            // Try with quality index 0 first
            latestFragmentRequest = dashMetrics.getLatestFragmentRequestForQuality('audio', 0);
            
            // If not found, try to get current quality index
            if (!latestFragmentRequest && typeof dashMetrics.getCurrentIndex === 'function') {
              const qualityIndex = dashMetrics.getCurrentIndex('audio');
              if (qualityIndex !== undefined) {
                latestFragmentRequest = dashMetrics.getLatestFragmentRequestForQuality('audio', qualityIndex);
              }
            }
            
            if (latestFragmentRequest) {
              this.log(LogLevel.DEBUG, 'Latest Fragment Request (Raw)', latestFragmentRequest);
              
              // Check for response property
              if (latestFragmentRequest.response) {
                const response = latestFragmentRequest.response;
                this.log(LogLevel.DEBUG, 'Response Object Found (Raw)', response);
                
                // Extract response headers if available
                if (response.responseHeaders || response.headers) {
                  responseHeaders = response.responseHeaders || response.headers;
                  this.log(LogLevel.DEBUG, 'Response Headers (Raw)', responseHeaders);
                  
                  // Parse and log specific important headers
                  this.logResponseHeaders(responseHeaders);
                }
                
                if (response.url) {
                  segmentUrl = response.url;
                }
              }
              
              // Fallback to request URL if response URL not available
              if (!segmentUrl && latestFragmentRequest.url) {
                segmentUrl = latestFragmentRequest.url;
              }
            }
          } catch (e) {
            this.log(LogLevel.WARN, 'Error getting latest fragment request', e);
          }
        }
        
        // Method 2: Try getCurrentRequest as a fallback
        if (!segmentUrl && typeof dashMetrics.getCurrentRequest === 'function') {
          try {
            const currentRequest = dashMetrics.getCurrentRequest('audio');
            if (currentRequest) {
              this.log(LogLevel.DEBUG, 'Current Request (Raw)', currentRequest);
              
              // Check for response property
              if (currentRequest.response) {
                const response = currentRequest.response;
                this.log(LogLevel.DEBUG, 'Response Object Found (Raw)', response);
                
                // Extract response headers if available
                if (response.responseHeaders || response.headers) {
                  responseHeaders = response.responseHeaders || response.headers;
                  this.log(LogLevel.DEBUG, 'Response Headers (Raw)', responseHeaders);
                  
                  // Parse and log specific important headers
                  this.logResponseHeaders(responseHeaders);
                }
                
                if (response.url) {
                  segmentUrl = response.url;
                }
              }
              
              // Fallback to request URL if response URL not available
              if (!segmentUrl && currentRequest.url) {
                segmentUrl = currentRequest.url;
              }
            }
          } catch (e) {
            this.log(LogLevel.WARN, 'Error getting current request', e);
          }
        }
        
        // Process the segment URL if we found one
        if (segmentUrl) {
          this.log(LogLevel.DEBUG, 'Segment URL (Raw)', segmentUrl);
          
          // Extract filename from URL
          const urlParts = segmentUrl.split('/');
          const filename = urlParts[urlParts.length - 1];
          this.log(LogLevel.DEBUG, 'Segment Filename (Raw)', filename);
          
          // Parse BBC stream segment filename pattern
          // Example: bbc_world_service_news_internet-audio=96000-272306193.m4s
          if (filename.includes('-audio=')) {
            try {
              this.log(LogLevel.DEBUG, 'BBC Segment Analysis');
              const parts = filename.split('-audio=');
              const streamName = parts[0];
              this.log(LogLevel.DEBUG, 'Stream Name', streamName);
              
              // Extract bitrate and segment number
              if (parts[1]) {
                const bitrateAndSegment = parts[1].split('-');
                if (bitrateAndSegment.length >= 2) {
                  const bitrate = bitrateAndSegment[0];
                  this.log(LogLevel.DEBUG, 'Audio Bitrate', bitrate);
                  
                  // Extract segment ID (removing .m4s extension)
                  const segmentNumber = bitrateAndSegment[1].replace('.m4s', '');
                  this.log(LogLevel.DEBUG, 'Segment Number', segmentNumber);
                  
                  // Check if this is a new segment number
                  if (this.lastSegmentNumber !== segmentNumber) {
                    if (this.lastSegmentNumber !== null) {
                      const diff = parseInt(segmentNumber) - parseInt(this.lastSegmentNumber);
                      this.log(LogLevel.DEBUG, 'Segment Increment', { diff: diff, from: this.lastSegmentNumber, to: segmentNumber });
                    }
                    this.lastSegmentNumber = segmentNumber;
                  }
                  
                  // Use full filename as segment identifier for callback
                  segmentId = filename;
                  
                  // Additional info that might be useful
                  this.log(LogLevel.DEBUG, 'File Type', 'MPEG-4 Audio Segment (.m4s)');
                  this.log(LogLevel.DEBUG, 'Is Initialization Segment', filename.includes('.dash'));
                }
              }
            } catch (e) {
              this.log(LogLevel.WARN, 'Error parsing BBC segment filename', e);
            }
          }
        } else {
          this.log(LogLevel.DEBUG, 'No segment URL found');
        }
      } catch (e) {
        this.log(LogLevel.WARN, 'Error analyzing segment data', e);
      }
    } else {
      this.log(LogLevel.DEBUG, 'No dash metrics available for segment information');
    }
    
    // For live streams, log the available time range
    try {
      if (typeof player.isDynamic === 'function' && player.isDynamic() && 
          videoElement.buffered && videoElement.buffered.length) {
        this.log(LogLevel.DEBUG, 'Buffered Ranges (Raw)', 
          Array.from({length: videoElement.buffered.length}, (_, i) => ({
            start: videoElement.buffered.start(i),
            end: videoElement.buffered.end(i)
          }))
        );
      }
    } catch (e) {
      this.log(LogLevel.WARN, 'Error logging buffered ranges', e);
    }
    
    // Log current playback time as a reference
    this.log(LogLevel.DEBUG, 'Current Playback Time (Raw)', { time: videoElement.currentTime });
    
    return segmentId;
  }

  /**
   * Direct method to log HTTP trace data from dash.js metrics 
   * This is to ensure we get all possible headers and network information
   */
  private logHttpTraceData(dashMetrics: dashjs.DashMetrics): void {
    this.log(LogLevel.DEBUG, 'HTTP Trace Data');
    
    try {
      // Try to get all HTTP request traces
      // Note: Different versions of dash.js have different APIs, so we'll try multiple approaches
      
      // Method 1: Try to use httpRequests method (newer versions)
      let httpRequests: any[] = [];
      let httpRequestsFound = false;
      
      // Try different methods to access HTTP requests in dash.js
      if (typeof (dashMetrics as any).getHttpRequests === 'function') {
        httpRequests = (dashMetrics as any).getHttpRequests() || [];
        this.log(LogLevel.DEBUG, 'HTTP Requests found (getHttpRequests method)', { count: httpRequests.length });
        httpRequestsFound = httpRequests.length > 0;
      } 
      // Method 2: Try httpList (older versions)
      else if ((dashMetrics as any).httpList) {
        httpRequests = (dashMetrics as any).httpList || [];
        this.log(LogLevel.DEBUG, 'HTTP Requests found (httpList property)', { count: httpRequests.length });
        httpRequestsFound = httpRequests.length > 0;
      }
      
      // Method 3: Access metrics directly from the player
      if (!httpRequestsFound) {
        try {
          // Try to access internal player metrics (undocumented)
          const internalPlayer = (dashMetrics as any).player || (dashMetrics as any).context?.player;
          
          if (internalPlayer) {
            if (internalPlayer.debug && internalPlayer.debug.metrics && internalPlayer.debug.metrics.http) {
              httpRequests = internalPlayer.debug.metrics.http.list || [];
              this.log(LogLevel.DEBUG, 'HTTP Requests found (player debug metrics)', { count: httpRequests.length });
              httpRequestsFound = httpRequests.length > 0;
            } else if (internalPlayer.metrics && internalPlayer.metrics.http) {
              httpRequests = internalPlayer.metrics.http.list || [];
              this.log(LogLevel.DEBUG, 'HTTP Requests found (player metrics)', { count: httpRequests.length });
              httpRequestsFound = httpRequests.length > 0;
            }
          }
        } catch (e) {
          this.log(LogLevel.WARN, 'Error accessing player metrics', e);
        }
      }
      
      // Method 4: Try to access the fragment model directly
      if (!httpRequestsFound) {
        try {
          // Try to access the fragment model which contains requests
          const streamProcessor = (dashMetrics as any).streamProcessor || 
                                (dashMetrics as any).context?.streamProcessor;
                                
          if (streamProcessor && streamProcessor.fragmentModel) {
            const fragmentModel = streamProcessor.fragmentModel;
            const requests = fragmentModel.getRequests() || [];
            this.log(LogLevel.DEBUG, 'Requests found in fragment model', { count: requests.length });
            httpRequests = requests;
            httpRequestsFound = requests.length > 0;
          }
        } catch (e) {
          this.log(LogLevel.WARN, 'Error accessing fragment model', e);
        }
      }
      
      // Method 5: Try to use an alternative API (Version 3.x+)
      if (!httpRequestsFound) {
        try {
          // In dash.js v3.x, metrics are accessed differently
          if (typeof (dashMetrics as any).getRequestsQueue === 'function') {
            httpRequests = (dashMetrics as any).getRequestsQueue() || [];
            this.log(LogLevel.DEBUG, 'Requests found in request queue', { count: httpRequests.length });
            httpRequestsFound = httpRequests.length > 0;
          }
        } catch (e) {
          this.log(LogLevel.WARN, 'Error accessing request queue', e);
        }
      }
      
      // Direct browser observation: Check for network requests from the browser
      if (!httpRequestsFound) {
        try {
          // This is a last resort - manually check for recent audio segment requests
          this.log(LogLevel.DEBUG, 'Trying direct observation of active network requests...');
          
          // Check if Performance API is available
          if (typeof window !== 'undefined' && window.performance && window.performance.getEntries) {
            const resourceEntries = window.performance.getEntries().filter(
              entry => entry.name.includes('.m4s') && entry.name.includes('audio')
            );
            
            if (resourceEntries.length > 0) {
              this.log(LogLevel.DEBUG, 'Found audio segment entries via Performance API', { count: resourceEntries.length });
              
              // Log the most recent entry
              const latestEntry = resourceEntries[resourceEntries.length - 1];
              this.log(LogLevel.DEBUG, 'Latest audio segment request', latestEntry.name);
              
              // Unfortunately, we can't access the headers this way
              this.log(LogLevel.DEBUG, 'Network metrics (but no headers available this way)', {
                duration: latestEntry.duration,
                startTime: latestEntry.startTime,
                entryType: latestEntry.entryType
              });
            } else {
              this.log(LogLevel.DEBUG, 'No audio segment entries found via Performance API');
            }
          }
        } catch (e) {
          this.log(LogLevel.WARN, 'Error using Performance API', e);
        }
      }
      
      if (httpRequests.length > 0) {
        // Find the most recent segment request (we're interested in .m4s files for audio)
        const segmentRequests = httpRequests
          .filter(req => 
            req && req.url && 
            (req.url.includes('.m4s') || req.url.includes('.dash')) && 
            req.url.includes('audio')
          )
          .sort((a, b) => {
            // Sort by trace id (if available) or some other chronological field
            if (a._tfinish && b._tfinish) {
              return b._tfinish - a._tfinish; // Most recent first
            }
            if (a.treceived && b.treceived) {
              return b.treceived - a.treceived;
            }
            if (a.requestEndDate && b.requestEndDate) {
              return b.requestEndDate.getTime() - a.requestEndDate.getTime();
            }
            return 0;
          });
          
        if (segmentRequests.length > 0) {
          this.log(LogLevel.DEBUG, `Found ${segmentRequests.length} segment requests, showing most recent`);
          
          // Log the most recent segment request (first in sorted array)
          const latestRequest = segmentRequests[0];
          this.log(LogLevel.DEBUG, 'Latest Segment Request URL', latestRequest.url);
            
          // Look for headers in various possible locations according to dash.js versions
          let requestHeaders = null;
          if (latestRequest.requestHeaders) {
            requestHeaders = latestRequest.requestHeaders;
          } else if (latestRequest.headers && latestRequest.headers.request) {
            requestHeaders = latestRequest.headers.request;
          } else if (latestRequest.request && latestRequest.request.headers) {
            requestHeaders = latestRequest.request.headers;
          }
            
          if (requestHeaders) {
            this.log(LogLevel.DEBUG, 'Request Headers (Raw)', requestHeaders);
          } else {
            this.log(LogLevel.DEBUG, 'No request headers found in the request object');
          }
            
          // Look for response headers in all possible locations
          let responseHeaders = null;
          if (latestRequest.responseHeaders) {
            responseHeaders = latestRequest.responseHeaders;
          } else if (latestRequest.headers && latestRequest.headers.response) {
            responseHeaders = latestRequest.headers.response;
          } else if (latestRequest.response && latestRequest.response.responseHeaders) {
            responseHeaders = latestRequest.response.responseHeaders;
          } else if (latestRequest.response && latestRequest.response.headers) {
            responseHeaders = latestRequest.response.headers;
          } else if (latestRequest.getAllResponseHeaders && typeof latestRequest.getAllResponseHeaders === 'function') {
            // For XMLHttpRequest-based implementations
            responseHeaders = latestRequest.getAllResponseHeaders();
          }
            
          if (responseHeaders) {
            this.log(LogLevel.DEBUG, 'Response Headers (Raw)', responseHeaders);
            
            // Parse the headers and log interesting ones
            this.logResponseHeaders(responseHeaders);
          } else {
            this.log(LogLevel.DEBUG, 'No response headers found in the request object');
            
            // Log other properties that might contain header information
            this.log(LogLevel.DEBUG, 'Properties of the request object that might contain headers', 
              Object.keys(latestRequest).filter(key => 
                key.toLowerCase().includes('header') || 
                key.toLowerCase().includes('response') ||
                key.toLowerCase().includes('http')
              ).map(key => ({ [key]: latestRequest[key] }))
            );
          }
          
          // Try to find the ETag specifically
          if (responseHeaders) {
            const etag = this.findHeader(
              typeof responseHeaders === 'string' 
                ? this.parseHeaderString(responseHeaders) 
                : responseHeaders, 
              'ETag'
            );
            
            if (etag) {
              this.log(LogLevel.DEBUG, 'ETag Found', etag);
            }
          }
          
          // Log the trace information
          this.log(LogLevel.DEBUG, 'Trace Metrics', {
            requestType: latestRequest.type,
            httpStatus: latestRequest._status || latestRequest.status,
            requestTime: latestRequest._trequest,
            responseTime: latestRequest._tresponse,
            totalRequestDuration: (latestRequest._tfinish - latestRequest._trequest) * 1000
          });
        } else {
          this.log(LogLevel.DEBUG, 'No segment requests found in the HTTP requests');
        }
      } else {
        this.log(LogLevel.DEBUG, 'No HTTP requests found in dash metrics');
      }
    } catch (e) {
      this.log(LogLevel.WARN, 'Error processing HTTP trace data', e);
    }
  }

  /**
   * Parse and log HTTP response headers from the segment response
   */
  private logResponseHeaders(headers: string | Record<string, string>): void {
    this.log(LogLevel.DEBUG, 'Response Headers Analysis');
    
    // Headers might be in different formats depending on the dash.js version
    try {
      let headerMap: Record<string, string> = {};
      
      // If headers is a string, parse it
      if (typeof headers === 'string') {
        headerMap = this.parseHeaderString(headers);
      } else if (headers && typeof headers === 'object') {
        // If headers is already an object, use it directly
        headerMap = headers;
      }
      
      // Log important headers specifically
      const importantHeaders = [
        'Content-Type', 
        'Content-Length', 
        'Date', 
        'ETag', 
        'Last-Modified', 
        'Link', 
        'X-USP-Info1', 
        'Cache-Control',
        'Sunset',
        'Accept-Ranges',
        'Access-Control-Allow-Origin',
        'Access-Control-Expose-Headers',
        'X-Cache'
      ];
      
      const keyHeaders: Record<string, string> = {};
      importantHeaders.forEach(header => {
        const normalizedKey = Object.keys(headerMap).find(
          key => key.toLowerCase() === header.toLowerCase()
        );
        
        if (normalizedKey && headerMap[normalizedKey]) {
          keyHeaders[header] = headerMap[normalizedKey];
        }
      });
      
      this.log(LogLevel.DEBUG, 'Key Response Headers', keyHeaders);
      
      // Special processing for Link header which contains next segment info
      const linkHeader = this.findHeader(headerMap, 'Link');
      if (linkHeader) {
        this.log(LogLevel.DEBUG, 'Link Header Analysis');
        try {
          // Parse Link header format: <url>; rel=relation
          const linkMatch = linkHeader.match(/<([^>]+)>\s*;\s*rel=([^,\s]+)/i);
          if (linkMatch && linkMatch.length >= 3) {
            const nextUrl = linkMatch[1];
            const relation = linkMatch[2];
            
            this.log(LogLevel.DEBUG, 'Link Header Details', {
              relation,
              nextUrl,
              filename: nextUrl.split('/').pop() || nextUrl
            });
            
            // If it's a BBC segment, parse the segment number
            const nextSegment = nextUrl.split('/').pop() || '';
            if (nextSegment.includes('-audio=')) {
              const parts = nextSegment.split('-audio=');
              if (parts.length >= 2) {
                const bitrateAndSegment = parts[1].split('-');
                if (bitrateAndSegment.length >= 2) {
                  const nextSegmentNumber = bitrateAndSegment[1].replace('.m4s', '');
                  this.log(LogLevel.DEBUG, 'Next Segment Number', { number: nextSegmentNumber });
                }
              }
            }
          }
        } catch (e) {
          this.log(LogLevel.WARN, 'Error parsing Link header', e);
        }
      }
      
      // Check for X-USP-Info1 header which contains timing information
      const uspInfoHeader = this.findHeader(headerMap, 'X-USP-Info1');
      if (uspInfoHeader) {
        this.log(LogLevel.DEBUG, 'USP Info Analysis');
        try {
          // Parse X-USP-Info1 header format: t=timestamp lookahead=value
          const timeMatch = uspInfoHeader.match(/t=([^Z\s]+Z)/i);
          const lookaheadMatch = uspInfoHeader.match(/lookahead=(\d+)/i);
          
          const info: Record<string, string> = {};
          if (timeMatch && timeMatch.length >= 2) {
            info.serverTimestamp = timeMatch[1];
          }
          
          if (lookaheadMatch && lookaheadMatch.length >= 2) {
            info.lookaheadValue = lookaheadMatch[1];
          }
          
          this.log(LogLevel.DEBUG, 'USP Info Header Details', info);
        } catch (e) {
          this.log(LogLevel.WARN, 'Error parsing USP Info header', e);
        }
      }
    } catch (e) {
      this.log(LogLevel.WARN, 'Error parsing response headers', e);
    }
  }

  /**
   * Parse header string into object
   */
  private parseHeaderString(headerString: string): Record<string, string> {
    const headerMap: Record<string, string> = {};
    
    // Split the header string into lines
    const lines = headerString.split(/\r?\n/);
    for (const line of lines) {
      if (line.trim()) {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length) {
          const value = valueParts.join(':').trim();
          headerMap[key.trim()] = value;
        }
      }
    }
    
    return headerMap;
  }
  
  /**
   * Helper method to find a header in a case-insensitive way
   */
  private findHeader(headers: Record<string, string>, name: string): string | null {
    const normalizedName = name.toLowerCase();
    for (const key in headers) {
      if (key.toLowerCase() === normalizedName) {
        return headers[key];
      }
    }
    return null;
  }

  /**
   * Log audio processing data
   */
  private logAudioProcessingData(context: LoggingContext): void {
    const { audioContext, analyser, dataArray } = context;
    
    if (!audioContext || !analyser) {
      this.log(LogLevel.DEBUG, 'Audio processing data not available (missing AudioContext or Analyser)');
      return;
    }
    
    this.log(LogLevel.DEBUG, 'Audio Processing Data');
    
    try {
      this.log(LogLevel.DEBUG, 'Audio Context Time', { seconds: audioContext.currentTime });
      
      // Get current frequency data
      if (dataArray) {
        try {
          // Only log a subset of frequency data to avoid console spam
          analyser.getByteFrequencyData(dataArray);
          const frequencySummary = {
            min: Math.min(...Array.from(dataArray)),
            max: Math.max(...Array.from(dataArray)),
            avg: Array.from(dataArray).reduce((a, b) => a + b, 0) / dataArray.length,
            firstFew: Array.from(dataArray).slice(0, 5)
          };
          this.log(LogLevel.DEBUG, 'Frequency Data Summary', frequencySummary);
        } catch (e) {
          this.log(LogLevel.WARN, 'Error getting frequency data', e);
        }
      } else {
        this.log(LogLevel.DEBUG, 'No data array available for frequency analysis');
      }
      
      // Get time domain data for waveform analysis
      try {
        const timeDomainData = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteTimeDomainData(timeDomainData);
        
        // Calculate a simple zero-crossing rate (ZCR) - can be useful to identify audio frames
        let zeroCrossings = 0;
        for (let i = 1; i < timeDomainData.length; i++) {
          if ((timeDomainData[i - 1] < 128 && timeDomainData[i] >= 128) || 
              (timeDomainData[i - 1] >= 128 && timeDomainData[i] < 128)) {
            zeroCrossings++;
          }
        }
        
        this.log(LogLevel.DEBUG, 'Time Domain Analysis', {
          zeroCrossingRate: zeroCrossings,
          firstSamples: Array.from(timeDomainData).slice(0, 5),
          fingerprint: this.calculateAudioFingerprint(timeDomainData)
        });
      } catch (e) {
        this.log(LogLevel.WARN, 'Error processing time domain data', e);
      }
    } catch (e) {
      this.log(LogLevel.WARN, 'Error in audio processing data logging', e);
    }
  }

  /**
   * Calculate a simple audio fingerprint from time domain data
   * This could be used as part of a universal identifier
   */
  private calculateAudioFingerprint(timeDomainData: Uint8Array): string {
    // Use a simplified fingerprinting approach
    // Take 16 samples evenly distributed across the buffer
    const step = Math.floor(timeDomainData.length / 16);
    let fingerprint = '';
    
    for (let i = 0; i < 16; i++) {
      const pos = i * step;
      if (pos < timeDomainData.length) {
        // Convert to hex string
        const hexValue = timeDomainData[pos].toString(16).padStart(2, '0');
        fingerprint += hexValue;
      }
    }
    
    return fingerprint;
  }

  /**
   * Internal logging method that uses the shared logger
   */
  private log(level: LogLevel, message: string, data?: any): void {
    // Only log if the level is appropriate
    if (level > this.logLevel) return;
    
    // Log to the shared logger
    logger.info(DASH_LOG_CATEGORY, `[DashPlayer] ${message}`, data);
  }
}

export default DashAudioPlayerLogger; 