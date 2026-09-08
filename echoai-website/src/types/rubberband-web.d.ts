declare module 'rubberband-web' {
  /**
   * AudioWorkletNode extended with the RubberBand pitch/tempo controls
   */
  export interface RubberBandNode extends AudioWorkletNode {
    setPitch(pitch: number): void;
    setTempo(tempo: number): void;
    setHighQuality(enabled: boolean): void;
    close(): void;
  }

  /**
   * Creates a RubberBand AudioWorkletNode
   * @param context The AudioContext to create the node in
   * @param url Path to the processor script
   * @param options Configuration options
   * @returns A Promise that resolves to the created node
   */
  export function createRubberBandNode(
    context: BaseAudioContext,
    url: string,
    options?: AudioWorkletNodeOptions
  ): Promise<RubberBandNode>;

  /**
   * Creates a RubberBand node configured for Tone.js
   */
  export function createRubberBandNodeForToneJS(url: string): Promise<RubberBandNode>;
}
