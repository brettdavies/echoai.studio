import { AudioCaptureManager } from '../capture/AudioCaptureManager';
import { AudioCaptureEventType } from '../../../types/audio-capture';
import { AudioSaveManager } from '../save/AudioSaveManager';
import { AudioBatchManager } from '../batch/AudioBatchManager';
import { BatchStrategy } from '../../../types/audio-batch';
import { 
  OrchestratorOptions, 
  OrchestratorState, 
  OrchestratorEventType, 
  OrchestratorEvent,
  PipelineType,
  Pipeline,
  PipelineStep
} from '../../../types/audio-orchestrator';
import { audioLoggers } from '../../../utils/LoggerFactory';

/**
 * Default pipelines configuration
 */
const DEFAULT_PIPELINES: Record<PipelineType, Pipeline> = {
  [PipelineType.CAPTURE_SAVE]: {
    id: PipelineType.CAPTURE_SAVE,
    name: 'Capture and Save',
    steps: [
      { type: 'capture', name: 'capture' },
      { type: 'save', name: 'save' }
    ]
  },
  [PipelineType.CAPTURE_BATCH_SAVE]: {
    id: PipelineType.CAPTURE_BATCH_SAVE,
    name: 'Capture, Batch, and Save',
    steps: [
      { type: 'capture', name: 'capture' },
      { type: 'batch', name: 'batch' },
      { type: 'save', name: 'save' }
    ]
  },
  [PipelineType.CAPTURE_PROCESS_SAVE]: {
    id: PipelineType.CAPTURE_PROCESS_SAVE,
    name: 'Capture, Process, and Save',
    steps: [
      { type: 'capture', name: 'capture' },
      { type: 'process', name: 'process' },
      { type: 'save', name: 'save' }
    ]
  },
  [PipelineType.CAPTURE_BATCH_PROCESS_SAVE]: {
    id: PipelineType.CAPTURE_BATCH_PROCESS_SAVE,
    name: 'Capture, Batch, Process, and Save',
    steps: [
      { type: 'capture', name: 'capture' },
      { type: 'batch', name: 'batch' },
      { type: 'process', name: 'process' },
      { type: 'save', name: 'save' }
    ]
  },
  [PipelineType.CAPTURE_PROCESS_STREAM]: {
    id: PipelineType.CAPTURE_PROCESS_STREAM,
    name: 'Capture, Process, and Stream',
    steps: [
      { type: 'capture', name: 'capture' },
      { type: 'process', name: 'process' },
      { type: 'stream', name: 'stream' }
    ]
  },
  [PipelineType.CAPTURE_BATCH_PROCESS_STREAM]: {
    id: PipelineType.CAPTURE_BATCH_PROCESS_STREAM,
    name: 'Capture, Batch, Process, and Stream',
    steps: [
      { type: 'capture', name: 'capture' },
      { type: 'batch', name: 'batch' },
      { type: 'process', name: 'process' },
      { type: 'stream', name: 'stream' }
    ]
  },
  [PipelineType.CAPTURE_STREAM]: {
    id: PipelineType.CAPTURE_STREAM,
    name: 'Capture and Stream',
    steps: [
      { type: 'capture', name: 'capture' },
      { type: 'stream', name: 'stream' }
    ]
  },
  [PipelineType.CUSTOM]: {
    id: PipelineType.CUSTOM,
    name: 'Custom Pipeline',
    steps: []
  }
};

/**
 * AudioOrchestrator
 * 
 * Coordinates the flow of audio data between capture, process, save, and stream modules.
 */
export class AudioOrchestrator {
  // Module instances
  private captureManager: AudioCaptureManager | null = null;
  
  // State
  private state: OrchestratorState = OrchestratorState.INACTIVE;
  private pipeline: Pipeline;
  private options: OrchestratorOptions;
  
  // Event listeners
  private eventListeners: Map<OrchestratorEventType, ((event: OrchestratorEvent) => void)[]> = new Map();
  
