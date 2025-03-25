/**
 * AudioCaptureProcessor
 * 
 * An AudioWorkletProcessor that captures audio data and sends it to the main thread.
 * This processor runs in a separate thread and processes audio in real-time.
 */
class AudioCaptureProcessor extends AudioWorkletProcessor {
  /**
   * Constructor for the AudioCaptureProcessor
   */
  constructor() {
    super();
    
    // Initialize processor state
    this._isCapturing = false;
    this._chunkSize = 4096; // Default chunk size
    this._buffer = [];
    this._totalSamples = 0;
    
    // Set up message handler from main thread
    this.port.onmessage = this._handleMessage.bind(this);
    
    // Send ready message to main thread
    this._sendMessage('processor_ready', { sampleRate: sampleRate });
  }
  
  /**
   * Process audio data
   * 
   * @param {Array<Float32Array[]>} inputs Array of inputs, each containing arrays of channels
   * @param {Array<Float32Array[]>} outputs Array of outputs, each containing arrays of channels
   * @param {Object} parameters AudioParam automation values
   * @returns {boolean} Whether to keep the processor alive
   */
  process(inputs, outputs, parameters) {
    // Get the first input's first channel
    const input = inputs[0];
    
    // Check if we have valid audio input
    if (!input || !input.length || input[0].length === 0) {
      return true; // Keep processor alive
    }
    
    // Only process if we're capturing
    if (this._isCapturing) {
      // Get the first channel of the first input
      const channel = input[0];
      
      // Create a copy of the data to store (important, as channel data is reused)
      const channelCopy = new Float32Array(channel.length);
      channelCopy.set(channel);
      
      // Add to buffer
      this._buffer.push(channelCopy);
      this._totalSamples += channel.length;
      
      // If buffer reached the chunk size, send it to main thread
      if (this._totalSamples >= this._chunkSize) {
        this._sendChunk();
      }
    }
    
    // Pass audio through to output (if any)
    if (outputs[0] && outputs[0].length > 0) {
      for (let channel = 0; channel < outputs[0].length; channel++) {
        if (inputs[0] && inputs[0][channel]) {
          outputs[0][channel].set(inputs[0][channel]);
        }
      }
    }
    
    // Always return true to keep the processor alive
    return true;
  }
  
  /**
   * Handle messages from the main thread
   * 
   * @param {MessageEvent} event The message event
   * @private
   */
  _handleMessage(event) {
    const { type, data } = event.data;
    
    switch (type) {
      case 'start_capture':
        this._isCapturing = true;
        this._chunkSize = data.chunkSize || this._chunkSize;
        break;
        
      case 'stop_capture':
        this._isCapturing = false;
        // Send any remaining data
        if (this._buffer.length > 0) {
          this._sendChunk();
        }
        break;
        
      case 'get_buffer':
        // Send the entire buffer as a single chunk
        this._sendChunk(true);
        break;
        
      case 'reset':
        this._buffer = [];
        this._totalSamples = 0;
        this._isCapturing = false;
        break;
        
      default:
        console.warn(`[AudioCaptureProcessor] Unknown message type: ${type}`);
    }
  }
  
  /**
   * Send the current buffer as a chunk to the main thread
   * 
   * @param {boolean} sendAll Whether to send all samples or just up to chunk size
   * @private
   */
  _sendChunk(sendAll = false) {
    if (this._buffer.length === 0) return;
    
    // Calculate how many samples to send
    const samplesToSend = sendAll ? this._totalSamples : this._chunkSize;
    
    // Create a buffer to hold the combined samples
    const combinedBuffer = new Float32Array(samplesToSend);
    
    let samplesAdded = 0;
    let buffersToRemove = 0;
    
    // Fill the combined buffer with samples from the buffer array
    for (let i = 0; i < this._buffer.length && samplesAdded < samplesToSend; i++) {
      const currentBuffer = this._buffer[i];
      const samplesRemaining = samplesToSend - samplesAdded;
      const samplesToCopy = Math.min(currentBuffer.length, samplesRemaining);
      
      // Copy samples from current buffer to combined buffer
      combinedBuffer.set(currentBuffer.subarray(0, samplesToCopy), samplesAdded);
      
      samplesAdded += samplesToCopy;
      
      // If we used the entire buffer, mark it for removal
      if (samplesToCopy === currentBuffer.length) {
        buffersToRemove++;
      } else if (samplesToCopy < currentBuffer.length) {
        // If we used part of the buffer, keep the rest for later
        this._buffer[i] = currentBuffer.subarray(samplesToCopy);
      }
    }
    
    // Remove used buffers
    if (buffersToRemove > 0) {
      this._buffer = this._buffer.slice(buffersToRemove);
    }
    
    // Update total samples
    this._totalSamples -= samplesAdded;
    
    // Send the combined buffer to the main thread
    this._sendMessage('chunk_processed', {
      audioData: combinedBuffer,
      timestamp: currentTime
    });
  }
  
  /**
   * Send a message to the main thread
   * 
   * @param {string} type The message type
   * @param {Object} payload The message payload
   * @private
   */
  _sendMessage(type, payload) {
    this.port.postMessage({
      type,
      timestamp: currentTime,
      payload
    });
  }
}

// Register the processor
registerProcessor('audio-capture-processor', AudioCaptureProcessor); 