/**
 * DashAudioPlayerLogger
 * 
 * A utility for logging detailed information about dash.js audio streams
 * This centralizes all logging functionality from the DashAudioPlayer component
 */

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

  constructor(private loggingInterval: number = 2000) {
    this.logInterval = loggingInterval;
  }

  /**
   * Start periodic logging of stream information
   */
  startLogging(context: LoggingContext, onSegmentIdentified?: (id: string) => void): void {
    // Clean up any existing interval
    this.stopLogging();
    
    console.log('Starting periodic stream data logger');
    this.lastPlayingState = context.isPlaying;
    
    // Store interval ID for cleanup
    this.intervalId = window.setInterval(() => {
      // Check if the playing state has changed
      if (this.lastPlayingState !== context.isPlaying) {
        this.lastPlayingState = context.isPlaying;
        if (!context.isPlaying) {
          console.log('Pausing logging while playback is paused');
          return; // Exit early to prevent logging when paused
        } else {
          console.log('Resuming logging as playback has started');
        }
      }

      // Only log if player exists AND is playing
      if (!context.player || !context.isPlaying) {
        return;
      }
      
      try {
        console.group('Detailed Audio Stream Data');
        
        // Log basic timing information
        try {
          this.logTimingInfo(context);
        } catch (error) {
          console.warn('Error logging timing info:', error);
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
          console.warn('Error logging fragment info:', error);
        }
        
        // Log audio processing data
        try {
          this.logAudioProcessingData(context);
        } catch (error) {
          console.warn('Error logging audio processing data:', error);
        }
        
        console.groupEnd();
      } catch (error) {
        console.warn('Error in logging cycle:', error);
        try {
          console.groupEnd(); // Ensure we close any open console groups
        } catch (e) {
          // Ignore errors from groupEnd
        }
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
      console.log('Stopping stream data logger');
    }
  }

  /**
   * Log one-time technical specifications of the stream
   */
  logStreamSpecifications(player: dashjs.MediaPlayerInstance, audioContext?: AudioContext, analyser?: AnalyserNode): void {
    try {
      console.group('DASH Stream Technical Specifications');
      
      // Get active audio track
      const activeAudioTrack = player.getCurrentTrackFor('audio');
      if (activeAudioTrack) {
        console.log('Active Audio Track:', activeAudioTrack);
        console.log('Codec:', activeAudioTrack.codec);
        console.log('Language:', activeAudioTrack.lang || 'default');
        
        // Get mediaInfo which contains detailed audio specs
        const mediaInfo = activeAudioTrack.mediaInfo;
        if (mediaInfo) {
          console.log('Sample Rate:', mediaInfo.sampleRate || 'unknown');
          console.log('Channels:', mediaInfo.channelsCount || 'unknown');
          
          // Log bitrate safely - first try from mediaInfo
          try {
            if (mediaInfo.bitrateList && mediaInfo.bitrateList.length > 0) {
              console.log('Bitrate:', mediaInfo.bitrateList.map(b => b.bandwidth || b.bitrate).join(', ') || 'unknown');
            } else {
              console.log('Bitrate: No bitrate list available in mediaInfo');
            }
          } catch (e) {
            console.log('Bitrate: Error accessing bitrate information', e);
          }
          
          // Log more detailed information about the audio track
          console.log('Audio Type:', mediaInfo.type);
          console.log('MIME Type:', mediaInfo.mimeType);
          
          // Log resampling requirements for WebSocket implementation
          if (mediaInfo.sampleRate) {
            const originalSampleRate = mediaInfo.sampleRate;
            const targetSampleRate = 16000; // 16kHz for our WebSocket server
            console.log('Resampling Required:', originalSampleRate !== targetSampleRate);
            console.log('Resampling Ratio:', targetSampleRate / originalSampleRate);
            console.log('Estimated CPU Load for Resampling:', 
              originalSampleRate > targetSampleRate ? 'Low (downsampling)' : 'High (upsampling)');
          }
          
          // Log channel mixing requirements
          if (mediaInfo.channelsCount && mediaInfo.channelsCount > 1) {
            console.log('Channel Mixing Required: Yes (need to convert to mono)');
          } else {
            console.log('Channel Mixing Required: No (already mono)');
          }
        }
      } else {
        console.log('No active audio track found');
      }
      
      // Try to get quality info safely
      try {
        // First check if the function exists
        if (typeof player.getBitrateInfoListFor === 'function') {
          const audioQualities = player.getBitrateInfoListFor('audio');
          if (audioQualities && audioQualities.length) {
            console.log('Available Audio Qualities:', audioQualities);
          }
        } else {
          console.log('getBitrateInfoListFor method not available');
          
          // Try alternative ways to get bitrate info
          if (activeAudioTrack && activeAudioTrack.mediaInfo && activeAudioTrack.mediaInfo.bitrateList) {
            console.log('Available Audio Qualities (from mediaInfo):', activeAudioTrack.mediaInfo.bitrateList);
          }
        }
      } catch (e) {
        console.log('Error getting bitrate information:', e);
      }
      
      // Get buffer info safely
      try {
        if (typeof player.getBufferLength === 'function') {
          const bufferLength = player.getBufferLength('audio');
          console.log('Audio Buffer Length (sec):', bufferLength);
          
          // Add buffer stats for WebSocket planning
          if (bufferLength) {
            console.log('Recommended WebSocket Buffer Size (ms):', Math.min(bufferLength * 1000 / 3, 500));
            console.log('Estimated Network Delay Tolerance (ms):', Math.min(bufferLength * 1000 / 2, 1000));
          }
        } else {
          console.log('getBufferLength method not available');
        }
      } catch (e) {
        console.log('Error getting buffer information:', e);
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
                  console.log('Adaptation Set:', adaptationSet);
                }
              } else {
                console.log('getCurrentAdaptationFor method not available');
                
                // Method 2: Try to access via activeAudioTrack's adaptation
                if (activeAudioTrack && activeAudioTrack.adaptation) {
                  console.log('Adaptation Set (from track):', activeAudioTrack.adaptation);
                }
                
                // Method 3: Try to access from mediaInfo 
                if (activeAudioTrack && activeAudioTrack.mediaInfo && activeAudioTrack.mediaInfo.adaptation) {
                  console.log('Adaptation Set (from mediaInfo):', activeAudioTrack.mediaInfo.adaptation);
                }
              }
            } catch (e) {
              console.log('Error getting adaptation set:', e);
            }
            
            // Log latency metrics if it's a live stream
            try {
              if (typeof player.isDynamic === 'function' && player.isDynamic()) {
                console.log('Live Stream Detected');
                
                let liveLatency: number | string = 'unknown';
                try {
                  if (typeof player.getCurrentLiveLatency === 'function') {
                    liveLatency = player.getCurrentLiveLatency();
                  }
                } catch (e) {
                  console.log('Error getting live latency:', e);
                }
                
                console.log('Live Latency:', liveLatency);
                
                try {
                  if (typeof player.getTargetLiveLatency === 'function') {
                    console.log('Target Latency:', player.getTargetLiveLatency());
                  }
                } catch (e) {
                  console.log('Error getting target latency:', e);
                }
                
                // Add WebSocket relevant live stream metrics
                if (typeof liveLatency === 'number') {
                  console.log('WebSocket Relevant Metrics:');
                  console.log('- Max Acceptable Additional Latency (ms):', Math.min(liveLatency * 500, 1000));
                  console.log('- Recommended Processing Chunk Size (ms):', Math.min(liveLatency * 200, 500));
                }
              }
            } catch (e) {
              console.log('Error processing live stream metrics:', e);
            }
          }
        }
      } catch (e) {
        console.log('Error getting dash metrics:', e);
      }
      
      // Get audio context information
      if (audioContext) {
        const contextSampleRate = audioContext.sampleRate;
        console.log('Audio Context Sample Rate:', contextSampleRate);
        console.log('Audio Context State:', audioContext.state);
        
        // Additional WebSocket relevant audio context info
        console.log('Browser Audio Processing:');
        console.log('- Raw PCM Values Type:', 'Float32 (-1.0 to 1.0)');
        console.log('- Conversion Needed for 16-bit PCM:', 'Yes (multiply by 32767)');
        if (contextSampleRate) {
          console.log('- Resampling Method Options:');
          console.log('  * Web Audio API (limited browser support)');
          console.log('  * JavaScript implementation (higher CPU usage)');
          console.log('  * WebAssembly implementation (recommended)');
        }
      }
      
      // Log audio node connections if available
      if (analyser) {
        console.log('Analyser FFT Size:', analyser.fftSize);
        console.log('Analyser Frequency Bin Count:', analyser.frequencyBinCount);
        console.log('Potential AudioWorklet Slot:', 
          analyser ? 'After sourceNode, before analyser' : 'Direct connection to destination');
      }
      
      // Show estimation of WebSocket implementation difficulty
      console.log('WebSocket Implementation Complexity Assessment:');
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
          console.log('Error checking if stream is dynamic:', e);
        }
        
        console.log('- Overall Complexity:', complexity);
        console.log('- Potential Bottlenecks:', bottlenecks.length ? bottlenecks.join(', ') : 'None identified');
      } else {
        console.log('- Unable to assess complexity (insufficient information)');
      }
      
      console.groupEnd();
    } catch (error) {
      console.warn('Error logging stream specs:', error);
    }
  }

  /**
   * Log timing information from player and video element
   */
  private logTimingInfo(context: LoggingContext): void {
    const { player, videoElement } = context;
    if (!videoElement) return;
    
    const currentTime = player.time();
    
    console.log('--- Timing Information ---');
    console.log('Player Time (s):', currentTime);
    console.log('Current Time (s):', videoElement.currentTime);
    console.log('Video Timestamp:', new Date(videoElement.currentTime * 1000).toISOString().substr(11, 12));
  }

  /**
   * Log fragment information and extract raw identifiers without creating any universal IDs
   * Returns a segment identifier if one can be found directly from the stream
   */
  private logFragmentInfo(context: LoggingContext): string | null {
    const { player, videoElement } = context;
    if (!videoElement) return null;
    
    console.log('--- Fragment Information ---');
    
    // Get buffer information safely
    let bufferLevel;
    try {
      if (typeof player.getBufferLength === 'function') {
        bufferLevel = player.getBufferLength('audio');
        console.log('Buffer Level (s):', bufferLevel);
      } else {
        console.log('getBufferLength method not available');
      }
    } catch (e) {
      console.log('Error getting buffer level:', e);
    }
    
    // Track a segment ID if we can find one directly
    let segmentId: string | null = null;
    
    // Try different methods to get segment information
    let dashMetrics;
    try {
      if (typeof player.getDashMetrics === 'function') {
        dashMetrics = player.getDashMetrics();
      } else {
        console.log('getDashMetrics method not available');
      }
    } catch (e) {
      console.log('Error getting dash metrics:', e);
    }
    
    if (dashMetrics) {
      // First try to get current buffer info and track info
      try {
        console.log('--- Current Track Info ---');
        
        // Log active audio track
        if (typeof player.getCurrentTrackFor === 'function') {
          const activeAudioTrack = player.getCurrentTrackFor('audio');
          if (activeAudioTrack) {
            console.log('Active Audio Track ID:', activeAudioTrack.id);
            console.log('Active Audio Codec:', activeAudioTrack.codec);
            
            if (activeAudioTrack.mediaInfo) {
              console.log('Audio Bitrate(s):', activeAudioTrack.mediaInfo.bitrateList?.map(b => b.bitrate || b.bandwidth).join(', '));
              console.log('Audio Channels:', activeAudioTrack.mediaInfo.channelsCount);
              console.log('Audio Sample Rate:', activeAudioTrack.mediaInfo.sampleRate);
            }
          }
        }
      } catch (e) {
        console.log('Error getting track info:', e);
      }
      
      // Try to log HTTP trace data directly from dashjs
      try {
        this.logHttpTraceData(dashMetrics);
      } catch (e) {
        console.log('Error logging HTTP trace data:', e);
      }
      
      // Now focus on getting latest fragment request which contains response with URL and headers
      try {
        console.log('--- Segment Data ---');
        
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
              console.log('Latest Fragment Request (Raw):', latestFragmentRequest);
              
              // Check for response property
              if (latestFragmentRequest.response) {
                const response = latestFragmentRequest.response;
                console.log('Response Object Found (Raw):', response);
                
                // Extract response headers if available
                if (response.responseHeaders || response.headers) {
                  responseHeaders = response.responseHeaders || response.headers;
                  console.log('Response Headers (Raw):', responseHeaders);
                  
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
            console.log('Error getting latest fragment request:', e);
          }
        }
        
        // Method 2: Try getCurrentRequest as a fallback
        if (!segmentUrl && typeof dashMetrics.getCurrentRequest === 'function') {
          try {
            const currentRequest = dashMetrics.getCurrentRequest('audio');
            if (currentRequest) {
              console.log('Current Request (Raw):', currentRequest);
              
              // Check for response property
              if (currentRequest.response) {
                const response = currentRequest.response;
                console.log('Response Object Found (Raw):', response);
                
                // Extract response headers if available
                if (response.responseHeaders || response.headers) {
                  responseHeaders = response.responseHeaders || response.headers;
                  console.log('Response Headers (Raw):', responseHeaders);
                  
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
            console.log('Error getting current request:', e);
          }
        }
        
        // Process the segment URL if we found one
        if (segmentUrl) {
          console.log('Segment URL (Raw):', segmentUrl);
          
          // Extract filename from URL
          const urlParts = segmentUrl.split('/');
          const filename = urlParts[urlParts.length - 1];
          console.log('Segment Filename (Raw):', filename);
          
          // Parse BBC stream segment filename pattern
          // Example: bbc_world_service_news_internet-audio=96000-272306193.m4s
          if (filename.includes('-audio=')) {
            try {
              console.log('--- BBC Segment Analysis ---');
              const parts = filename.split('-audio=');
              const streamName = parts[0];
              console.log('Stream Name:', streamName);
              
              // Extract bitrate and segment number
              if (parts[1]) {
                const bitrateAndSegment = parts[1].split('-');
                if (bitrateAndSegment.length >= 2) {
                  const bitrate = bitrateAndSegment[0];
                  console.log('Audio Bitrate:', bitrate);
                  
                  // Extract segment ID (removing .m4s extension)
                  const segmentNumber = bitrateAndSegment[1].replace('.m4s', '');
                  console.log('Segment Number:', segmentNumber);
                  
                  // Check if this is a new segment number
                  if (this.lastSegmentNumber !== segmentNumber) {
                    if (this.lastSegmentNumber !== null) {
                      const diff = parseInt(segmentNumber) - parseInt(this.lastSegmentNumber);
                      console.log(`Segment Increment: ${diff} (from ${this.lastSegmentNumber} to ${segmentNumber})`);
                    }
                    this.lastSegmentNumber = segmentNumber;
                  }
                  
                  // Use full filename as segment identifier for callback
                  segmentId = filename;
                  
                  // Additional info that might be useful
                  console.log('File Type:', 'MPEG-4 Audio Segment (.m4s)');
                  console.log('Is Initialization Segment:', filename.includes('.dash'));
                }
              }
            } catch (e) {
              console.log('Error parsing BBC segment filename:', e);
            }
          }
        } else {
          console.log('No segment URL found');
        }
      } catch (e) {
        console.log('Error analyzing segment data:', e);
      }
    } else {
      console.log('No dash metrics available for segment information');
    }
    
    // For live streams, log the available time range
    try {
      if (typeof player.isDynamic === 'function' && player.isDynamic() && 
          videoElement.buffered && videoElement.buffered.length) {
        console.log('--- Buffered Ranges (Raw) ---');
        for (let i = 0; i < videoElement.buffered.length; i++) {
          console.log(`Range ${i}: ${videoElement.buffered.start(i)} - ${videoElement.buffered.end(i)}`);
        }
      }
    } catch (e) {
      console.log('Error logging buffered ranges:', e);
    }
    
    // Log current playback time as a reference
    console.log('Current Playback Time (Raw):', videoElement.currentTime);
    
    return segmentId;
  }

  /**
   * Direct method to log HTTP trace data from dash.js metrics 
   * This is to ensure we get all possible headers and network information
   */
  private logHttpTraceData(dashMetrics: dashjs.DashMetrics): void {
    console.log('--- HTTP Trace Data ---');
    
    try {
      // Try to get all HTTP request traces
      // Note: Different versions of dash.js have different APIs, so we'll try multiple approaches
      
      // Method 1: Try to use httpRequests method (newer versions)
      let httpRequests: any[] = [];
      let httpRequestsFound = false;
      
      // Try different methods to access HTTP requests in dash.js
      if (typeof (dashMetrics as any).getHttpRequests === 'function') {
        httpRequests = (dashMetrics as any).getHttpRequests() || [];
        console.log('HTTP Requests found (getHttpRequests method):', httpRequests.length);
        httpRequestsFound = httpRequests.length > 0;
      } 
      // Method 2: Try httpList (older versions)
      else if ((dashMetrics as any).httpList) {
        httpRequests = (dashMetrics as any).httpList || [];
        console.log('HTTP Requests found (httpList property):', httpRequests.length);
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
              console.log('HTTP Requests found (player debug metrics):', httpRequests.length);
              httpRequestsFound = httpRequests.length > 0;
            } else if (internalPlayer.metrics && internalPlayer.metrics.http) {
              httpRequests = internalPlayer.metrics.http.list || [];
              console.log('HTTP Requests found (player metrics):', httpRequests.length);
              httpRequestsFound = httpRequests.length > 0;
            }
          }
        } catch (e) {
          console.log('Error accessing player metrics:', e);
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
            console.log('Requests found in fragment model:', requests.length);
            httpRequests = requests;
            httpRequestsFound = requests.length > 0;
          }
        } catch (e) {
          console.log('Error accessing fragment model:', e);
        }
      }
      
      // Method 5: Try to use an alternative API (Version 3.x+)
      if (!httpRequestsFound) {
        try {
          // In dash.js v3.x, metrics are accessed differently
          if (typeof (dashMetrics as any).getRequestsQueue === 'function') {
            httpRequests = (dashMetrics as any).getRequestsQueue() || [];
            console.log('Requests found in request queue:', httpRequests.length);
            httpRequestsFound = httpRequests.length > 0;
          }
        } catch (e) {
          console.log('Error accessing request queue:', e);
        }
      }
      
      // Direct browser observation: Check for network requests from the browser
      if (!httpRequestsFound) {
        try {
          // This is a last resort - manually check for recent audio segment requests
          console.log('Trying direct observation of active network requests...');
          
          // Check if Performance API is available
          if (typeof window !== 'undefined' && window.performance && window.performance.getEntries) {
            const resourceEntries = window.performance.getEntries().filter(
              entry => entry.name.includes('.m4s') && entry.name.includes('audio')
            );
            
            if (resourceEntries.length > 0) {
              console.log('Found audio segment entries via Performance API:', resourceEntries.length);
              
              // Log the most recent entry
              const latestEntry = resourceEntries[resourceEntries.length - 1];
              console.log('Latest audio segment request:', latestEntry.name);
              
              // Unfortunately, we can't access the headers this way
              console.log('Network metrics (but no headers available this way):', {
                duration: latestEntry.duration,
                startTime: latestEntry.startTime,
                entryType: latestEntry.entryType
              });
            } else {
              console.log('No audio segment entries found via Performance API');
            }
          }
        } catch (e) {
          console.log('Error using Performance API:', e);
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
          console.log(`Found ${segmentRequests.length} segment requests, showing most recent`);
          
          // Log the most recent segment request (first in sorted array)
          const latestRequest = segmentRequests[0];
          console.log('Latest Segment Request URL:', latestRequest.url);
            
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
            console.log('--- Request Headers (Raw) ---');
            console.log(requestHeaders);
          } else {
            console.log('No request headers found in the request object');
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
            console.log('--- Response Headers (Raw) ---');
            console.log(responseHeaders);
            
            // Parse the headers and log interesting ones
            this.logResponseHeaders(responseHeaders);
          } else {
            console.log('No response headers found in the request object');
            
            // Log other properties that might contain header information
            console.log('Properties of the request object that might contain headers:');
            Object.keys(latestRequest).forEach(key => {
              if (
                key.toLowerCase().includes('header') || 
                key.toLowerCase().includes('response') ||
                key.toLowerCase().includes('http')
              ) {
                console.log(`- ${key}:`, latestRequest[key]);
              }
            });
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
              console.log('ETag Found:', etag);
            }
          }
          
          // Log the trace information
          console.log('--- Trace Metrics ---');
          console.log('Request Type:', latestRequest.type);
          console.log('HTTP Status:', latestRequest._status || latestRequest.status);
          
          // Timing metrics
          if (latestRequest._tfinish) {
            console.log('Finished Time:', latestRequest._tfinish);
          }
          if (latestRequest._trequest) {
            console.log('Request Time:', latestRequest._trequest);
          }
          if (latestRequest._tresponse) {
            console.log('Response Time:', latestRequest._tresponse);
          }
          if (latestRequest._tfinish && latestRequest._trequest) {
            console.log('Total Request Duration (ms):', (latestRequest._tfinish - latestRequest._trequest) * 1000);
          }
        } else {
          console.log('No segment requests found in the HTTP requests');
        }
      } else {
        console.log('No HTTP requests found in dash metrics');
      }
    } catch (e) {
      console.log('Error processing HTTP trace data:', e);
    }
  }

  /**
   * Parse and log HTTP response headers from the segment response
   */
  private logResponseHeaders(headers: string | Record<string, string>): void {
    console.log('--- Response Headers Analysis ---');
    
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
      
      console.log('Key Headers:');
      importantHeaders.forEach(header => {
        const normalizedKey = Object.keys(headerMap).find(
          key => key.toLowerCase() === header.toLowerCase()
        );
        
        if (normalizedKey && headerMap[normalizedKey]) {
          console.log(`- ${header}: ${headerMap[normalizedKey]}`);
        }
      });
      
      // Special processing for Link header which contains next segment info
      const linkHeader = this.findHeader(headerMap, 'Link');
      if (linkHeader) {
        console.log('--- Link Header Analysis ---');
        try {
          // Parse Link header format: <url>; rel=relation
          const linkMatch = linkHeader.match(/<([^>]+)>\s*;\s*rel=([^,\s]+)/i);
          if (linkMatch && linkMatch.length >= 3) {
            const nextUrl = linkMatch[1];
            const relation = linkMatch[2];
            console.log('Link Relation:', relation);
            console.log('Next Segment URL:', nextUrl);
            
            // Extract next segment filename
            const nextSegmentParts = nextUrl.split('/');
            const nextSegment = nextSegmentParts[nextSegmentParts.length - 1] || nextUrl;
            console.log('Next Segment Filename:', nextSegment);
            
            // If it's a BBC segment, parse the segment number
            if (nextSegment.includes('-audio=')) {
              const parts = nextSegment.split('-audio=');
              if (parts.length >= 2) {
                const bitrateAndSegment = parts[1].split('-');
                if (bitrateAndSegment.length >= 2) {
                  const nextSegmentNumber = bitrateAndSegment[1].replace('.m4s', '');
                  console.log('Next Segment Number:', nextSegmentNumber);
                }
              }
            }
          }
        } catch (e) {
          console.log('Error parsing Link header:', e);
        }
      }
      
      // Check for X-USP-Info1 header which contains timing information
      const uspInfoHeader = this.findHeader(headerMap, 'X-USP-Info1');
      if (uspInfoHeader) {
        console.log('--- USP Info Analysis ---');
        try {
          // Parse X-USP-Info1 header format: t=timestamp lookahead=value
          const timeMatch = uspInfoHeader.match(/t=([^Z\s]+Z)/i);
          const lookaheadMatch = uspInfoHeader.match(/lookahead=(\d+)/i);
          
          if (timeMatch && timeMatch.length >= 2) {
            console.log('Server Timestamp:', timeMatch[1]);
          }
          
          if (lookaheadMatch && lookaheadMatch.length >= 2) {
            console.log('Lookahead Value:', lookaheadMatch[1]);
          }
        } catch (e) {
          console.log('Error parsing USP Info header:', e);
        }
      }
    } catch (e) {
      console.log('Error parsing response headers:', e);
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
      console.log('Audio processing data not available (missing AudioContext or Analyser)');
      return;
    }
    
    console.log('--- Audio Processing Data ---');
    
    try {
      console.log('Audio Context Time (s):', audioContext.currentTime);
      
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
          console.log('Frequency Data Summary:', frequencySummary);
        } catch (e) {
          console.log('Error getting frequency data:', e);
        }
      } else {
        console.log('No data array available for frequency analysis');
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
        console.log('Zero Crossing Rate:', zeroCrossings);
        console.log('Time Domain Sample:', Array.from(timeDomainData).slice(0, 5));
        
        // Calculate audio fingerprint for the current frame
        const fingerprint = this.calculateAudioFingerprint(timeDomainData);
        console.log('Audio Fingerprint:', fingerprint);
      } catch (e) {
        console.log('Error processing time domain data:', e);
      }
    } catch (e) {
      console.log('Error in audio processing data logging:', e);
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
}

export default DashAudioPlayerLogger; 