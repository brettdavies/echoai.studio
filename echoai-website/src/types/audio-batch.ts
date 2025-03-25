/**
 * Types for the audio batching system
 */

/**
 * Batch processing strategy
 */
export enum BatchStrategy {
  /**
   * Fixed-size batching - combine chunks into batches of a specific size
   */
  FIXED_SIZE = 'fixed_size',
  
  /**
   * Time-based batching - combine chunks into batches covering a specific duration
   */
  TIME_BASED = 'time_based',
  
  /**
   * Dynamic batching - adjust batch size based on content properties
   */
  DYNAMIC = 'dynamic'
}

/**
 * Audio batch options
 */
export interface AudioBatchOptions {
  /**
   * Batching strategy to use
   */
  strategy: BatchStrategy;
  
  /**
   * Target batch size (in samples) when using FIXED_SIZE strategy
   */
  batchSize?: number;
  
  /**
   * Target duration (in seconds) when using TIME_BASED strategy
   */
  batchDuration?: number;
  
  /**
   * Whether to process incomplete batches
   */
  processIncomplete?: boolean;
  
  /**
   * Overlap between consecutive batches (in samples or seconds, depending on strategy)
   */
  overlap?: number;
}

/**
 * Audio batch event types
 */
export enum AudioBatchEventType {
  BATCH_START = 'batch_start',
  BATCH_COMPLETE = 'batch_complete',
  BATCH_PROGRESS = 'batch_progress',
  BATCH_ERROR = 'batch_error'
}

/**
 * Audio batch state
 */
export enum AudioBatchState {
  INACTIVE = 'inactive',
  BATCHING = 'batching',
  PAUSED = 'paused',
  COMPLETE = 'complete',
  ERROR = 'error'
} 