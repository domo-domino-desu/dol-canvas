import type { LayerSpec } from "../types";
import type { RenderError } from "./types";
export declare class AnimationController {
    private canvas;
    private sourceLayers;
    private compiledLayers;
    private onError?;
    private rafId;
    private states;
    private compileVersion;
    constructor(canvas: HTMLCanvasElement, layers: LayerSpec[], onError?: (e: RenderError) => void);
    /** Replace the layer list (e.g., after payload change) without stopping. */
    updateLayers(layers: LayerSpec[]): Promise<boolean>;
    start(): Promise<void>;
    stop(): void;
    private tick;
    private draw;
    private ensureAnimationStates;
}