  /**
   * Create a new AudioOrchestrator
   * 
   * @param options Orchestrator options
   */
  constructor(options: OrchestratorOptions) {
    this.options = options;
    
    // Determine pipeline
    if (typeof options.pipeline === 'string') {
      // Check if this is a predefined pipeline type
      const pipelineType = options.pipeline as PipelineType;
      if (DEFAULT_PIPELINES[pipelineType]) {
        this.pipeline = DEFAULT_PIPELINES[pipelineType];
      } else {
        // Custom pipeline name - use empty pipeline
        this.pipeline = {
          id: options.pipeline,
          name: options.pipeline,
          steps: []
        };
      }
    } else {
      // Custom pipeline
      this.pipeline = {
        id: PipelineType.CUSTOM,
        name: 'Custom Pipeline',
        steps: []
      };
    }
    
    audioLoggers.audioCapture.info('AudioOrchestrator: Created new instance', { 
      pipeline: this.pipeline.id,
      options
    });
    
    this.state = OrchestratorState.INACTIVE;
  }
  
  /**
   * Initialize the orchestrator and all required modules
   * 
   * @returns Promise that resolves when initialization is complete
   */
  async initialize(): Promise<void> {
    if (this.state !== OrchestratorState.INACTIVE) {
      audioLoggers.audioCapture.debug(`AudioOrchestrator: Already initialized (state: ${this.state})`);
      return;
    }
    
    audioLoggers.audioCapture.info('AudioOrchestrator: Initializing');
    
    try {
      // Create required modules based on pipeline steps
      for (const step of this.pipeline.steps) {
        await this.initializeStep(step);
      }
      
      this.state = OrchestratorState.INITIALIZED;
      
      this._emitEvent(OrchestratorEventType.INITIALIZED);
      
      audioLoggers.audioCapture.info('AudioOrchestrator: Successfully initialized');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown initialization error';
      audioLoggers.audioCapture.error(`AudioOrchestrator: Initialization error: ${errorMsg}`, error);
      
      this.state = OrchestratorState.ERROR;
      this._emitEvent(OrchestratorEventType.ERROR, { error: errorMsg });
      
      throw error;
    }
  }
  
  /**
   * Initialize a specific pipeline step
   * 
   * @param step The pipeline step to initialize
   */
  private async initializeStep(step: PipelineStep): Promise<void> {
    switch (step.type) {
      case 'capture':
        await this.initializeCaptureStep(step);
        break;
      case 'batch':
        // Batch step doesn't require initialization
        break;
      case 'process':
        // Process step will be initialized when needed
        break;
      case 'save':
        // Save module doesn't require initialization
        break;
      case 'stream':
        // Stream module initialization would go here
        break;
      default:
        audioLoggers.audioCapture.warn(`AudioOrchestrator: Unknown step type: ${step.type}`);
    }
  }
  
  /**
   * Initialize the capture step
   * 
   * @param step The capture step to initialize
   */
  private async initializeCaptureStep(_step: PipelineStep): Promise<void> {
    audioLoggers.audioCapture.debug('AudioOrchestrator: Initializing capture step');
    
    this.captureManager = new AudioCaptureManager(this.options.captureOptions);
    
    // Set up event listeners
    this.captureManager.addEventListener(AudioCaptureEventType.CAPTURE_STOP, this.handleCaptureStop.bind(this));
    
    // Initialize the capture manager
    await this.captureManager.initialize();
  }
  
  /**
   * Connect the orchestrator to an audio source
   * 
   * @param sourceNode The audio source node to capture from
   * @param destinationNode Optional destination node for audio output
   */
  connect(sourceNode: AudioNode, destinationNode?: AudioNode): void {
    if (this.state === OrchestratorState.INACTIVE) {
      audioLoggers.audioCapture.debug('AudioOrchestrator: Auto-initializing before connect');
      this.initialize().then(() => {
        this.performConnect(sourceNode, destinationNode);
      }).catch(error => {
        audioLoggers.audioCapture.error('AudioOrchestrator: Failed to auto-initialize', error);
      });
    } else {
      this.performConnect(sourceNode, destinationNode);
    }
  }
  
