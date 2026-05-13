import type { CharacterPayload, LayerSpec } from "./types";
import { type RenderError } from "./renderer/canvas";
interface DolCanvasConfig {
    baseUrl: string;
}
export declare class DolCanvas {
    private _canvas;
    private _baseUrl;
    private _rendering;
    private _pending;
    private _anim;
    constructor(canvas: HTMLCanvasElement, baseUrl?: string);
    /** Override the CDN base URL globally (e.g., for local testing). */
    static configure(config: Partial<DolCanvasConfig>): void;
    /**
     * Render a character payload once (static, no animation).
     * Queues one pending re-render if a render is already in progress.
     */
    render(payload: CharacterPayload, onError?: (e: RenderError) => void): Promise<void>;
    /**
     * Start animated rendering (blink loop).
     * Pre-loads images, then begins the blink animation.
     * Call stopAnimation() or render() to stop.
     */
    startAnimation(payload: CharacterPayload, onError?: (e: RenderError) => void): Promise<void>;
    /**
     * Update the payload while animation is running.
     * If animation is not active, falls back to a static render.
     */
    updateAnimation(payload: CharacterPayload, onError?: (e: RenderError) => void): Promise<void>;
    /** Stop the animation loop (restores eyes-open state). */
    stopAnimation(): void;
    get isAnimating(): boolean;
    /** Render from pre-built LayerSpecs directly (bypasses builder). */
    renderLayers(layers: LayerSpec[], onError?: (e: RenderError) => void): Promise<void>;
    clear(): void;
    static clearCache(): void;
}
export {};
