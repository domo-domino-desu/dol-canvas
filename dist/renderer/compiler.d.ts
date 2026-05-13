import type { LayerSpec } from "../types";
import type { CompiledLayer, RenderError, RenderResult } from "./types";
export declare function compileLayers(canvas: HTMLCanvasElement, layers: LayerSpec[], onError?: (e: RenderError) => void): Promise<{
    layers: CompiledLayer[];
    result: RenderResult;
}>;
