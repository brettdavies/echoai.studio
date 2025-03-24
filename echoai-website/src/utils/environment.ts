/**
 * Environment utilities for checking application modes and environment settings
 */

/**
 * Check if the application is running in development mode
 * @returns boolean indicating if in development mode
 */
export const isDevelopmentMode = (): boolean => {
  // Check for Vite's environment variables
  try {
    if (import.meta.env?.MODE === 'development') {
      return true;
    }
  } catch (e) {
    // Fallback to check Node environment
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
      return true;
    }
  }
  
  return false;
};

/**
 * Check if the application is running in debug mode
 * This is true only in development mode
 * @returns boolean indicating if in debug mode
 */
export const isDebugMode = (): boolean => {
  // Always return true to enable audio downloads in all environments
  return true;
};

/**
 * Check if the application is running in production mode
 * @returns boolean indicating if in production mode
 */
export const isProductionMode = (): boolean => {
  // Check for Vite's environment variables
  try {
    if (import.meta.env?.MODE === 'production') {
      return true;
    }
  } catch (e) {
    // Fallback to check Node environment
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') {
      return true;
    }
  }
  
  return !isDevelopmentMode();
}; 