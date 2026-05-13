import type { LayerSpec, CharacterPayload } from "@/types";
import { buildBodyLayers } from "@/character/body";
import { buildFaceLayers } from "@/character/face";
import { buildHairLayers } from "@/character/hair";
import { buildClothingLayers } from "@/character/clothing";
import { buildTransformLayers } from "@/character/transformation";
import { resolveCharacterState } from "@/character/state";

/**
 * Convert a Chinese character payload into a sorted list of LayerSpecs.
 * All src values will be absolute URLs using baseUrl as prefix.
 */
export function buildLayers(payload: CharacterPayload, baseUrl: string): LayerSpec[] {
  const state = resolveCharacterState(payload, baseUrl);

  const layers: LayerSpec[] = [
    ...buildBodyLayers(state),
    ...buildFaceLayers(state),
    ...buildHairLayers(state),
    ...buildClothingLayers(state),
    ...buildTransformLayers(state),
  ];

  // Sort by z ascending (renderer also sorts, but pre-sort is useful for debugging)
  layers.sort((a, b) => a.z - b.z);

  return layers;
}
