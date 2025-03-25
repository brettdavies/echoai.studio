import { LogLevel } from '../utils/Logger';

/**
 * Props for the DashAudioPlayer component
 */
export interface DashAudioPlayerProps {
  url: string;
  className?: string;
  onPlaybackStarted?: () => void;
  onPlaybackStateChange?: (isPlaying: boolean) => void;
  streamingUrl?: string;
  streamingEnabled?: boolean;
  onStreamingStatusChange?: (status: boolean, message?: string) => void;
  enableCapture?: boolean;
}

/**
 * Audio processing options
 */
export interface AudioProcessingOptions {
  resample: boolean;
  targetSampleRate: number;
  timeStretch: number;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  level: LogLevel;
  enableProcessor: boolean;
  enableWasm: boolean;
  enableWorklet: boolean;
}

/**
 * Player state interface
 */
export interface PlayerState {
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  error: string | null;
  initialized: boolean;
  showCanvas: boolean;
}

/**
 * Audio visualization data
 */
export interface VisualizationData {
  canvas: HTMLCanvasElement | null;
  canvasCtx: CanvasRenderingContext2D | null;
  dataArray: Uint8Array | null;
}

/**
 * Audio context and nodes
 */
export interface AudioNodes {
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
  sourceNode: MediaElementAudioSourceNode | null;
} 