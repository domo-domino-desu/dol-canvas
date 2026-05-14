import type { ColorFilter, LayerSpec } from "../types";
export type MaterialType = "cloth" | "hair" | "eyes" | "skin" | "condom";
export type MaterialColorEntry = {
    variable: string;
    name: string;
    cnName: string;
    filter: ColorFilter;
};
export declare function findMaterialColor(materialType: MaterialType, colorName?: string): MaterialColorEntry | undefined;
export declare function materialFilter(materialType: MaterialType, colorName?: string): ColorFilter | undefined;
export declare function applyMaterial(baseLayer: LayerSpec, colorName: string | undefined, materialType: MaterialType): LayerSpec;
