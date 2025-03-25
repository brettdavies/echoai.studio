import { ProcessingOptions } from 'types';
import { audioLoggers } from '../../../utils/LoggerFactory';

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
  
  audioLoggers.resampler.debug('Creating processor with options:', JSON.stringify(processorOptions, null, 2));
  
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
    audioLoggers.resampler.info('Set high quality mode');
  } else {
    audioLoggers.resampler.warn('setHighQuality method not available');
  }
  
  // Then set time stretching if needed
  if (options.timeStretch !== undefined && options.timeStretch !== 1.0) {
    if (typeof node.setTempo === 'function') {
      const tempo = 1.0 / options.timeStretch;  // Convert time stretch to tempo
      node.setTempo(tempo);
      audioLoggers.resampler.info(`Set tempo to ${tempo} (1.0/timeStretch: ${options.timeStretch})`);
    } else {
      audioLoggers.resampler.warn('setTempo method not available');
    }
  }
  
  // Then set pitch shifting if needed
  if (options.pitchShift !== undefined && options.pitchShift !== 0.0) {
    // Convert semitones to ratio (2^(n/12))
    const pitchScale = Math.pow(2, options.pitchShift / 12);
    
    if (typeof node.setPitch === 'function') {
      node.setPitch(pitchScale);
      audioLoggers.resampler.info(`Set pitch scale to ${pitchScale} (from semitones: ${options.pitchShift})`);
    } else {
      audioLoggers.resampler.warn('setPitch method not available');
    }
  }
  
  // Send the configuration event to the processor
  try {
    // Create configuration object
    const configMessage = {
      command: 'configure',
      options: {
        highQuality: true,
        pitch: options.pitchShift ? Math.pow(2, options.pitchShift / 12) : 1.0,
        tempo: options.timeStretch ? 1.0 / options.timeStretch : 1.0
      }
    };
    
    // Log the configuration being sent
    audioLoggers.resampler.debug('Sending configuration to processor:', JSON.stringify(configMessage));
    
    // Use the node's post message method which should now be using our safe sender
    node.port.postMessage(configMessage);
    
    audioLoggers.resampler.info('Configuration message sent to processor');
  } catch (error) {
    audioLoggers.resampler.error('Failed to send configuration message:', error);
  }
}; 