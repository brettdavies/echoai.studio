import { useEffect, useRef, useState } from 'react';
import { AudioOrchestrator } from '../components/audio/orchestrator';
import { BatchStrategy } from '../types/audio-batch';
import { PipelineType, OrchestratorState } from '../types/audio-orchestrator';
import { audioLoggers } from '../utils/LoggerFactory';

interface UseAudioOrchestratorParams {
  enabled: boolean;
  audioContext: AudioContext | null;
  sourceNode: MediaElementAudioSourceNode | null;
  isPlaying: boolean;
}

interface UseAudioOrchestratorResult {
  isCapturing: boolean;
  error: Error | null;
}

// Helper methods to check orchestrator state
const isActive = (orchestrator: AudioOrchestrator) => {
  return (orchestrator as any).state === OrchestratorState.RUNNING;
};

const isPaused = (orchestrator: AudioOrchestrator) => {
  return (orchestrator as any).state === OrchestratorState.PAUSED;
};

export function useAudioOrchestrator({
  enabled,
  audioContext,
  sourceNode,
  isPlaying
}: UseAudioOrchestratorParams): UseAudioOrchestratorResult {
  // Store orchestrator instance in a ref to persist across renders
  const orchestratorRef = useRef<AudioOrchestrator | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Initialize orchestrator when hook is first used and enabled
  useEffect(() => {
    if (!enabled) return;
    
    try {
      audioLoggers.orchestrator.info('Initializing audio orchestrator');
      const orchestrator = new AudioOrchestrator({
        pipeline: PipelineType.CAPTURE_BATCH_SAVE,
        captureOptions: {
          resample: true,
          targetSampleRate: 16000
        },
        batchOptions: {
          strategy: BatchStrategy.TIME_BASED,
          batchDuration: 0.25, // 250ms chunks
          processIncomplete: true
        }
      });
      
      orchestrator.initialize()
        .then(() => {
          orchestratorRef.current = orchestrator;
          audioLoggers.orchestrator.info('Audio orchestrator initialized successfully');
        })
        .catch(err => {
          audioLoggers.orchestrator.error('Failed to initialize audio orchestrator:', err);
          setError(err instanceof Error ? err : new Error(String(err)));
        });
      
      // Cleanup when disabled or component unmounts
      return () => {
        if (orchestratorRef.current) {
          audioLoggers.orchestrator.info('Disposing audio orchestrator');
          orchestratorRef.current.dispose();
          orchestratorRef.current = null;
          setIsCapturing(false);
        }
      };
    } catch (err) {
      audioLoggers.orchestrator.error('Error in orchestrator initialization:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      return undefined;
    }
  }, [enabled]);
  
  // Connect to audio source when available
  useEffect(() => {
    if (!enabled || !orchestratorRef.current || !audioContext || !sourceNode) {
      return;
    }
    
    try {
      audioLoggers.orchestrator.info('Connecting orchestrator to audio source');
      orchestratorRef.current.connect(sourceNode);
    } catch (err) {
      audioLoggers.orchestrator.error('Error connecting to audio source:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [enabled, audioContext, sourceNode]);
  
  // Sync orchestrator state with player state
  useEffect(() => {
    if (!enabled || !orchestratorRef.current) {
      return;
    }
    
    try {
      if (isPlaying) {
        // Start or resume capturing
        if (isPaused(orchestratorRef.current)) {
          audioLoggers.audioCapture.info('orchestrator: Resuming audio orchestrator');
          orchestratorRef.current.resume();
        } else if (!isActive(orchestratorRef.current)) {
          audioLoggers.audioCapture.info('orchestrator: Starting audio orchestrator');
          orchestratorRef.current.start();
        }
        setIsCapturing(true);
      } else {
        // Pause capturing
        if (isActive(orchestratorRef.current) && !isPaused(orchestratorRef.current)) {
          audioLoggers.audioCapture.info('orchestrator: Pausing audio orchestrator');
          orchestratorRef.current.pause();
        }
        setIsCapturing(false);
      }
    } catch (err) {
      audioLoggers.orchestrator.error('Error syncing orchestrator state:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [enabled, isPlaying]);
  
  return {
    isCapturing,
    error
  };
} 