import type { ClothingWorn } from "@/types";
import type { ResolvedClothing, ResolvedState } from "@/character/state";
import { files, hasFile, type ClothingItem, type SlotCn } from "@/character/render-catalog";

function firstAvailable(item: ClothingItem, stems: Array<string | undefined>): string | undefined {
  return stems.find((stem): stem is string => !!stem && hasFile(item, stem));
}

export function durabilityState(worn: ClothingWorn): string {
  const durability = worn.耐久度;
  if (durability === "完整") return "full";
  if (durability === "撕裂") return "torn";
  if (durability === "破旧") return "tattered";
  if (durability === "磨损") return "frayed";
  return worn.状态 ?? durability ?? "full";
}

export function selectedPattern(worn: ClothingWorn, item: ClothingItem): string | undefined {
  return worn.图案 ?? worn.花纹 ?? item.patternOptions?.[0];
}

export function patternPart(
  worn: ClothingWorn,
  item: ClothingItem,
  layer: "primary" | "secondary",
): string {
  const isPrimary = !item.patternLayer || item.patternLayer === "primary";
  if (layer === "primary" ? !isPrimary : item.patternLayer !== layer) return "";
  const pattern = selectedPattern(worn, item);
  return pattern ? `-${pattern.replace(/ /g, "-")}` : "";
}

export function integrityFile(worn: ClothingWorn, item: ClothingItem): string {
  const state = durabilityState(worn);
  if (item.states.includes(state)) return state;
  return item.states[0] ?? "full";
}

function altEnabled(worn: ClothingWorn, item: ClothingItem, part: string): boolean {
  return (
    !!worn.替代 &&
    item.altposition !== undefined &&
    item.altposition !== "" &&
    !(item.altdisabled ?? []).includes(part)
  );
}

function hoodDownEnabled(worn: ClothingWorn, item: ClothingItem): boolean {
  return worn.兜帽 === "放下" && (item.hoodposition !== undefined || item.hood === 1);
}

export function branchSuffix(worn: ClothingWorn, item: ClothingItem, part: string): string {
  if (hoodDownEnabled(worn, item)) return "-down";
  if (altEnabled(worn, item, part)) return "-alt";
  return "";
}

function armPose(state: ResolvedState, side: "left" | "right"): string {
  if (side === "left") return state.leftArm;
  return state.rightArm;
}

export function mainStem(resolved: ResolvedClothing): string | undefined {
  const { worn, item } = resolved;
  const state = integrityFile(worn, item);
  const collar = resolved.flags.collarSuffix;
  const pattern = patternPart(worn, item, "primary");
  const suffix = branchSuffix(worn, item, "full");
  const all = files(item);
  return firstAvailable(item, [
    `${state}${collar}${pattern}${suffix}`,
    `${state}${pattern}${suffix}`,
    `${state}${collar}${suffix}`,
    `${state}${suffix}`,
    `${state}${collar}${pattern}`,
    state,
    [...all].find((file) => file.startsWith(`${state}-`) && !file.endsWith("-acc")),
    item.states[0],
    [...all].find((file) => file.startsWith("full-") && !file.endsWith("-acc")),
  ]);
}

export function accessoryStem(worn: ClothingWorn, item: ClothingItem): string {
  const integrity = item.accessoryIntegrityImg ? `-${integrityFile(worn, item)}` : "";
  return `acc${integrity}${patternPart(worn, item, "secondary")}${branchSuffix(worn, item, "acc")}`;
}

export function lowerAccessoryStem(resolved: ResolvedClothing): string {
  if (resolved.flags.useUnderAccessory) {
    return `acc-under${patternPart(resolved.worn, resolved.item, "secondary")}`;
  }
  return accessoryStem(resolved.worn, resolved.item);
}

export function detailStem(worn: ClothingWorn, item: ClothingItem): string | undefined {
  if (item.patternLayer !== "tertiary") return undefined;
  const pattern = selectedPattern(worn, item);
  return pattern?.replace(/ /g, "-");
}

export function armPoseFile(
  state: ResolvedState,
  worn: ClothingWorn,
  item: ClothingItem,
  side: "left" | "right",
): string | undefined {
  const pose = armPose(state, side);
  const base = `${side}-${pose}`;
  const alt = altEnabled(worn, item, "sleeves") ? "-alt" : "";
  const pattern = item.sleeveColour === "pattern" ? patternPart(worn, item, "primary") : "";
  const rolled = worn.卷袖 ? "-rolled" : "";
  const variants = item.armVariants.filter((file) => !file.endsWith("-acc"));
  return (
    firstAvailable(item, [
      pattern ? `${base}${alt}${pattern}${rolled}` : undefined,
      `${base}${alt}${rolled}`,
      pattern ? `${base}${alt}${pattern}` : undefined,
      `${base}${alt}`,
      pattern ? `${base}${pattern}${rolled}` : undefined,
      `${base}${rolled}`,
      pattern ? `${base}${pattern}` : undefined,
      base,
      variants.find((file) => file.startsWith(`${base}-`) && !file.endsWith("-acc")),
    ]) ?? variants[0]
  );
}

