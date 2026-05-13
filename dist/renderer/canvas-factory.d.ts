import type { RenderCanvas, RenderContext } from "./types";
export declare function createWorkCanvas(width: number, height: number, options?: CanvasRenderingContext2DSettings): {
    canvas: RenderCanvas;
    ctx: RenderContext;
};
export declare function resizeWorkCanvas(canvas: RenderCanvas, width: number, height: number): void;
