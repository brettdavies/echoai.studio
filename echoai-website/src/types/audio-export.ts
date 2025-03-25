/**
 * Types for the audio export system
 */

/**
 * Audio format for export
 */
export enum AudioExportFormat {
  WAV = 'wav',
  MP3 = 'mp3'
}

/**
 * Audio export options
 */
export interface AudioExportOptions {
  /**
   * Format to export the audio as
   */
  format: AudioExportFormat;
  
  /**
   * Whether to trigger an automatic download
   */
  autoDownload: boolean;
  
  /**
   * Custom filename (without extension)
   */
  filename?: string;
  
  /**
   * Normalize audio before export
   */
  normalize?: boolean;
}

/**
 * Audio export state
 */
export enum AudioExportState {
  INACTIVE = 'inactive',
  EXPORTING = 'exporting',
  COMPLETED = 'completed',
  ERROR = 'error'
}

/**
 * Audio export event types
 */
export enum AudioExportEventType {
  EXPORT_START = 'export_start',
  EXPORT_PROGRESS = 'export_progress',
  EXPORT_COMPLETE = 'export_complete',
  EXPORT_ERROR = 'export_error'
}

/**
 * Audio export event
 */
export interface AudioExportEvent {
  type: AudioExportEventType;
  timestamp: number;
  details?: any;
} 