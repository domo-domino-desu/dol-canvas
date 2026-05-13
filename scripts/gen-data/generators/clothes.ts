import { join } from "node:path";
import { CLOTHING_SLOTS } from "../config/slots";
import type { BuildContext, DolClothingInfo } from "../types";
import { listPngStems } from "../utils/fs";

interface StateInfo {
  states: string[];
  numeric: string[];
  armVariants: string[];
  allFiles: string[];
}

interface ClothingItem {
  name: string;
  cnName: string;
  colorOptions: string[];
  accColorOptions: string[];
  patternOptions: string[];
  patternLayer: string;
  states: string[];
  numeric: string[];
  armVariants: string[];
  allFiles: string[];
  hasAcc: boolean;
  accessory: number;
  accessoryIntegrityImg: boolean;
  mainImage: number;
  accImage: number;
  leftImage: number;
  rightImage: number;
  coverImage: number;
  sleeveImg: boolean;
  sleeveAccImg: boolean;
  sleeveColour: string | number;
  breastImg: number | Record<string, number | null>;
  breastAccImg: number | Record<string, number | null>;
  breastPattern: boolean;
  backImg: number | string;
  backImgAcc: number | string;
  backImgColour: string;
  backImgAccColour: string;
  backIntegrityImg: boolean;
  maskImg: number;
  altposition: string;
  altdisabled: string[];
  hood: number;
  hoodposition: string;
  outfitPrimaryHead: boolean;
  outfitSecondary: boolean;
  pregType: number | string;
  formfitting: number;
  notuck: number;
  onePiece: number;
  hasCollar: number;
  penisImg: number;
  penisAccImg: number;
  branchHints: Record<string, boolean>;
  detail: number;
  zIndex: string;
}

function boolFromNumber(value: unknown): boolean {
  return value === true || value === 1;
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" ? value : fallback;
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function getStates(itemDir: string): StateInfo {
  const files = listPngStems(itemDir);
  const states = ["full", "torn", "tattered", "frayed"].filter((state) =>
    files.some(
      (file) =>
        file === state ||
        file.startsWith(`${state}-`) ||
        file.startsWith(`acc-${state}`) ||
        file === `mask-${state}` ||
        file.startsWith(`back-${state}`),
    ),
  );
  const numeric = files.filter((file) => /^\d+$/.test(file)).sort((a, b) => +a - +b);
  const armVariants = files.filter((file) => /^(left|right)-(idle|cover|hold)/.test(file));
  return { states, numeric, armVariants, allFiles: files };
}

function byVariable(items: DolClothingInfo[]): Record<string, DolClothingInfo> {
  return Object.fromEntries(items.map((item) => [item.variable, item]));
}

export function generateClothes(ctx: BuildContext): Record<string, ClothingItem[]> {
  const allClothes: Record<string, ClothingItem[]> = {};

  for (const { cn: slotCn, slot, imgDir } of CLOTHING_SLOTS) {
    const slotImgDir = join(ctx.imgDir, "clothes", imgDir);
    const dolData = byVariable(ctx.dol.clothing[slot] ?? []);
    const items: ClothingItem[] = [];
    const addedVariables = new Set<string>();

    for (const cnName of ctx.validWhitelist[slotCn] ?? []) {
      const variable = ctx.mappings.clothingBySlot[slot]?.[cnName]?.variable;
      if (!variable || addedVariables.has(variable)) continue;

      const info = dolData[variable];
      if (!info) continue;

      const itemDir = join(slotImgDir, variable);
      const { states, numeric, armVariants, allFiles } = getStates(itemDir);
      const fileSet = new Set(allFiles);

      items.push({
        name: variable,
        cnName,
        colorOptions: info.colour_options ?? [],
        accColorOptions: info.accessory_colour_options ?? [],
        patternOptions: info.pattern_options ?? [],
        patternLayer: info.pattern_layer ?? "",
        states,
        numeric,
        armVariants,
        allFiles,
        hasAcc: numberValue(info.accessory, 0) > 0,
        accessory: numberValue(info.accessory, 0),
        accessoryIntegrityImg: boolFromNumber(info.accessory_integrity_img),
        mainImage: numberValue(info.mainImage, 1),
        accImage: numberValue(info.accImage, 1),
        leftImage: numberValue(info.leftImage, 1),
        rightImage: numberValue(info.rightImage, 1),
        coverImage: numberValue(info.coverImage, 1),
        sleeveImg: boolFromNumber(info.sleeve_img),
        sleeveAccImg: boolFromNumber(info.sleeve_acc_img),
        sleeveColour: info.sleeve_colour ?? "",
        breastImg: info.breast_img ?? 0,
        breastAccImg: info.breast_acc_img ?? 0,
        breastPattern: info.breast_pattern ?? false,
        backImg: info.back_img ?? 0,
        backImgAcc: info.back_img_acc ?? 0,
        backImgColour: info.back_img_colour ?? "",
        backImgAccColour: info.back_img_acc_colour ?? "",
        backIntegrityImg: boolFromNumber(info.back_integrity_img),
        maskImg: numberValue(info.mask_img, 0),
        altposition: stringValue(info.altposition),
        altdisabled: info.altdisabled ?? [],
        hood: numberValue(info.hood, 0),
        hoodposition: stringValue(info.hoodposition),
        outfitPrimaryHead: !!info.outfitPrimary?.head,
        outfitSecondary: !!info.outfitSecondary,
        pregType: info.pregType ?? 0,
        formfitting: numberValue(info.formfitting, 0),
        notuck: numberValue(info.notuck, 0),
        onePiece: numberValue(info.one_piece, 0),
        hasCollar: numberValue(info.has_collar, 0),
        penisImg: numberValue(info.penis_img, 0),
        penisAccImg: numberValue(info.penis_acc_img, 0),
        branchHints: {
          替代: !!info.altposition && allFiles.some((file) => file.includes("-alt")),
          兜帽: allFiles.some((file) => file.endsWith("-down")),
          卷袖: allFiles.some((file) => file.endsWith("-rolled")),
          阴茎凸起自动: fileSet.has("penis") || fileSet.has("acc-penis"),
          领口变体自动: allFiles.some(
            (file) => file.includes("-nocollar") || file.includes("-serafuku"),
          ),
          背面层: allFiles.some((file) => file === "back" || file.startsWith("back-")),
          遮罩: allFiles.some((file) => file === "mask" || file.startsWith("mask-")),
          孕肚适配: allFiles.some((file) => /(?:preg|belly|shadow)/.test(file)),
        },
        detail: numberValue(info.detail, 0),
        zIndex: String(info.zIndex ?? ""),
      });
      addedVariables.add(variable);
    }

    allClothes[slot] = items;
    console.log(`  ${slotCn}(${slot}): ${items.length} items`);
  }

  return allClothes;
}
