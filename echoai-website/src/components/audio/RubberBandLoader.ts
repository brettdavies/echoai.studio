/**
 * Module to handle loading and managing the RubberBand WebAssembly module
 */

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
      console.log('Lazy-loading RubberBand WebAssembly module...');
      rubberBandPromise = import('rubberband-web').then(module => {
        globalRubberBandModule = module;
        return module;
      });
    }
    
    // Wait for RubberBand to initialize
    globalRubberBandModule = await rubberBandPromise;
    
    // Log available exports to help diagnose the structure
    console.log('Available RubberBand exports:', Object.keys(globalRubberBandModule));
    
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
  
  // Create the node
  const node = await module.createRubberBandNode(
    context,
    processorPath,
    options
  );
  
  if (!node) {
    throw new Error('Could not create RubberBand node');
  }
  
  return node;
}; 