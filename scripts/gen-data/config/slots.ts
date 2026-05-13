import type { SlotDef } from "../types";

export const CLOTHING_SLOTS: SlotDef[] = [
  { cn: "上装", slot: "upper", imgDir: "upper", jsFile: "clothing-upper.js" },
  { cn: "下装", slot: "lower", imgDir: "lower", jsFile: "clothing-lower.js" },
  { cn: "内衣上装", slot: "under-upper", imgDir: "under-upper", jsFile: "clothing-under-upper.js" },
  { cn: "内衣下装", slot: "under-lower", imgDir: "under-lower", jsFile: "clothing-under-lower.js" },
  { cn: "头饰", slot: "head", imgDir: "head", jsFile: "clothing-head.js" },
  { cn: "面饰", slot: "face", imgDir: "face", jsFile: "clothing-face.js" },
  { cn: "颈部", slot: "neck", imgDir: "neck", jsFile: "clothing-neck.js" },
  { cn: "手饰", slot: "hands", imgDir: "hands", jsFile: "clothing-hands.js" },
  { cn: "手持物品", slot: "handheld", imgDir: "handheld", jsFile: "clothing-handheld.js" },
  { cn: "鞋子", slot: "feet", imgDir: "feet", jsFile: "clothing-feet.js" },
  { cn: "腿饰", slot: "legs", imgDir: "legs", jsFile: "clothing-legs.js" },
  { cn: "私部装备", slot: "genitals", imgDir: "genitals", jsFile: "clothing-genitals.js" },
];

export const I18N_CLOTHING_SLOTS: Array<{ js: string; slot: string }> = [
  ...CLOTHING_SLOTS.map((slot) => ({ js: slot.jsFile.replace(/\.js$/, ""), slot: slot.slot })),
  { js: "clothing-over-upper", slot: "over-upper" },
  { js: "clothing-over-lower", slot: "over-lower" },
  { js: "clothing-over-head", slot: "over-head" },
];
