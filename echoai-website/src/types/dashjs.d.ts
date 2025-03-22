/**
 * TypeScript declaration for dash.js v5.0.0+
 */

declare namespace dashjs {
  interface MediaPlayerClass {
    create(): MediaPlayerInstance;
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
    updateSettings(settings: any): void;
    on(type: string, listener: Function, scope?: any): void;
    off(type: string, listener: Function, scope?: any): void;
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