import type { ColorFilter, LayerSpec } from "@/types";
import { colorsData } from "@/data/generated";

export type MaterialType = "cloth" | "hair" | "eyes" | "skin";

export type MaterialColorEntry = {
  variable: string;
  name: string;
  cnName: string;
  filter: ColorFilter;
};

const materialColors = {
  cloth: (colorsData as typeof colorsData).clothes as MaterialColorEntry[],
  hair: (colorsData as typeof colorsData).hair as MaterialColorEntry[],
  eyes: (colorsData as typeof colorsData).eyes as MaterialColorEntry[],
  skin: [] as MaterialColorEntry[],
} satisfies Record<MaterialType, MaterialColorEntry[]>;

const materialDefaults = {
  cloth: {
    blendMode: "hard-light",
  },
  hair: {
    desaturate: true,
    blendMode: "hard-light",
  },
  eyes: {
    desaturate: true,
    blendMode: "hard-light",
  },
  skin: {
    blendMode: "hard-light",
  },
} satisfies Record<MaterialType, ColorFilter>;

export function findMaterialColor(
  materialType: MaterialType,
  colorName?: string,
): MaterialColorEntry | undefined {
  if (!colorName) return undefined;
  return materialColors[materialType].find(
    (entry) =>
      entry.cnName === colorName || entry.variable === colorName || entry.name === colorName,
  );
}

export function materialFilter(
  materialType: MaterialType,
  colorName?: string,
): ColorFilter | undefined {
  const entry = findMaterialColor(materialType, colorName);
  if (!entry) return undefined;
  const defaults = materialDefaults[materialType];
  return {
    ...defaults,
    ...entry.filter,
    blendMode:
      materialType === "cloth"
        ? defaults.blendMode
        : (entry.filter.blendMode ?? defaults.blendMode),
  };
}

export function applyMaterial(
  baseLayer: LayerSpec,
  colorName: string | undefined,
  materialType: MaterialType,
): LayerSpec {
  const filter = materialFilter(materialType, colorName);
  return filter ? { ...baseLayer, filter } : baseLayer;
}
