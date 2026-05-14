import type { ColorFilter, LayerSpec } from "../types";
import { type ClothingItem, type SlotCn } from "./render-catalog";
import type { ResolvedState } from "./state";
export declare function pushLayer(layers: LayerSpec[], id: string, imgBase: string, stem: string | undefined, z: number, filter?: ColorFilter, extra?: Pick<LayerSpec, "maskSrcs" | "dx" | "dy" | "alpha"> & {
    srcForStem?: (stem: string) => string | undefined;
}): void;
export declare function zFor(item: ClothingItem, fallback: number): number;
export declare function sleeveZ(slotCn: SlotCn, side: "left" | "right", state: ResolvedState): number;
