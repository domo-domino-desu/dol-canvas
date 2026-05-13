import type { LayerSpec } from "../types";
import type { ResolvedState } from "./state";
export declare function buildClothingLayers(state: ResolvedState): LayerSpec[];
export declare function getClothingBranchHints(slotCn: string, name: string): Record<string, boolean> | undefined;
