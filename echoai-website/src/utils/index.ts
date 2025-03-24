/**
 * Utilities module
 */

// Export WebSocket test utilities
export * from './testWebSocket';

// Initialize browser testing utilities in development
if (process.env.NODE_ENV === 'development') {
  // Import and initialize test utilities
  import('./testWebSocket').then(module => {
    console.log('WebSocket test utilities loaded in development mode');
  }).catch(error => {
    console.error('Failed to load WebSocket test utilities:', error);
  });
} 