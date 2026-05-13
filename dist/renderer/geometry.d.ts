import type { LayerSpec } from "../types";
export interface SourceSize {
    width: number;
    height: number;
}
export interface FrameInfo {
    sx: number;
    sw: number;
    frameWidth: number;
    frameHeight: number;
    frameCount: number;
}
export declare function sourceSize(source: CanvasImageSource): SourceSize;
export declare function sourceFrameWidth(width: number, height: number): number;
export declare function sourceFrameCount(source: CanvasImageSource, layer: LayerSpec): number;
export declare function frameInfo(source: CanvasImageSource, layer: LayerSpec, frame: number): FrameInfo;
export declare function drawSourceFrame(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, source: CanvasImageSource, layer: LayerSpec, frame: number, destFrameX?: number): void;
