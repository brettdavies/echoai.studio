import { QueuedMessage } from './types';

/**
 * Manages the queue of outgoing WebSocket messages
 * Handles prioritization and batching of messages
 */
export class MessageQueue {
  private messageQueue: QueuedMessage[] = [];
  private maxQueueSize: number = 1000;
  
  /**
   * Creates a new MessageQueue
   * @param maxQueueSize Maximum number of messages to keep in the queue
   */
  constructor(maxQueueSize: number = 1000) {
    this.maxQueueSize = maxQueueSize;
  }
  
  /**
   * Add a message to the queue
   * @param data Message data
   * @param priority Message priority (lower number = higher priority)
   * @param retry Whether to retry sending if it fails
   */
  enqueue(data: string | ArrayBuffer | Blob, priority: number, retry: boolean): void {
    this.messageQueue.push({
      data,
      priority,
      timestamp: Date.now(),
      retry
    });
    
    // Sort queue by priority
    this.messageQueue.sort((a, b) => a.priority - b.priority);
    
    // Limit queue size to prevent memory issues
    if (this.messageQueue.length > this.maxQueueSize) {
      this.messageQueue = this.messageQueue.slice(0, this.maxQueueSize);
    }
  }
  
  /**
   * Get a batch of messages to process
   * @param batchSize Maximum number of messages to process at once
   * @returns Array of queued messages
   */
  dequeue(batchSize: number = 50): QueuedMessage[] {
    return this.messageQueue.splice(0, batchSize);
  }
  
  /**
   * Insert a message at the front of the queue
   * @param message The message to insert
   */
  requeue(message: QueuedMessage): void {
    this.messageQueue.unshift(message);
  }
  
  /**
   * Clear all messages from the queue
   */
  clear(): void {
    this.messageQueue = [];
  }
  
  /**
   * Get the number of messages in the queue
   * @returns The queue length
   */
  getLength(): number {
    return this.messageQueue.length;
  }
  
  /**
   * Check if the queue is empty
   * @returns True if queue is empty
   */
  isEmpty(): boolean {
    return this.messageQueue.length === 0;
  }
} 