  /**
   * Perform the actual connection after ensuring initialization
   * 
   * @param sourceNode The audio source node
   * @param destinationNode Optional destination node
   */
  private performConnect(sourceNode: AudioNode, destinationNode?: AudioNode): void {
    if (!this.captureManager) {
      audioLoggers.audioCapture.error('AudioOrchestrator: Capture manager not initialized');
      return;
    }
    
    audioLoggers.audioCapture.info('AudioOrchestrator: Connecting to audio source');
    this.captureManager.connect(sourceNode, destinationNode);
  }
  
  /**
   * Start the audio pipeline
   */
  start(): void {
    if (this.state !== OrchestratorState.INITIALIZED && this.state !== OrchestratorState.PAUSED) {
      audioLoggers.audioCapture.warn(`AudioOrchestrator: Cannot start, current state is ${this.state}`);
      return;
    }
    
    if (!this.captureManager) {
      audioLoggers.audioCapture.error('AudioOrchestrator: Capture manager not initialized');
      return;
    }
    
    audioLoggers.audioCapture.info('AudioOrchestrator: Starting pipeline');
    
    // Start capture
    if (this.state === OrchestratorState.INITIALIZED) {
      this.captureManager.start();
    } else if (this.state === OrchestratorState.PAUSED) {
      this.captureManager.resume();
    }
    
    this.state = OrchestratorState.RUNNING;
    
    this._emitEvent(OrchestratorEventType.STARTED);
  }
  
  /**
   * Pause the audio pipeline
   */
  pause(): void {
    if (this.state !== OrchestratorState.RUNNING) {
      audioLoggers.audioCapture.warn(`AudioOrchestrator: Cannot pause, current state is ${this.state}`);
      return;
    }
    
    if (!this.captureManager) {
      audioLoggers.audioCapture.error('AudioOrchestrator: Capture manager not initialized');
      return;
    }
    
    audioLoggers.audioCapture.info('AudioOrchestrator: Pausing pipeline');
    
    // Pause capture
    this.captureManager.pause();
    
    this.state = OrchestratorState.PAUSED;
    
    this._emitEvent(OrchestratorEventType.PAUSED);
  }
  
  /**
   * Resume the audio pipeline
   */
  resume(): void {
    if (this.state !== OrchestratorState.PAUSED) {
      audioLoggers.audioCapture.warn(`AudioOrchestrator: Cannot resume, current state is ${this.state}`);
      return;
    }
    
    if (!this.captureManager) {
      audioLoggers.audioCapture.error('AudioOrchestrator: Capture manager not initialized');
      return;
    }
    
    audioLoggers.audioCapture.info('AudioOrchestrator: Resuming pipeline');
    
    // Resume capture
    this.captureManager.resume();
    
    this.state = OrchestratorState.RUNNING;
    
    this._emitEvent(OrchestratorEventType.RESUMED);
  }
  
  /**
   * Stop the audio pipeline
   */
  stop(): void {
    if (this.state !== OrchestratorState.RUNNING && this.state !== OrchestratorState.PAUSED) {
      audioLoggers.audioCapture.warn(`AudioOrchestrator: Cannot stop, current state is ${this.state}`);
      return;
    }
    
    if (!this.captureManager) {
      audioLoggers.audioCapture.error('AudioOrchestrator: Capture manager not initialized');
      return;
    }
    
    audioLoggers.audioCapture.info('AudioOrchestrator: Stopping pipeline');
    
    this.state = OrchestratorState.STOPPING;
    
    // Stop capture
    this.captureManager.stop();
    
    // Further processing will be triggered by the capture stop event
  }
  
  /**
   * Handle the capture stop event
   * 
   * @param event The capture stop event
   */
  private async handleCaptureStop(_event: any): Promise<void> {
    audioLoggers.audioCapture.info('AudioOrchestrator: Capture stopped, processing pipeline');
    
    try {
      // Process the next steps in the pipeline
      await this.processPipelineAfterCapture();
      
      this.state = OrchestratorState.INACTIVE;
      
      this._emitEvent(OrchestratorEventType.STOPPED);
      this._emitEvent(OrchestratorEventType.PIPELINE_COMPLETE);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error during pipeline processing';
      audioLoggers.audioCapture.error(`AudioOrchestrator: Pipeline error: ${errorMsg}`, error);
      
      this.state = OrchestratorState.ERROR;
      this._emitEvent(OrchestratorEventType.ERROR, { error: errorMsg });
    }
  }
  
