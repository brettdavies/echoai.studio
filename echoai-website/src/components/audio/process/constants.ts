import { ProcessingOptions } from './types';

/**
 * Default audio processing options
 */
export const DEFAULT_PROCESSING_OPTIONS: ProcessingOptions = {
  resample: true,
  targetSampleRate: 16000, // 16kHz
  timeStretch: 1.0, // Default: no time stretching
  pitchShift: 0.0, // Default: no pitch shifting
  formantPreservation: true,
}; 