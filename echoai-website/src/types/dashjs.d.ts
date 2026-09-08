/**
 * TypeScript declaration for dash.js v5.0.0+
 */

declare namespace dashjs {
  interface MediaPlayerClass {
    create(): MediaPlayerInstance;
  }

  interface MediaPlayerSettings {
    debug?: {
      logLevel?: number;
      dispatchEvent?: boolean;
    };
    streaming?: {
      buffer?: {
        fastSwitchEnabled?: boolean;
        [key: string]: unknown;
      };
      liveCatchup?: {
        enabled?: boolean;
        maxDrift?: number;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }

  interface MediaPlayerEvent {
    type?: string;
  }

  interface MediaPlayerErrorEvent extends MediaPlayerEvent {
    error?: string | { code?: number; message?: string; data?: unknown };
    event?: { id?: string; message?: string; url?: string };
  }

  interface PlaybackErrorEvent extends MediaPlayerEvent {
    error?: unknown;
    message?: string;
  }

  interface MediaPlayerInstance {
    initialize(view?: HTMLElement, source?: string, autoPlay?: boolean): void;
    attachView(element: HTMLElement): void;
    attachSource(source: string): void;
    reset(): void;
    play(): Promise<void>;
    pause(): void;
    isPaused(): boolean;
    seek(time: number): void;
    isSeeking(): boolean;
    isDynamic(): boolean;
    duration(): number;
    seekTime(): number;
    time(): number;
    setVolume(value: number): void;
    getVolume(): number;
    setMute(value: boolean): void;
    isMuted(): boolean;
    setAutoPlay(value: boolean): void;
    updateSettings(settings: MediaPlayerSettings): void;
    on(type: string, listener: (event: MediaPlayerEvent) => void, scope?: object): void;
    off(type: string, listener: (event: MediaPlayerEvent) => void, scope?: object): void;

    // Stream information methods
    getCurrentTrackFor(type: string): MediaTrack;
    getBitrateInfoListFor?(type: string): BitrateInfo[];
    getBufferLength(type: string): number;
    getDashMetrics(): DashMetrics;
    getCurrentLiveLatency?(): number;
    getTargetLiveLatency?(): number;
  }

  interface MediaTrack {
    codec: string;
    id: string;
    index: number;
    lang?: string;
    viewpoint?: string;
    roles?: string[];
    mediaInfo: MediaInfo;
    adaptation?: unknown;
  }

  interface MediaInfo {
    type: string;
    mimeType: string;
    codec: string;
    sampleRate?: number;
    channelsCount?: number;
    bitrateList?: BitrateInfo[];
    adaptation?: unknown;
  }

  interface BitrateInfo {
    mediaType?: string;
    bitrate: number;
    width?: number;
    height?: number;
    scanType?: string;
    qualityIndex?: number;
    bandwidth?: number;
  }

  interface FragmentResponse {
    url?: string;
    responseHeaders?: string | Record<string, string>;
    headers?: string | Record<string, string>;
    [key: string]: unknown;
  }

  interface FragmentRequest {
    index: number;
    startTime: number;
    duration: number;
    url?: string;
    mediaType?: string;
    type?: string;
    response?: FragmentResponse;
    [key: string]: unknown;
  }

  interface HttpTraceRequest {
    url?: string;
    type?: string;
    status?: number;
    _status?: number;
    _trequest?: number;
    _tresponse?: number;
    _tfinish?: number;
    treceived?: number;
    requestEndDate?: Date;
    requestHeaders?: string | Record<string, string>;
    responseHeaders?: string | Record<string, string>;
    headers?: {
      request?: string | Record<string, string>;
      response?: string | Record<string, string>;
    };
    request?: {
      headers?: string | Record<string, string>;
    };
    response?: FragmentResponse;
    getAllResponseHeaders?(): string;
    [key: string]: unknown;
  }

  interface MetricsHttpList {
    list?: HttpTraceRequest[];
  }

  interface InternalPlayerMetrics {
    debug?: {
      metrics?: {
        http?: MetricsHttpList;
      };
    };
    metrics?: {
      http?: MetricsHttpList;
    };
  }

  interface InternalStreamProcessor {
    fragmentModel?: {
      getRequests(): HttpTraceRequest[] | null;
    };
  }

  interface ManifestInfo {
    availableStreams?: unknown[];
    duration?: number;
    loadedTime?: Date;
    [key: string]: unknown;
  }

  interface DashMetrics {
    getCurrentAdaptationFor(type: string): unknown;
    getCurrentIndex?(type: string): number;
    getCurrentRequest?(type: string): FragmentRequest | null;
    getLatestFragmentRequestForQuality?(streamId: string, quality: number): FragmentRequest | null;
    getManifestInfo?(): ManifestInfo;
    getHttpRequests?(): HttpTraceRequest[] | null;
    httpList?: HttpTraceRequest[];
    getRequestsQueue?(): HttpTraceRequest[] | null;
    player?: InternalPlayerMetrics;
    context?: {
      player?: InternalPlayerMetrics;
      streamProcessor?: InternalStreamProcessor;
    };
    streamProcessor?: InternalStreamProcessor;
  }

  interface Debug {
    LOG_LEVEL_NONE: number;
    LOG_LEVEL_FATAL: number;
    LOG_LEVEL_ERROR: number;
    LOG_LEVEL_WARNING: number;
    LOG_LEVEL_INFO: number;
    LOG_LEVEL_DEBUG: number;
  }

  interface Events {
    ERROR: string;
    PLAYBACK_STARTED: string;
    PLAYBACK_PAUSED: string;
    PLAYBACK_PLAYING: string;
    PLAYBACK_SEEKING: string;
    PLAYBACK_SEEKED: string;
    PLAYBACK_TIME_UPDATED: string;
    PLAYBACK_ENDED: string;
    PLAYBACK_STALLED: string;
    PLAYBACK_WAITING: string;
    PLAYBACK_NOT_ALLOWED: string;
    PLAYBACK_LOADED_DATA: string;
    PLAYBACK_VOLUME_CHANGED: string;
    PLAYBACK_ERROR: string;
    BUFFER_EMPTY: string;
    BUFFER_LOADED: string;
    BUFFER_LEVEL_UPDATED: string;
    QUALITY_CHANGE_REQUESTED: string;
    QUALITY_CHANGE_RENDERED: string;
    MANIFEST_LOADED: string;
    STREAM_ACTIVATED: string;
    STREAM_INITIALIZED: string;
    STREAM_UPDATED: string;
  }
}

interface Window {
  dashjs: {
    MediaPlayer: () => dashjs.MediaPlayerClass;
    Debug: dashjs.Debug;
    Version?: string;
  };
}
