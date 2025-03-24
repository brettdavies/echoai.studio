/**
 * Module to handle loading and managing the RubberBand WebAssembly module
 */

import { audioLoggers } from '../../utils/LoggerFactory';

// Lazy-loading RubberBand WebAssembly
let rubberBandPromise: Promise<any> | null = null;
// Global reference to initialized module
let globalRubberBandModule: any = null;

/**
 * Loads the RubberBand WebAssembly module
 * @returns A promise that resolves to the loaded module
 */
export const loadRubberBandModule = async (): Promise<any> => {
  // Use global module if available, otherwise load it
  if (!globalRubberBandModule) {
    // Dynamically import RubberBand only when needed
    if (!rubberBandPromise) {
      audioLoggers.resampler.info('Lazy-loading RubberBand WebAssembly module...');
      rubberBandPromise = import('rubberband-web').then(module => {
        globalRubberBandModule = module;
        return module;
      });
    }
    
    // Wait for RubberBand to initialize
    globalRubberBandModule = await rubberBandPromise;
    
    // Log available exports to help diagnose the structure
    audioLoggers.resampler.debug('Available RubberBand exports:', Object.keys(globalRubberBandModule));
    
    // Check if module has the createRubberBandNode method
    if (!globalRubberBandModule || typeof globalRubberBandModule.createRubberBandNode !== 'function') {
      throw new Error('RubberBand module missing createRubberBandNode method');
    }
  }
  
  return globalRubberBandModule;
};

/**
 * Gets the currently loaded RubberBand module
 * @returns The loaded module or null if not loaded
 */
export const getRubberBandModule = (): any => {
  return globalRubberBandModule;
};

/**
 * Creates a RubberBand node using the loaded module
 * @param context The audio context (can be regular or offline)
 * @param sampleRate The sample rate
 * @param processorPath Path to the processor script
 * @param options Configuration options
 * @returns A promise that resolves to the created node
 */
export const createRubberBandNode = async (
  context: BaseAudioContext,
  sampleRate: number,
  processorPath: string,
  options: {
    numberOfInputs: number;
    numberOfOutputs: number;
    processorOptions: any;
  }
): Promise<any> => {
  // Ensure module is loaded
  const module = await loadRubberBandModule();
  
  // Debug audio context details
  audioLoggers.resampler.debug(`Creating node with context: ${context.constructor.name}, sampleRate: ${context.sampleRate}`);
  
  try {
    // Create the node
    const node = await module.createRubberBandNode(
      context,
      processorPath,
      options
    );
    
    if (!node) {
      throw new Error('Could not create RubberBand node');
    }
    
    // Add debug message handler to check communication
    node.port.onmessage = (event: MessageEvent) => {
      audioLoggers.resampler.debug(`Message from processor:`, event.data);
    };
    
    // Force immediate message to test communication
    node.port.postMessage({ 
      command: 'debug', 
      value: 'Testing worklet communication'
    });
    
    // Verify required methods are available
    const requiredMethods = ['setPitch', 'setTempo', 'setHighQuality'];
    const missingMethods = requiredMethods.filter(method => typeof node[method] !== 'function');
    
    if (missingMethods.length > 0) {
      audioLoggers.resampler.warn(`Node missing expected methods: ${missingMethods.join(', ')}`);
    } else {
      audioLoggers.resampler.info('Node created with all required methods');
    }
    
    return node;
  } catch (error) {
    audioLoggers.resampler.error('Error creating RubberBand node:', error);
    throw error;
  }
}; 