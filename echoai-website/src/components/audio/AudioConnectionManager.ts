/**
 * Manages audio connections between nodes in the Web Audio API
 */
import { audioLoggers } from '../../utils/LoggerFactory';

export class AudioConnectionManager {
  private isConnected: boolean = false;
  
  /**
   * Creates a new AudioConnectionManager
   */
  constructor(
    private audioContext: AudioContext,
    private sourceNode: MediaElementAudioSourceNode | null
  ) {}
  
  /**
   * Updates the source node
   * @param sourceNode The new source node
   */
  updateSourceNode(sourceNode: MediaElementAudioSourceNode): void {
    this.sourceNode = sourceNode;
  }
  
  /**
   * Connects the audio nodes
   * @param workletNode The AudioWorkletNode to connect
   * @returns A promise that resolves when the connection is made
   */
  async connect(workletNode: AudioWorkletNode | null): Promise<boolean> {
    if (!workletNode || !this.sourceNode) {
      return false;
    }
    
    try {
      // Ensure audio context is running
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      // Disconnect first if already connected
      if (this.isConnected) {
        try {
          workletNode.disconnect();
        } catch (err) {
          // Ignore disconnection errors
        }
        this.isConnected = false;
      }
      
      // Connect the audio graph
      this.sourceNode.connect(workletNode);
      workletNode.connect(this.audioContext.destination);
      this.isConnected = true;
      
      return true;
    } catch (error) {
      audioLoggers.session.error('Error connecting audio nodes:', error);
      return false;
    }
  }
  
  /**
   * Disconnects the audio nodes
   * @param workletNode The AudioWorkletNode to disconnect
   */
  disconnect(workletNode: AudioWorkletNode | null): void {
    if (workletNode && this.isConnected) {
      try {
        workletNode.disconnect();
        this.isConnected = false;
      } catch (error) {
        // Ignore disconnection errors
      }
    }
  }
  
  /**
   * Checks if the nodes are connected
   */
  isNodeConnected(): boolean {
    return this.isConnected;
  }
  
  /**
   * Ensures the AudioContext is resumed (important for browsers with autoplay restrictions)
   */
  async ensureAudioContextResumed(): Promise<void> {
    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        audioLoggers.session.info('AudioContext resumed successfully');
      } catch (error) {
        audioLoggers.session.warn('Failed to resume AudioContext:', error);
      }
    }
  }
} 