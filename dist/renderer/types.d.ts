import type { LayerSpec } from "../types";
export interface RenderError {
    src: string;
    error: Error;
}
export interface RenderResult {
    errors: RenderError[];
}
export type RenderCanvas = HTMLCanvasElement | OffscreenCanvas;
export type RenderContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
export interface CompiledLayer {
    id: string;
    source: CanvasImageSource;
    z: number;
    dx: number;
    dy: number;
    frameWidth: number;
    frameHeight: number;
    frameCount: number;
    animation?: LayerSpec["animation"];
    alpha: number;
    frame: number;
}
export type FrameResolver = (layer: CompiledLayer) => number;
