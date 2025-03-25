import { useState, useEffect, useCallback } from 'react';
import { audioLoggers } from '../utils/LoggerFactory';

interface UseDashScriptLoaderReturn {
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  reloadScript: () => Promise<boolean>;
}

/**
 * Hook for loading the dash.js script from CDN
 */
export function useDashScriptLoader(): UseDashScriptLoaderReturn {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Function to load the dash.js script
  const loadDashScript = useCallback((): Promise<boolean> => {
    return new Promise<boolean>((resolve, reject) => {
      // Skip if we're in a server environment
      if (typeof window === 'undefined') {
        reject(new Error('Cannot load script in server environment'));
        return;
      }

      setIsLoading(true);
      setError(null);

      // Check if script already exists
      if (document.querySelector('script[src*="dash.all.min.js"]')) {
        // If script exists but dashjs is not defined, remove and reload
        if (!window.dashjs) {
          audioLoggers.dashPlayer.info('Found dash.js script tag but no dashjs object, reloading...');
          const oldScript = document.querySelector('script[src*="dash.all.min.js"]');
          if (oldScript) {
            oldScript.remove();
          }
        } else {
          audioLoggers.dashPlayer.info('dash.js already loaded');
          setIsLoaded(true);
          setIsLoading(false);
          resolve(true);
          return;
        }
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.dashjs.org/latest/dash.all.min.js';
      script.async = true;
      
      script.onload = () => {
        // Add a safety check before resolving
        if (window.dashjs) {
          audioLoggers.dashPlayer.info('dash.js successfully loaded');
          setIsLoaded(true);
          setIsLoading(false);
          resolve(true);
        } else {
          audioLoggers.dashPlayer.warn('Script loaded but dashjs object not found');
          // If dashjs still not defined after script load, try global assignment
          const checkInterval = setInterval(() => {
            if (window.dashjs) {
              clearInterval(checkInterval);
              setIsLoaded(true);
              setIsLoading(false);
              resolve(true);
            }
          }, 100);
          
          // Give up after 2 seconds
          setTimeout(() => {
            clearInterval(checkInterval);
            const errorMsg = 'dash.js failed to initialize after script load';
            audioLoggers.dashPlayer.error(errorMsg);
            setError(errorMsg);
            setIsLoading(false);
            reject(new Error(errorMsg));
          }, 2000);
        }
      };

      script.onerror = () => {
        const errorMsg = 'Failed to load dash.js script';
        audioLoggers.dashPlayer.error(errorMsg);
        setError(errorMsg);
        setIsLoading(false);
        reject(new Error(errorMsg));
      };

      document.head.appendChild(script);
    });
  }, []);

  // Function to reload the script (useful for error recovery)
  const reloadScript = useCallback(async (): Promise<boolean> => {
    // If already loaded successfully, no need to reload
    if (isLoaded && window.dashjs) return true;
    
    // Remove existing script if any
    const script = document.querySelector('script[src*="dash.all.min.js"]');
    if (script) {
      script.remove();
    }
    
    setIsLoaded(false);
    
    try {
      await loadDashScript();
      return true;
    } catch (err) {
      return false;
    }
  }, [isLoaded, loadDashScript]);

  // Load the script on mount
  useEffect(() => {
    // Skip if already loaded or loading
    if (isLoaded || isLoading) return;
    
    let isMounted = true;
    
    loadDashScript()
      .catch(_err => {
        if (!isMounted) return;
        setError('Could not load the dash.js library. Please check your internet connection.');
      });
      
    return () => {
      isMounted = false;
    };
  }, [isLoaded, isLoading, loadDashScript]);

  return {
    isLoaded,
    isLoading,
    error,
    reloadScript
  };
} 