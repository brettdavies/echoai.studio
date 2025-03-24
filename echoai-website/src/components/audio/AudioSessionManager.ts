/**
 * Manager for audio processing sessions
 */
import { audioLoggers } from '../../utils/LoggerFactory';

export class AudioSessionManager {
  /**
   * Creates a new AudioSessionManager
   */
  constructor(
    private processorCore: {
      clearData: () => void;
      hasAudioData: () => boolean;
      saveAudioFiles: () => Promise<void>;
    },
    private connectionManager: {
      connect: (node: AudioWorkletNode | null) => Promise<boolean>;
      disconnect: (node: AudioWorkletNode | null) => void;
    },
    private workletManager: {
      getNode: () => AudioWorkletNode | null;
    }
  ) {}
  
  /**
   * Starts audio processing
   * @returns A promise that resolves when processing has started
   */
  async startProcessing(): Promise<void> {
    audioLoggers.session.info('Starting audio capture');
    
    // Clear previous data
    this.processorCore.clearData();
    
    // Connect audio nodes
    const workletNode = this.workletManager.getNode();
    await this.connectionManager.connect(workletNode);
  }
  
  /**
   * Stops audio processing and saves files if needed
   * @returns A promise that resolves when processing has stopped
   */
  async stopProcessing(): Promise<void> {
    audioLoggers.session.info('Stopping audio capture');
    
    // Save audio files if we have data
    if (this.processorCore.hasAudioData()) {
      audioLoggers.session.debug('Audio data detected, saving files');
      await this.processorCore.saveAudioFiles();
    } else {
      audioLoggers.session.debug('No audio data detected, skipping save operation');
    }
    
    // Disconnect audio nodes
    const workletNode = this.workletManager.getNode();
    this.connectionManager.disconnect(workletNode);
  }
  
  /**
   * Cleans up all resources
   */
  cleanup(): void {
    // Disconnect audio nodes
    const workletNode = this.workletManager.getNode();
    this.connectionManager.disconnect(workletNode);
  }
} 