  /**
   * Process the pipeline steps after capture has completed
   */
  private async processPipelineAfterCapture(): Promise<void> {
    if (!this.captureManager) {
      throw new Error('Capture manager not initialized');
    }
    
    // Get the captured audio
    const { data, sampleRate } = this.captureManager.getCapturedAudio();
    
    if (data.length === 0) {
      audioLoggers.audioCapture.warn('AudioOrchestrator: No audio data captured');
      return;
    }
    
    // Find steps that come after capture
    const captureStepIndex = this.pipeline.steps.findIndex(step => step.type === 'capture');
    if (captureStepIndex === -1) {
      throw new Error('Pipeline missing capture step');
    }
    
    const remainingSteps = this.pipeline.steps.slice(captureStepIndex + 1);
    
    // Process the remaining steps
    let processedData = data;
    let processedSampleRate = sampleRate;
    let batches: Float32Array[] = [];
    let hasBatchedData = false;
    
    for (const step of remainingSteps) {
      switch (step.type) {
        case 'batch':
          // Batch the audio
          if (this.options.batchOptions) {
            audioLoggers.audioCapture.debug('AudioOrchestrator: Batching audio');
            try {
              // Create a batch manager with the configured options
              const batchManager = new AudioBatchManager({
                strategy: this.options.batchOptions.strategy || BatchStrategy.FIXED_SIZE,
                batchSize: this.options.batchOptions.batchSize,
                batchDuration: this.options.batchOptions.batchDuration,
                processIncomplete: this.options.batchOptions.processIncomplete,
                overlap: this.options.batchOptions.overlap
              });
              
              // Process the audio into batches
              batches = batchManager.process(processedData, processedSampleRate);
              hasBatchedData = batches.length > 0;
              
              audioLoggers.audioCapture.info('AudioOrchestrator: Audio batched successfully', { 
                batchCount: batches.length 
              });
              
              this._emitEvent(OrchestratorEventType.PIPELINE_STEP_COMPLETE, { 
                step: 'batch',
                batchCount: batches.length
              });
            } catch (error) {
              audioLoggers.audioCapture.error('AudioOrchestrator: Error batching audio', error);
              this._emitEvent(OrchestratorEventType.ERROR, { 
                step: 'batch',
                error
              });
              
              // Continue with original data if batching fails
              batches = [];
              hasBatchedData = false;
            }
          } else {
            audioLoggers.audioCapture.debug('AudioOrchestrator: Skipping batch step (no options)');
            // If no batch options, treat the entire data as a single batch
            batches = [processedData];
            hasBatchedData = true;
          }
          break;
          
        case 'process':
          // Process the audio - this would use the processing module
          // For now, we'll just pass through the data
          audioLoggers.audioCapture.debug('AudioOrchestrator: Processing step (passthrough)');
          this._emitEvent(OrchestratorEventType.PIPELINE_STEP_COMPLETE, { step: 'process' });
          break;
          
        case 'save':
          // Save the audio
          if (this.options.saveOptions) {
            if (hasBatchedData && batches.length > 0) {
              // Save each batch separately
              audioLoggers.audioCapture.debug(`AudioOrchestrator: Saving ${batches.length} batches`);
              const batchUrls: string[] = [];
              
              for (let i = 0; i < batches.length; i++) {
                try {
                  const batchData = batches[i];
                  const batchFilename = this.options.saveOptions.filename
                    ? `${this.options.saveOptions.filename}_batch${i + 1}`
                    : `audio_batch${i + 1}`;
                  
                  const batchOptions = {
                    ...this.options.saveOptions,
                    filename: batchFilename
                  };
                  
                  const url = await AudioSaveManager.saveAudio(
                    batchData, 
                    processedSampleRate, 
                    batchOptions
                  );
                  
                  batchUrls.push(url);
                  
                  audioLoggers.audioCapture.info(`AudioOrchestrator: Batch ${i + 1}/${batches.length} saved successfully`, { url });
                } catch (error) {
                  audioLoggers.audioCapture.error(`AudioOrchestrator: Error saving batch ${i + 1}/${batches.length}`, error);
                }
              }
              
              this._emitEvent(OrchestratorEventType.PIPELINE_STEP_COMPLETE, { 
                step: 'save',
                batchUrls
              });
            } else {
              // Save the entire processed data
              audioLoggers.audioCapture.debug('AudioOrchestrator: Saving audio');
              try {
                const url = await AudioSaveManager.saveAudio(
                  processedData,
                  processedSampleRate,
                  this.options.saveOptions
                );
                
                audioLoggers.audioCapture.info('AudioOrchestrator: Audio saved successfully', { url });
                this._emitEvent(OrchestratorEventType.PIPELINE_STEP_COMPLETE, { 
                  step: 'save',
                  url
                });
              } catch (error) {
                audioLoggers.audioCapture.error('AudioOrchestrator: Error saving audio', error);
                this._emitEvent(OrchestratorEventType.ERROR, { 
                  step: 'save',
                  error
                });
              }
            }
          } else {
            audioLoggers.audioCapture.debug('AudioOrchestrator: Skipping save step (no options)');
          }
          break;
          
        case 'stream':
          // Stream the audio
          // This would be implemented to handle streaming the audio data
          audioLoggers.audioCapture.debug('AudioOrchestrator: Streaming not implemented yet');
          this._emitEvent(OrchestratorEventType.PIPELINE_STEP_COMPLETE, { step: 'stream' });
          break;
          
        default:
          audioLoggers.audioCapture.warn(`AudioOrchestrator: Unknown step type: ${step.type}`);
      }
    }
    
    // Pipeline complete
    this.state = OrchestratorState.INACTIVE;
    this._emitEvent(OrchestratorEventType.PIPELINE_COMPLETE);
    
    audioLoggers.audioCapture.info('AudioOrchestrator: Pipeline processing complete');
  }
  
