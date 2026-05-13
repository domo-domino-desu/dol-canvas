import type { ColorFilter } from "../types";
import type { RenderContext } from "./types";
/**
 * Apply a ColorFilter into an existing context.
 * Replicates DoL's rendering pipeline: desaturate -> brightness -> contrast -> blend.
 */
export declare function applyFilterToContext(ctx: RenderContext, img: CanvasImageSource, filter?: ColorFilter): void;
export declare function applyFilter(img: CanvasImageSource, filter?: ColorFilter): CanvasImageSource;
