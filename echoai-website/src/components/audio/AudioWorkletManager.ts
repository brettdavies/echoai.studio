/**
 * Creates and manages an AudioWorklet for processing audio
 */
import { audioLoggers } from '../../utils/LoggerFactory';

export class AudioWorkletManager {
  private workletNode: AudioWorkletNode | null = null;
  private isPlaying = false;
  private onAudioData: ((data: Float32Array) => void) | null = null;
  
  /**
   * Creates a new AudioWorkletManager
   * @param audioContext The AudioContext to use
   */
  constructor(private audioContext: AudioContext) {}
  
  /**
   * Sets the callback to be called when audio data is received
   * @param callback The callback function
   */
  setAudioDataCallback(callback: (data: Float32Array) => void): void {
    this.onAudioData = callback;
  }
  
  /**
   * Sets the playback state
   * @param isPlaying Whether audio is playing
   */
  setPlaybackState(isPlaying: boolean): void {
    this.isPlaying = isPlaying;
    
    // Notify the worklet about the playback state change
    if (this.workletNode) {
      this.workletNode.port.postMessage({ 
        command: 'setPlaybackState', 
        isPlaying 
      });
    }
  }
  
  /**
   * Initializes the AudioWorklet
   * @returns A promise that resolves when the AudioWorklet is ready
   */
  async initialize(): Promise<void> {
    if (this.workletNode) {
      return; // Already initialized
    }
    
    try {
      // Create the AudioWorklet code
      const workletCode = this.createWorkletCode();
      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      
      // Add the module to the AudioContext
      await this.audioContext.audioWorklet.addModule(url);
      
      // Create the AudioWorkletNode
      this.workletNode = new AudioWorkletNode(this.audioContext, 'audio-processor-worklet');
      
      // Set up message handler for audio data
      this.setupMessageHandler();
      
      // Initialize the worklet with current playback state
      this.workletNode.port.postMessage({ 
        command: 'setPlaybackState', 
        isPlaying: this.isPlaying 
      });
      
      URL.revokeObjectURL(url);
    } catch (error) {
      audioLoggers.worklet.error('Failed to initialize AudioWorklet:', error);
      throw error;
    }
  }
  
  /**
   * Gets the AudioWorkletNode
   * @returns The AudioWorkletNode
   */
  getNode(): AudioWorkletNode | null {
    return this.workletNode;
  }
  
  /**
   * Disposes of the AudioWorkletNode
   */
  dispose(): void {
    if (this.workletNode) {
      try {
        this.workletNode.disconnect();
      } catch (error) {
        // Ignore disconnection errors
      }
      this.workletNode = null;
    }
  }
  
  /**
   * Sets up the message handler for the AudioWorkletNode
   */
  private setupMessageHandler(): void {
    if (!this.workletNode) return;
    
    this.workletNode.port.onmessage = (event) => {
      if (event.data.type === 'audioData' && this.isPlaying && this.onAudioData) {
        const audioData = new Float32Array(event.data.audioData);
        this.onAudioData(audioData);
      } else if (event.data.type === 'log') {
        // Handle log messages from the worklet
        switch (event.data.level) {
          case 'info':
            audioLoggers.worklet.info(event.data.message);
            break;
          case 'error':
            audioLoggers.worklet.error(event.data.message);
            break;
          case 'warn':
            audioLoggers.worklet.warn(event.data.message);
            break;
          case 'debug':
            audioLoggers.worklet.debug(event.data.message);
            break;
          default:
            audioLoggers.worklet.info(event.data.message);
        }
      } else if (typeof event.data === 'string') {
        // Handle string messages (older messaging format)
        audioLoggers.worklet.info(event.data);
      }
    };
  }
  
  /**
   * Creates the code for the AudioWorklet
   * @returns The AudioWorklet code as a string
   */
  private createWorkletCode(): string {
    return `
      class AudioProcessorWorklet extends AudioWorkletProcessor {
        constructor() {
          super();
          this.processedFrameCount = 0;
          this.isPlaying = false;
          
          // Set up message handling
          this.port.onmessage = (event) => {
            if (event.data.command === 'setPlaybackState') {
              this.isPlaying = event.data.isPlaying;
            }
          };
        }
        
        process(inputs, outputs) {
          // Only process audio when playing
          if (!this.isPlaying) {
            return true;
          }
          
          // Check for valid input data
          if (!inputs || !inputs[0] || !inputs[0].length || inputs[0][0].length === 0) {
            return true;
          }
          
          this.processedFrameCount++;
          
          // Convert to mono if stereo
          const input = inputs[0];
          const monoData = input.length === 1 ? input[0] : 
            new Float32Array(input[0].length).map((_, i) => 
              input.reduce((sum, channel) => sum + channel[i], 0) / input.length
            );
          
          // Only log once every 1000 frames to reduce console spam
          if (this.processedFrameCount % 1000 === 0) {
            // Format to match our logger output
            const timestamp = new Date().toISOString();
            console.log('[AudioWorklet] ' + timestamp + ' [INFO] [worklet][audio_worklet]: Processing frame ' + this.processedFrameCount);
          }
          
          // Send the audio data to the main thread
          this.port.postMessage({ 
            type: 'audioData',
            audioData: monoData
          });
          
          // Pass the audio through to destination
          if (outputs && outputs[0] && outputs[0].length > 0) {
            for (let channel = 0; channel < outputs[0].length; channel++) {
              if (input[channel]) {
                outputs[0][channel].set(input[channel]);
              }
            }
          }
          
          return true;
        }
      }
      
      // Use try-catch to handle the case where processor is already registered
      try {
        registerProcessor('audio-processor-worklet', AudioProcessorWorklet);
        // Format to match our logger output
        const timestamp = new Date().toISOString();
        console.log('[AudioWorklet] ' + timestamp + ' [INFO] [worklet][audio_worklet]: Processor registered successfully');
      } catch (error) {
        // Format to match our logger output
        const timestamp = new Date().toISOString();
        console.log('[AudioWorklet] ' + timestamp + ' [INFO] [worklet][audio_worklet]: Processor already registered');
      }
    `;
  }
} 