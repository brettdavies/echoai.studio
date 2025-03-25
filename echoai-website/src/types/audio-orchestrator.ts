/**
 * Types for the audio orchestrator system
 */

import { AudioProcessingOptions } from './audio-capture';
import { AudioExportOptions } from './audio-export';
import { AudioBatchOptions } from './audio-batch';

/**
 * Pipeline types supported by the orchestrator
 */
export enum PipelineType {
  CAPTURE_SAVE = 'capture-save',
  CAPTURE_BATCH_SAVE = 'capture-batch-save',
  CAPTURE_PROCESS_SAVE = 'capture-process-save',
  CAPTURE_BATCH_PROCESS_SAVE = 'capture-batch-process-save',
  CAPTURE_PROCESS_STREAM = 'capture-process-stream',
  CAPTURE_BATCH_PROCESS_STREAM = 'capture-batch-process-stream',
  CAPTURE_STREAM = 'capture-stream',
  CUSTOM = 'custom'
}

/**
 * Audio orchestrator options
 */
export interface OrchestratorOptions {
  /**
   * The type of pipeline to use
   */
  pipeline: PipelineType | string;
  
  /**
   * Options for audio capture
   */
  captureOptions?: AudioProcessingOptions;
  
  /**
   * Options for audio batching
   */
  batchOptions?: Partial<AudioBatchOptions>;
  
  /**
   * Options for audio processing
   */
  processOptions?: {
    effects?: string[];
    [key: string]: any;
  };
  
  /**
   * Options for audio export/saving
   */
  saveOptions?: Partial<AudioExportOptions>;
  
  /**
   * Options for audio streaming
   */
  streamOptions?: {
    url?: string;
    protocol?: 'websocket' | 'http' | 'custom';
    [key: string]: any;
  };
  
  /**
   * Whether to auto-save when capture stops
   */
  autoSaveOnStop?: boolean;
  
  /**
   * Whether to auto-stream when capture starts
   */
  autoStreamOnStart?: boolean;
}

/**
 * Orchestrator state
 */
export enum OrchestratorState {
  INACTIVE = 'inactive',
  INITIALIZED = 'initialized',
  RUNNING = 'running',
  PAUSED = 'paused',
  STOPPING = 'stopping',
  ERROR = 'error'
}

/**
 * Orchestrator event types
 */
export enum OrchestratorEventType {
  INITIALIZED = 'initialized',
  STARTED = 'started',
  PAUSED = 'paused',
  RESUMED = 'resumed',
  STOPPED = 'stopped',
  ERROR = 'error',
  PIPELINE_STEP_COMPLETE = 'pipeline_step_complete',
  PIPELINE_COMPLETE = 'pipeline_complete'
}

/**
 * Orchestrator event
 */
export interface OrchestratorEvent {
  type: OrchestratorEventType;
  timestamp: number;
  details?: any;
}

/**
 * Pipeline step definition
 */
export interface PipelineStep {
  /**
   * Step type (capture, batch, process, save, stream)
   */
  type: 'capture' | 'batch' | 'process' | 'save' | 'stream';
  
  /**
   * Step name for identification
   */
  name: string;
  
  /**
   * Step options
   */
  options?: any;
  
  /**
   * Whether the step is optional
   */
  optional?: boolean;
}

/**
 * Pipeline definition
 */
export interface Pipeline {
  /**
   * Pipeline ID
   */
  id: string;
  
  /**
   * Pipeline name
   */
  name: string;
  
  /**
   * Pipeline steps in execution order
   */
  steps: PipelineStep[];
} 