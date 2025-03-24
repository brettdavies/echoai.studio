import { ProcessingOptions } from './types';

/**
 * Configuration for the RubberBand processor
 */
export interface RubberBandConfig {
  processorPath: string;
  numberOfChannels: number;
  threadPoolSize: number;
  transientMode: number;
}

/**
 * Default configuration for RubberBand
 */
export const DEFAULT_RUBBERBAND_CONFIG: RubberBandConfig = {
  processorPath: '/node_modules/rubberband-web/public/rubberband-processor.js',
  numberOfChannels: 1,
  threadPoolSize: 2,
  transientMode: 2, // Mixed mode
};

/**
 * Creates processor options for a RubberBand node
 * @param sampleRate Sample rate of the audio
 * @param config RubberBand configuration
 * @param options Processing options
 * @returns Options object for creating a RubberBand node
 */
export const createRubberBandOptions = (
  sampleRate: number,
  config: RubberBandConfig,
  options: ProcessingOptions
): {
  numberOfInputs: number;
  numberOfOutputs: number;
  processorOptions: any;
} => {
  const processorOptions = {
    sampleRate,
    numChannels: config.numberOfChannels,
    options: {
      formantPreserved: options.formantPreservation ?? true,
      transientMode: config.transientMode,
      phaseIndependent: false,
      threadPoolSize: config.threadPoolSize,
    }
  };
  
  console.log('[RubberBand] Creating processor with options:', JSON.stringify(processorOptions, null, 2));
  
  return {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    processorOptions
  };
};

/**
 * Configures a RubberBand node with audio processing options
 * @param node The RubberBand node to configure
 * @param options Processing options
 */
export const configureRubberBandNode = (node: any, options: ProcessingOptions): void => {
  // Set pitch and tempo configuration in a consistent order
  
  // First, always set high quality
  if (typeof node.setHighQuality === 'function') {
    // Set this first as it can change the processing mode
    node.setHighQuality(true);
    console.log('[RubberBand] Set high quality mode');
  } else {
    console.warn('[RubberBand] setHighQuality method not available');
  }
  
  // Then set time stretching if needed
  if (options.timeStretch !== undefined && options.timeStretch !== 1.0) {
    if (typeof node.setTempo === 'function') {
      const tempo = 1.0 / options.timeStretch;  // Convert time stretch to tempo
      node.setTempo(tempo);
      console.log(`[RubberBand] Set tempo to ${tempo} (1.0/timeStretch: ${options.timeStretch})`);
    } else {
      console.warn('[RubberBand] setTempo method not available');
    }
  }
  
  // Then set pitch shifting if needed
  if (options.pitchShift !== undefined && options.pitchShift !== 0.0) {
    // Convert semitones to ratio (2^(n/12))
    const pitchScale = Math.pow(2, options.pitchShift / 12);
    
    if (typeof node.setPitch === 'function') {
      node.setPitch(pitchScale);
      console.log(`[RubberBand] Set pitch scale to ${pitchScale} (from semitones: ${options.pitchShift})`);
    } else {
      console.warn('[RubberBand] setPitch method not available');
    }
  }
  
  // Send the configuration event to the processor
  try {
    node.port.postMessage({
      command: 'configure',
      options: {
        highQuality: true,
        pitch: options.pitchShift ? Math.pow(2, options.pitchShift / 12) : 1.0,
        tempo: options.timeStretch ? 1.0 / options.timeStretch : 1.0
      }
    });
    console.log('[RubberBand] Configuration message sent to processor');
  } catch (error) {
    console.error('[RubberBand] Failed to send configuration message:', error);
  }
}; 