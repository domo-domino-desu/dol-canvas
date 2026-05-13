import type { LayerSpec, CharacterPayload } from "../types";
/**
 * Convert a Chinese character payload into a sorted list of LayerSpecs.
 * All src values will be absolute URLs using baseUrl as prefix.
 */
export declare function buildLayers(payload: CharacterPayload, baseUrl: string): LayerSpec[];