export function handPoseFile(
  state: ResolvedState,
  worn: ClothingWorn,
  item: ClothingItem,
  side: "left" | "right",
): string | undefined {
  const pose = armPose(state, side);
  const base = `${side}-${pose}`;
  const pattern = patternPart(worn, item, "primary");
  const variants = item.armVariants.filter((file) => !file.endsWith("-acc"));
  return (
    firstAvailable(item, [
      pattern ? `${base}${pattern}` : undefined,
      base,
      variants.find((file) => file.startsWith(`${base}-`) && !file.endsWith("-acc")),
    ]) ?? variants[0]
  );
}

export function armAccFileForWorn(
  state: ResolvedState,
  worn: ClothingWorn,
  item: ClothingItem,
  side: "left" | "right",
): string | undefined {
  const base = `${side}-${armPose(state, side)}`;
  const alt = altEnabled(worn, item, "sleeves") ? "-alt" : "";
  return firstAvailable(item, [
    `${base}${alt}-acc`,
    `${base}-acc`,
    item.armVariants.find((file) => file.startsWith(`${base}-`) && file.endsWith("-acc")),
  ]);
}

function numberFromBreastSetting(
  setting: number | Record<string, number | null> | undefined,
  breastSize: number,
): number | undefined {
  if (setting === undefined || setting === 0) return undefined;
  if (typeof setting === "number") return Math.min(breastSize, 6);
  const value = setting[String(breastSize)];
  return value === null || value === undefined ? undefined : value;
}

function breastVisible(
  setting: number | Record<string, number | null> | undefined,
  breastSize: number,
): boolean {
  if (setting === undefined || setting === 0) return false;
  if (typeof setting === "number") return setting === 1;
  return setting[String(breastSize)] !== null && setting[String(breastSize)] !== undefined;
}

export function breastStem(
  state: ResolvedState,
  worn: ClothingWorn,
  item: ClothingItem,
): string | undefined {
  if (!breastVisible(item.breastImg, state.breastSize)) return undefined;
  const size = numberFromBreastSetting(item.breastImg, state.breastSize);
  if (size === undefined) return undefined;
  const suffix = altEnabled(worn, item, "breasts") ? "-alt" : "";
  return firstAvailable(item, [
    `${size}${patternPart(worn, item, "primary")}${suffix}`,
    `${size}${suffix}`,
    `${size}${patternPart(worn, item, "primary")}`,
    `${size}`,
  ]);
}

export function breastAccStem(
  state: ResolvedState,
  worn: ClothingWorn,
  item: ClothingItem,
): string | undefined {
  const breastAcc = item.breastAccImg;
  const breastImg = item.breastImg;
  const active =
    (breastAcc === 1 && breastVisible(breastImg, state.breastSize)) ||
    (typeof breastAcc === "object" &&
      breastAcc[String(state.breastSize)] !== null &&
      breastAcc[String(state.breastSize)] !== undefined);
  if (!active) return undefined;

  const size =
    typeof breastAcc === "object"
      ? numberFromBreastSetting(breastAcc, state.breastSize)
      : numberFromBreastSetting(breastImg, state.breastSize);
  if (size === undefined) return undefined;
  return firstAvailable(item, [
    `${size}-acc${patternPart(worn, item, "secondary")}`,
    `${size}-acc`,
  ]);
}

export function breastDetailStem(
  state: ResolvedState,
  worn: ClothingWorn,
  item: ClothingItem,
): string | undefined {
  if (!item.breastPattern || !selectedPattern(worn, item) || !breastAccStem(state, worn, item))
    return undefined;
  const breastAcc = item.breastAccImg;
  const size =
    typeof breastAcc === "object"
      ? numberFromBreastSetting(breastAcc, state.breastSize)
      : numberFromBreastSetting(item.breastImg, state.breastSize);
  const pattern = selectedPattern(worn, item)?.replace(/ /g, "-");
  return size !== undefined && pattern ? firstAvailable(item, [`${size}-${pattern}`]) : undefined;
}

export function backStem(worn: ClothingWorn, item: ClothingItem, acc = false): string | undefined {
  const enabled = acc ? item.backImgAcc : item.backImg;
  if (enabled !== 1) return undefined;
  if (hoodDownEnabled(worn, item) && item.hood === 1 && item.outfitSecondary) return undefined;
  const prefix = altEnabled(worn, item, "back") ? "back-alt" : "back";
  const integrity = item.backIntegrityImg ? `-${integrityFile(worn, item)}` : "";
  const pattern = patternPart(worn, item, acc ? "secondary" : "primary");
  return firstAvailable(item, [
    `${prefix}${integrity}${pattern}${acc ? "-acc" : ""}`,
    `back${integrity}${pattern}${acc ? "-acc" : ""}`,
    `back${acc ? "-acc" : ""}`,
  ]);
}

export function clothingMaskSrc(
  state: ResolvedState,
  slotDir: string,
  item: ClothingItem,
  worn: ClothingWorn,
): string | undefined {
  if (item.maskImg !== 1) return undefined;
  const integrity = integrityFile(worn, item);
  const base = `${state.baseUrl}clothes/${slotDir}/${item.name}/`;
  const stem = firstAvailable(item, [`mask-${integrity}`, "mask"]);
  return stem ? `${base}${stem}.png` : undefined;
}

export function availableStem(
  item: ClothingItem,
  stems: Array<string | undefined>,
): string | undefined {
  return firstAvailable(item, stems);
}

export function slotAccessoryStem(slotCn: SlotCn, resolved: ResolvedClothing): string {
  return slotCn === "下装"
    ? lowerAccessoryStem(resolved)
    : accessoryStem(resolved.worn, resolved.item);
}
