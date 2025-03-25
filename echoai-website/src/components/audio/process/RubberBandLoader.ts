/**
 * Module to handle loading and managing the RubberBand WebAssembly module
 */

import { audioLoggers } from '../../utils/LoggerFactory';

// Lazy-loading RubberBand WebAssembly
let rubberBandPromise: Promise<any> | null = null;
// Global reference to initialized module
let globalRubberBandModule: any = null;

/**
 * Safely sends a message to the processor port, ensuring JSON compatibility
 * @param port The MessagePort to send to
 * @param message The message data to send
 */
const safelySendMessage = (port: MessagePort, message: any): void => {
  try {
    // Check if message is already a string
    if (typeof message === 'string') {
      port.postMessage(message);
      return;
    }
    
    // If it's an array, ensure it's JSON-compatible
    if (Array.isArray(message)) {
      // Convert objects to JSON-safe format
      const safeArray = message.map(item => 
        typeof item === 'object' && item !== null ? JSON.stringify(item) : item
      );
      port.postMessage(safeArray);
      return;
    }
    
    // For objects, send directly - don't stringify the whole object
    // This avoids the processor trying to parse an already-parsed object
    port.postMessage(message);
  } catch (error) {
    audioLoggers.resampler.error('Error sending message to processor:', error);
  }
};

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
    
    // Extend node with safe message sending
    const originalPostMessage = node.port.postMessage.bind(node.port);
    node.port.postMessage = (message: any) => {
      safelySendMessage(node.port, message);
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