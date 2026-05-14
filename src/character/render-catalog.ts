import type { ColorFilter } from "@/types";
import { Z } from "@/data/zindex";
import { clothesData } from "@/data/generated";
import renderRules from "@/data/overrides/render-rules.json";
import { materialFilter } from "@/character/material";
import { runtimeClothingItems } from "@/runtime-assets";

export type BreastMap = Record<string, number | null>;

export type ClothingItem = {
  name: string;
  cnName: string;
  colorOptions: string[];
  accColorOptions: string[];
  patternOptions?: string[];
  patternLayer?: string;
  states: string[];
  numeric: string[];
  armVariants: string[];
  allFiles?: string[];
  hasAcc: boolean;
  accessory?: number;
  accessoryIntegrityImg?: boolean;
  mainImage?: number;
  accImage?: number;
  leftImage?: number;
  rightImage?: number;
  coverImage?: number;
  sleeveImg?: boolean;
  sleeveAccImg?: boolean;
  sleeveColour?: string | number;
  breastImg?: number | BreastMap;
  breastAccImg?: number | BreastMap;
  breastPattern?: boolean;
  backImg?: number | string;
  backImgAcc?: number | string;
  backImgColour?: string;
  backImgAccColour?: string;
  backIntegrityImg?: boolean;
  maskImg?: number;
  altposition?: string;
  altdisabled?: string[];
  hood?: number;
  hoodposition?: string;
  outfitPrimaryHead?: boolean;
  outfitSecondary?: boolean;
  pregType?: number | string;
  formfitting?: number;
  notuck?: number;
  onePiece?: number;
  hasCollar?: number;
  penisImg?: number;
  penisAccImg?: number;
  branchHints?: Record<string, boolean>;
  detail?: number;
  zIndex?: string;
};

type ClothesJson = typeof clothesData;

export type SlotCn =
  | "上装"
  | "下装"
  | "内衣上装"
  | "内衣下装"
  | "头饰"
  | "面饰"
  | "颈部"
  | "手饰"
  | "手持物品"
  | "鞋子"
  | "腿饰"
  | "私部装备";

export type SlotDef = { cn: SlotCn; z: number; dir: string; data: ClothingItem[] };

export const BREATH = "playerBreath";

export const SLOTS: SlotDef[] = [
  { cn: "上装", z: Z.UPPER, dir: "upper", data: (clothesData as ClothesJson).upper },
  { cn: "下装", z: Z.LOWER, dir: "lower", data: (clothesData as ClothesJson).lower },
  {
    cn: "内衣上装",
    z: Z.UNDER_UPPER,
    dir: "under-upper",
    data: (clothesData as ClothesJson)["under-upper"],
  },
  {
    cn: "内衣下装",
    z: Z.UNDER_LOWER,
    dir: "under-lower",
    data: (clothesData as ClothesJson)["under-lower"],
  },
  { cn: "头饰", z: Z.HEAD, dir: "head", data: (clothesData as ClothesJson).head },
  { cn: "面饰", z: Z.FACE_WEAR, dir: "face", data: (clothesData as ClothesJson).face },
  { cn: "颈部", z: Z.NECK, dir: "neck", data: (clothesData as ClothesJson).neck },
  { cn: "手饰", z: Z.HANDS, dir: "hands", data: (clothesData as ClothesJson).hands },
  { cn: "手持物品", z: Z.HANDHELD, dir: "handheld", data: (clothesData as ClothesJson).handheld },
  { cn: "鞋子", z: Z.FEET, dir: "feet", data: (clothesData as ClothesJson).feet },
  { cn: "腿饰", z: Z.LEGS, dir: "legs", data: (clothesData as ClothesJson).legs },
  { cn: "私部装备", z: Z.GENITALS, dir: "genitals", data: (clothesData as ClothesJson).genitals },
];

export function slotsWithRuntime(): SlotDef[] {
  return SLOTS.map((slot) => ({
    ...slot,
    data: [...slot.data, ...runtimeClothingItems(slot.cn)],
  }));
}

const clothingTags = renderRules.clothingTags as Record<string, Record<string, string[]>>;

export const clothFilter = (colorName?: string) => materialFilter("cloth", colorName);

export function findItem(data: ClothingItem[], cnName: string): ClothingItem | undefined {
  return data.find((item) => item.cnName === cnName || item.name === cnName);
}

export function slotForCn(slotCn: SlotCn): SlotDef {
  return slotsWithRuntime().find((slot) => slot.cn === slotCn)!;
}

export function itemTags(slotDir: string, item: ClothingItem): Set<string> {
  const tags = new Set(clothingTags[slotDir]?.[item.name] ?? []);
  if (item.hasCollar === 1) tags.add("collared");
  return tags;
}

export function hasFile(item: ClothingItem, stem: string): boolean {
  const fileList = item.allFiles;
  return fileList ? fileList.includes(stem) : true;
}

export function files(item: ClothingItem): Set<string> {
  return new Set(item.allFiles ?? []);
}

export function hairMaskProfile(name?: string): string | undefined {
  if (!name) return undefined;
  return (renderRules.hairMaskProfiles as Record<string, string>)[name];
}

export const transformationFilterRules = renderRules.transformationFilters as Record<
  string,
  {
    fixed?: { parts: string[]; filter: ColorFilter };
    inheritHair?: string[];
  }
>;
