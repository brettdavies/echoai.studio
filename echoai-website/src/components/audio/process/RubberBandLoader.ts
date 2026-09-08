/**
 * Module to handle loading and managing the RubberBand WebAssembly module
 */

import type { RubberBandNode } from 'rubberband-web';
import { audioLoggers } from '../../../utils/LoggerFactory';
import { RubberBandNodeOptions } from './RubberBandConfig';

type RubberBandModule = typeof import('rubberband-web');

// Lazy-loading RubberBand WebAssembly
let rubberBandPromise: Promise<RubberBandModule> | null = null;
// Global reference to initialized module
let globalRubberBandModule: RubberBandModule | null = null;

/**
 * Safely sends a message to the processor port, ensuring JSON compatibility
 * @param send The underlying post function of the processor port
 * @param message The message data to send
 */
const safelySendMessage = (send: (message: unknown) => void, message: unknown): void => {
  try {
    // Check if message is already a string
    if (typeof message === 'string') {
      send(message);
      return;
    }

    // If it's an array, ensure it's JSON-compatible
    if (Array.isArray(message)) {
      // Convert objects to JSON-safe format
      const safeArray = message.map(item =>
        typeof item === 'object' && item !== null ? JSON.stringify(item) : item
      );
      send(safeArray);
      return;
    }

    // For objects, send directly - don't stringify the whole object
    // This avoids the processor trying to parse an already-parsed object
    send(message);
  } catch (error) {
    audioLoggers.resampler.error('Error sending message to processor:', error);
  }
};

/**
 * Loads the RubberBand WebAssembly module
 * @returns A promise that resolves to the loaded module
 */
export const loadRubberBandModule = async (): Promise<RubberBandModule> => {
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
    const module = await rubberBandPromise;
    globalRubberBandModule = module;

    // Log available exports to help diagnose the structure
    audioLoggers.resampler.debug('Available RubberBand exports:', Object.keys(module));

    // Check if module has the createRubberBandNode method
    if (typeof module.createRubberBandNode !== 'function') {
      throw new Error('RubberBand module missing createRubberBandNode method');
    }

    return module;
  }

  return globalRubberBandModule;
};

/**
 * Gets the currently loaded RubberBand module
 * @returns The loaded module or null if not loaded
 */
export const getRubberBandModule = (): RubberBandModule | null => {
  return globalRubberBandModule;
};

/**
 * Creates a RubberBand node using the loaded module
 * @param context The audio context (can be regular or offline)
 * @param processorPath Path to the processor script
 * @param options Configuration options
 * @returns A promise that resolves to the created node
 */
export const createRubberBandNode = async (
  context: BaseAudioContext,
  processorPath: string,
  options: RubberBandNodeOptions
): Promise<RubberBandNode> => {
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
    node.port.postMessage = (message: unknown) => {
      safelySendMessage(originalPostMessage, message);
    };

    // Force immediate message to test communication
    node.port.postMessage({
      command: 'debug',
      value: 'Testing worklet communication'
    });

    // Verify required methods are available
    const requiredMethods = ['setPitch', 'setTempo', 'setHighQuality'] as const;
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
