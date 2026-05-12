import type { LayerSpec, CharacterPayload, BuildContext } from "@/types";
import { resolveBodyShape } from "@/character/body";
import { buildBodyLayers } from "@/character/body";
import { buildFaceLayers } from "@/character/face";
import { buildHairLayers } from "@/character/hair";
import { buildClothingLayers } from "@/character/clothing";
import { buildTransformLayers } from "@/character/transformation";

/**
 * Convert a Chinese character payload into a sorted list of LayerSpecs.
 * All src values will be absolute URLs using baseUrl as prefix.
 */
export function buildLayers(payload: CharacterPayload, baseUrl: string): LayerSpec[] {
  const bodyShape = resolveBodyShape(payload.身形);
  const breastSize = payload.胸部 ?? 3;

  const ctx: BuildContext = { payload, baseUrl, bodyShape, breastSize };

  const layers: LayerSpec[] = [
    ...buildBodyLayers(ctx),
    ...buildFaceLayers(ctx),
    ...buildHairLayers(ctx),
    ...buildClothingLayers(ctx),
    ...buildTransformLayers(ctx),
  ];

  // Sort by z ascending (renderer also sorts, but pre-sort is useful for debugging)
  layers.sort((a, b) => a.z - b.z);

  return layers;
}
