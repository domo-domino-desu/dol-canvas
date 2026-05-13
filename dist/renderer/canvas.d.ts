import type { LayerSpec } from "../types";
import { clearImageCache } from "./image-cache";
import type { CompiledLayer, FrameResolver, RenderError, RenderResult } from "./types";
export { clearImageCache };
export type { RenderError, RenderResult };
export declare function drawCompiledLayers(canvas: HTMLCanvasElement, layers: CompiledLayer[], frameResolver?: FrameResolver): void;
/**
 * Render a list of LayerSpecs onto the given canvas.
 * Layers are compiled first so static rendering and animation share the same path.
 */
export declare function renderLayers(canvas: HTMLCanvasElement, layers: LayerSpec[], onError?: (e: RenderError) => void): Promise<RenderResult>;
