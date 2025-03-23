/**
 * Utilities for handling AudioContext interactions
 */

/**
 * Sets up event handlers for user interaction to resume AudioContext
 * This is necessary for browsers with autoplay restrictions
 * 
 * @param connectionManager The connection manager to use
 * @returns A cleanup function to remove the event listeners
 */
export const setupUserInteractionHandlers = (
  ensureContextResumed: () => Promise<void>
): (() => void) => {
  // Function to handle user interaction
  const handleUserInteraction = () => {
    // Resume the AudioContext
    ensureContextResumed();
    
    // Remove event listeners after first interaction
    document.removeEventListener('click', handleUserInteraction);
    document.removeEventListener('touchstart', handleUserInteraction);
    document.removeEventListener('keydown', handleUserInteraction);
  };
  
  // Add event listeners for user interaction
  document.addEventListener('click', handleUserInteraction);
  document.addEventListener('touchstart', handleUserInteraction);
  document.addEventListener('keydown', handleUserInteraction);
  
  // Return cleanup function
  return () => {
    document.removeEventListener('click', handleUserInteraction);
    document.removeEventListener('touchstart', handleUserInteraction);
    document.removeEventListener('keydown', handleUserInteraction);
  };
}; 