  /**
   * Add an event listener
   * 
   * @param eventType The event type to listen for
   * @param callback The callback to call when the event occurs
   */
  addEventListener(eventType: OrchestratorEventType, callback: (event: OrchestratorEvent) => void): void {
    const listeners = this.eventListeners.get(eventType) || [];
    listeners.push(callback);
    this.eventListeners.set(eventType, listeners);
  }
  
  /**
   * Remove an event listener
   * 
   * @param eventType The event type to stop listening for
   * @param callback The callback to remove
   */
  removeEventListener(eventType: OrchestratorEventType, callback: (event: OrchestratorEvent) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (!listeners) return;
    
    const index = listeners.indexOf(callback);
    if (index !== -1) {
      listeners.splice(index, 1);
      this.eventListeners.set(eventType, listeners);
    }
  }
  
  /**
   * Emit an event to all registered listeners
   * 
   * @param type The event type
   * @param details Optional event details
   */
  private _emitEvent(type: OrchestratorEventType, details?: any): void {
    const event: OrchestratorEvent = {
      type,
      timestamp: Date.now(),
      details
    };
    
    const listeners = this.eventListeners.get(type) || [];
    listeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
  }
  
  /**
   * Get the current state of the orchestrator
   * 
   * @returns The current state
   */
  getState(): OrchestratorState {
    return this.state;
  }
  
  /**
   * Get the pipeline definition
   * 
   * @returns The current pipeline
   */
  getPipeline(): Pipeline {
    return this.pipeline;
  }
  
  /**
   * Cleanup all resources
   */
  dispose(): void {
    audioLoggers.audioCapture.info('AudioOrchestrator: Disposing resources');
    
    if (this.captureManager) {
      this.captureManager.dispose();
      this.captureManager = null;
    }
    
    this.state = OrchestratorState.INACTIVE;
    this.eventListeners.clear();
    
    audioLoggers.audioCapture.debug('AudioOrchestrator: Resources disposed');
  }
} 