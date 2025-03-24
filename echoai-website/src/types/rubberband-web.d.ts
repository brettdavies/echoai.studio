declare module 'rubberband-web' {
  /**
   * Creates a RubberBand AudioWorkletNode
   * @param context The AudioContext to create the node in
   * @param processorPath Path to the processor script
   * @param options Configuration options
   * @returns A Promise that resolves to the created AudioWorkletNode
   */
  export function createRubberBandNode(
    context: BaseAudioContext,
    processorPath: string,
    options: {
      numberOfInputs: number;
      numberOfOutputs: number;
      processorOptions: any;
    }
  ): Promise<AudioWorkletNode & {
    setPitch(scale: number): void;
    setTempo(tempo: number): void;
    setHighQuality(enabled: boolean): void;
  }>;

  /**
   * Creates a RubberBand node configured for Tone.js
   */
  export function createRubberBandNodeForToneJS(
    context: BaseAudioContext,
    processorPath: string,
    options: any
  ): Promise<any>;
} 