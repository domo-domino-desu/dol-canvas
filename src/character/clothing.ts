import type { LayerSpec, ClothingWorn, ColorFilter } from "@/types";
import { Z, Z_OFFSET } from "@/data/zindex";
import type { ResolvedClothing, ResolvedState } from "@/character/state";
import { SLOTS, clothFilter, type ClothingItem } from "@/character/render-catalog";
import {
  accessoryStem,
  armAccFileForWorn,
  armPoseFile,
  availableStem,
  backStem,
  breastAccStem,
  breastDetailStem,
  breastStem,
  branchSuffix,
  clothingMaskSrc,
  detailStem,
  handPoseFile,
  lowerAccessoryStem,
  mainStem,
  patternPart,
  slotAccessoryStem,
} from "@/character/asset-resolver";
import { pushLayer, sleeveZ, zFor } from "@/character/layer-compiler";

function bellyClipMask(state: ResolvedState): string | undefined {
  return state.bellyMasks.clip;
}

function bellyMask(state: ResolvedState, item: ClothingItem): string | undefined {
  void item;
  return state.bellyMasks.mask;
}

function bellyDx(state: ResolvedState): number {
  const belly = state.belly;
  if (belly >= 24) return 10;
  if (belly >= 23) return 8;
  if (belly >= 22) return 6;
  if (belly >= 19) return 4;
  if (belly >= 15) return 2;
  return 0;
}

function filterForColourMode(
  mode: string | number | undefined,
  worn: ClothingWorn,
): ColorFilter | undefined {
  if (mode === "secondary") return clothFilter(worn.第二色调);
  if (mode === "none" || mode === 0) return undefined;
  return clothFilter(worn.主色调);
}

function buildHandheldLayers(
  state: ResolvedState,
  resolved: ResolvedClothing,
  imgBase: string,
  fallbackZ: number,
): LayerSpec[] {
  const layers: LayerSpec[] = [];
  const { worn, item } = resolved;
  const rightPose = state.payload.右臂 ?? "hold";
  const leftPose = state.leftArm;
  const z = zFor(item, fallbackZ);
  const filter = clothFilter(worn.主色调);
  const accFilter = clothFilter(worn.第二色调);
  const secondary = patternPart(worn, item, "secondary");

  if (item.mainImage !== 0 && (rightPose !== "cover" || item.coverImage !== 0)) {
    pushLayer(
      layers,
      "cloth-手持物品-right",
      imgBase,
      availableStem(item, [
        `right-${rightPose}${branchSuffix(worn, item, "full")}${patternPart(worn, item, "primary")}`,
        `right-${rightPose}${patternPart(worn, item, "primary")}`,
        `right-${rightPose}`,
      ]),
      z,
      filter,
    );
  }
  if (
    item.accessory === 1 &&
    item.accImage !== 0 &&
    (rightPose !== "cover" || item.coverImage !== 0)
  ) {
    pushLayer(
      layers,
      "cloth-手持物品-right-acc",
      imgBase,
      availableStem(item, [
        `right-${rightPose}${branchSuffix(worn, item, "acc")}${secondary}-acc`,
        `right-${rightPose}${secondary}-acc`,
        `right-${rightPose}-acc`,
      ]),
      z + Z_OFFSET.ACC,
      accFilter,
    );
  }
  if (item.leftImage === 1) {
    pushLayer(
      layers,
      "cloth-手持物品-left",
      imgBase,
      availableStem(item, [
        `left-${leftPose}${branchSuffix(worn, item, "full")}${patternPart(worn, item, "primary")}`,
        `left-${leftPose}${patternPart(worn, item, "primary")}`,
        `left-${leftPose}`,
      ]),
      z,
      filter,
    );
    if (item.accessory === 1) {
      pushLayer(
        layers,
        "cloth-手持物品-left-acc",
        imgBase,
        availableStem(item, [
          `left-${leftPose}${branchSuffix(worn, item, "acc")}${secondary}-acc`,
          `left-${leftPose}${secondary}-acc`,
          `left-${leftPose}-acc`,
        ]),
        z + Z_OFFSET.ACC,
        accFilter,
      );
    }
  }
  pushLayer(
    layers,
    "cloth-手持物品-back",
    imgBase,
    backStem(worn, item),
    Z.OVER_HEAD_BACK,
    filterForColourMode(item.backImgColour, worn),
  );
  pushLayer(
    layers,
    "cloth-手持物品-back-acc",
    imgBase,
    backStem(worn, item, true),
    Z.HEAD_BACK,
    filterForColourMode(item.backImgAccColour, worn),
  );
  return layers;
}

function clothingMasksForMain(
  state: ResolvedState,
  resolved: ResolvedClothing,
): string[] | undefined {
  const masks = [
    clothingMaskSrc(state, resolved.slot.dir, resolved.item, resolved.worn),
    ...(resolved.slot.cn === "上装" ? (state.masksFor("upper") ?? []) : []),
    ...(resolved.slot.cn === "内衣上装" ? (state.masksFor("underUpper") ?? []) : []),
    ...(resolved.slot.cn === "下装" ? (state.masksFor("lower") ?? []) : []),
    ...(resolved.slot.cn === "内衣下装" ? (state.masksFor("underLower") ?? []) : []),
    ...(resolved.slot.cn === "腿饰" ? (state.masksFor("legs") ?? []) : []),
  ].filter((src): src is string => !!src);
  return masks.length ? masks : undefined;
}

function breastMasks(state: ResolvedState, resolved: ResolvedClothing): string[] | undefined {
  const masks = [
    clothingMaskSrc(state, resolved.slot.dir, resolved.item, resolved.worn),
    state.belly >= 19 && state.bellyMasks.shirtBreasts
      ? state.bellyMasks.shirtBreasts
      : bellyMask(state, resolved.item),
  ].filter((src): src is string => !!src);
  return masks.length ? masks : undefined;
}

function withBrightness(filter: ColorFilter | undefined, brightness: number): ColorFilter {
  return { ...filter, brightness };
}

type ClothingRenderContext = {
  state: ResolvedState;
  resolved: ResolvedClothing;
  slot: ResolvedClothing["slot"];
  worn: ClothingWorn;
  item: ClothingItem;
  imgBase: string;
  z: number;
  filter: ColorFilter | undefined;
  accFilter: ColorFilter | undefined;
};

function createRenderContext(
  state: ResolvedState,
  resolved: ResolvedClothing,
): ClothingRenderContext {
  const { slot, worn, item } = resolved;
  const imgBase = `${state.baseUrl}clothes/${slot.dir}/${item.name}/`;
  return {
    state,
    resolved,
    slot,
    worn,
    item,
    imgBase,
    z: zFor(item, slot.z),
    filter: clothFilter(worn.主色调),
    accFilter: clothFilter(worn.第二色调),
  };
}

function applyHandLayers(ctx: ClothingRenderContext, layers: LayerSpec[]): boolean {
  const { state, slot, worn, item, imgBase, filter, accFilter } = ctx;
  if (slot.cn !== "手饰") return false;

  for (const side of ["left", "right"] as const) {
    if ((side === "left" && item.leftImage === 0) || (side === "right" && item.rightImage === 0))
      continue;
    pushLayer(
      layers,
      `cloth-${slot.cn}-${side}`,
      imgBase,
      handPoseFile(state, worn, item, side),
      slot.z,
      filter,
    );
    if (item.accessory === 1 && item.accImage !== 0) {
      pushLayer(
        layers,
        `cloth-${slot.cn}-${side}-acc`,
        imgBase,
        armAccFileForWorn(state, worn, item, side),
        slot.z + Z_OFFSET.ACC,
        accFilter,
      );
    }
  }

  return true;
}

function applyBackLayers(ctx: ClothingRenderContext, layers: LayerSpec[]): void {
  const { slot, worn, item, imgBase } = ctx;
  pushLayer(
    layers,
    `cloth-${slot.cn}-back`,
    imgBase,
    backStem(worn, item),
    Z.OVER_HEAD_BACK,
    filterForColourMode(item.backImgColour, worn),
  );
  pushLayer(
    layers,
    `cloth-${slot.cn}-back-acc`,
    imgBase,
    backStem(worn, item, true),
    Z.HEAD_BACK,
    filterForColourMode(item.backImgAccColour, worn),
  );
}

function applyMainLayers(ctx: ClothingRenderContext, layers: LayerSpec[]): void {
  const { state, resolved, slot, item, imgBase, z, filter } = ctx;

  if (item.mainImage !== 0) {
    const masks = clothingMasksForMain(state, resolved);
    pushLayer(
      layers,
      `cloth-${slot.cn}`,
      imgBase,
      mainStem(resolved),
      z,
      filter,
      masks ? { maskSrcs: masks } : undefined,
    );
  }

  const detail = detailStem(ctx.worn, item);
  if (detail && item.mainImage !== 0) {
    pushLayer(layers, `cloth-${slot.cn}-detail`, imgBase, detail, z + Z_OFFSET.DETAIL, filter);
  }
}

function applySleeveLayers(ctx: ClothingRenderContext, layers: LayerSpec[]): void {
  const { state, slot, worn, item, imgBase, filter, accFilter } = ctx;
  if (slot.cn !== "上装" && slot.cn !== "内衣上装" && slot.cn !== "下装") return;

  for (const side of ["left", "right"] as const) {
    if ((slot.cn === "上装" || slot.cn === "内衣上装") && item.sleeveImg) {
      pushLayer(
        layers,
        `cloth-${slot.cn}-${side}-sleeve`,
        imgBase,
        armPoseFile(state, worn, item, side),
        sleeveZ(slot.cn, side, state),
        filterForColourMode(item.sleeveColour, worn) ?? filter,
      );
    }
    if ((slot.cn === "上装" || slot.cn === "内衣上装") && item.sleeveAccImg) {
      pushLayer(
        layers,
        `cloth-${slot.cn}-${side}-sleeve-acc`,
        imgBase,
        armAccFileForWorn(state, worn, item, side),
        sleeveZ(slot.cn, side, state) + Z_OFFSET.SLEEVE_ACC,
        accFilter,
      );
    }
  }
}

function applyFittedLayers(ctx: ClothingRenderContext, layers: LayerSpec[]): void {
  const { state, resolved, slot, item, imgBase, z, filter, accFilter } = ctx;
  if (!["上装", "下装", "内衣上装", "内衣下装"].includes(slot.cn)) return;
  if (state.belly > 7) return;
  if (item.mainImage === 0) return;

  const masks = state.fittedMasks[slot.cn];
  if (!masks?.leftMove && !masks?.rightMove) return;

  const stem = mainStem(resolved);
  const soft = state.bodyShape === "soft";
  if (masks.leftMove) {
    pushLayer(layers, `cloth-${slot.cn}-fitted-left`, imgBase, stem, z, filter, {
      dx: soft ? 2 : -2,
      maskSrcs: [masks.leftMove],
    });
  }
  if (masks.rightMove && state.bodyShape !== "slender") {
    pushLayer(layers, `cloth-${slot.cn}-fitted-right`, imgBase, stem, z, filter, {
      dx: soft ? -2 : 2,
      maskSrcs: [masks.rightMove],
    });
  }

  if (item.accessory !== 1 || item.accImage === 0) return;
  const accStem = slotAccessoryStem(slot.cn, resolved);
  if (masks.leftMove) {
    pushLayer(
      layers,
      `cloth-${slot.cn}-fitted-left-acc`,
      imgBase,
      availableStem(item, [accStem, "acc"]),
      z + Z_OFFSET.ACC,
      accFilter,
      {
        dx: soft ? 2 : -2,
        maskSrcs: [masks.leftMove],
      },
    );
  }
  if (masks.rightMove && state.bodyShape !== "slender") {
    pushLayer(
      layers,
      `cloth-${slot.cn}-fitted-right-acc`,
      imgBase,
      availableStem(item, [accStem, "acc"]),
      z + Z_OFFSET.ACC,
      accFilter,
      {
        dx: soft ? -2 : 2,
        maskSrcs: [masks.rightMove],
      },
    );
  }
}

function applyFittedSleeveLayers(ctx: ClothingRenderContext, layers: LayerSpec[]): void {
  const { state, slot, worn, item, imgBase, filter, accFilter } = ctx;
  if (slot.cn !== "上装" && slot.cn !== "内衣上装") return;
  if (state.belly > 7 || state.leftArm !== "idle") return;

  const mask = state.fittedMasks[slot.cn]?.leftMove;
  if (!mask) return;
  if (item.sleeveImg) {
    pushLayer(
      layers,
      `cloth-${slot.cn}-left-sleeve-fitted`,
      imgBase,
      armPoseFile(state, worn, item, "left"),
      sleeveZ(slot.cn, "left", state),
      filterForColourMode(item.sleeveColour, worn) ?? filter,
      { dx: -2, maskSrcs: [mask] },
    );
  }
  if (item.sleeveImg && item.sleeveAccImg) {
    pushLayer(
      layers,
      `cloth-${slot.cn}-left-sleeve-fitted-acc`,
      imgBase,
      armAccFileForWorn(state, worn, item, "left"),
      sleeveZ(slot.cn, "left", state) + Z_OFFSET.SLEEVE_ACC,
      accFilter,
      { dx: -2, maskSrcs: [mask] },
    );
  }
}

function applyBreastLayers(ctx: ClothingRenderContext, layers: LayerSpec[]): void {
  const { state, resolved, slot, worn, item, imgBase, z, filter, accFilter } = ctx;
  if (slot.cn !== "上装" && slot.cn !== "内衣上装" && slot.cn !== "下装") return;

  const masks = breastMasks(state, resolved);
  pushLayer(
    layers,
    `cloth-${slot.cn}-breasts`,
    imgBase,
    breastStem(state, worn, item),
    z + Z_OFFSET.BREASTS,
    filter,
    masks ? { maskSrcs: masks } : undefined,
  );
  pushLayer(
    layers,
    `cloth-${slot.cn}-breasts-acc`,
    imgBase,
    breastAccStem(state, worn, item),
    z + Z_OFFSET.ACC,
    accFilter,
  );
  pushLayer(
    layers,
    `cloth-${slot.cn}-breasts-detail`,
    imgBase,
    breastDetailStem(state, worn, item),
    z + Z_OFFSET.BREASTS_DETAIL,
    accFilter,
  );
}

function applyAccessoryLayers(ctx: ClothingRenderContext, layers: LayerSpec[]): void {
  const { slot, worn, item, imgBase, z, accFilter, resolved } = ctx;
  if (item.accessory !== 1 || item.accImage === 0) return;

  const accStem = slot.cn === "下装" ? lowerAccessoryStem(resolved) : accessoryStem(worn, item);
  pushLayer(
    layers,
    `cloth-${slot.cn}-acc`,
    imgBase,
    availableStem(item, [accStem, "acc"]),
    z + Z_OFFSET.ACC,
    accFilter,
  );
}

function applyBellyShadowLayers(ctx: ClothingRenderContext, layers: LayerSpec[]): void {
  const { state, resolved, slot, item, imgBase, filter } = ctx;
  if (slot.cn !== "下装" && slot.cn !== "内衣下装") return;
  if (item.mainImage === 0) return;
  if (slot.cn === "下装" && state.bellyMasks.hidesLower) return;
  if (slot.cn === "内衣下装" && state.bellyMasks.hidesUnderLower) return;

  const shadowMasks =
    slot.cn === "下装" ? state.masksFor("lowerShadow") : state.masksFor("underLowerShadow");
  if (!shadowMasks.length) return;

  const brightness = state.belly >= 8 && state.belly <= 24 ? -0.25 : -0.4;
  pushLayer(
    layers,
    `cloth-${slot.cn}-belly-shadow`,
    imgBase,
    mainStem(resolved),
    Z.BELLY_CLOTHES_SHADOW,
    withBrightness(filter, brightness),
    { maskSrcs: shadowMasks },
  );
}

function applyUpperSplitBellyLayers(ctx: ClothingRenderContext, layers: LayerSpec[]): boolean {
  const { state, resolved, slot, item, imgBase, z, filter, accFilter } = ctx;
  const masks = state.bellyMasks;
  if (slot.cn !== "上装" || !masks.shirtClip || item.mainImage === 0) return false;

  const stem = mainStem(resolved);
  const splitParts = [
    {
      id: "shadow",
      mask: masks.shirtClip,
      z: z - 1,
      dx: 0,
      dy: masks.shirtLeft ? 2 : 0,
      brightness: -0.3,
    },
    {
      id: "left",
      mask: masks.shirtLeft,
      z,
      dx: state.belly >= 22 ? 12 : 8,
      dy: -2,
    },
    { id: "left2", mask: masks.shirtLeft2, z, dx: state.belly >= 22 ? 14 : 10, dy: 0 },
    {
      id: "left-shadow",
      mask: masks.shirtLeft,
      z: z - 1,
      dx: state.belly >= 22 ? 14 : 10,
      dy: -2,
      brightness: -0.3,
    },
    {
      id: "left2-shadow",
      mask: masks.shirtLeft2,
      z: z - 1,
      dx: state.belly >= 22 ? 16 : 12,
      dy: 0,
      brightness: -0.3,
    },
    { id: "right", mask: masks.shirtRight, z, dx: -2, dy: 0 },
    { id: "right2", mask: masks.shirtRight2, z, dx: -4, dy: 0 },
    { id: "right3", mask: masks.shirtRight3, z, dx: -6, dy: 0 },
  ];

  for (const part of splitParts) {
    if (!part.mask) continue;
    pushLayer(
      layers,
      `cloth-${slot.cn}-belly-split-${part.id}`,
      imgBase,
      stem,
      part.z,
      part.brightness ? withBrightness(filter, part.brightness) : filter,
      { dx: part.dx, dy: part.dy, maskSrcs: [part.mask] },
    );
  }

  if (item.accessory === 1 && item.accImage !== 0) {
    const accStem = availableStem(item, [slotAccessoryStem(slot.cn, resolved), "acc"]);
    for (const part of splitParts) {
      if (!part.mask) continue;
      pushLayer(
        layers,
        `cloth-${slot.cn}-belly-split-${part.id}-acc`,
        imgBase,
        accStem,
        part.z + Z_OFFSET.ACC,
        part.brightness ? withBrightness(accFilter, part.brightness) : accFilter,
        { dx: part.dx, dy: part.dy, maskSrcs: [part.mask] },
      );
    }
  }

  return true;
}

function applyBellyLayers(ctx: ClothingRenderContext, layers: LayerSpec[]): void {
  const { state, resolved, slot, item, imgBase, filter, accFilter } = ctx;
  if (state.belly <= 7 || !["上装", "下装", "内衣上装", "内衣下装"].includes(slot.cn)) return;
  if (slot.cn === "下装" && state.bellyMasks.hidesLower) return;
  if (slot.cn === "内衣下装" && state.bellyMasks.hidesUnderLower) return;
  if (slot.cn === "上装" && applyUpperSplitBellyLayers(ctx, layers)) return;

  const stem = mainStem(resolved);
  const clip =
    slot.cn === "下装"
      ? bellyClipMask(state)
      : slot.cn === "内衣下装"
        ? state.bellyMasks.underLowerClip
        : bellyMask(state, item);
  pushLayer(layers, `cloth-${slot.cn}-belly`, imgBase, stem, Z.BELLY_CLOTHES, filter, {
    dx: bellyDx(state),
    maskSrcs: clip ? [clip] : undefined,
  });
  if (item.accessory === 1 && item.accImage !== 0) {
    const accStem = slotAccessoryStem(slot.cn, resolved);
    pushLayer(
      layers,
      `cloth-${slot.cn}-belly-acc`,
      imgBase,
      availableStem(item, [accStem, "acc"]),
      Z.BELLY_CLOTHES_ACC,
      accFilter,
      {
        dx: bellyDx(state),
        maskSrcs: clip ? [clip] : undefined,
      },
    );
  }
}

function applyGenitalLayers(ctx: ClothingRenderContext, layers: LayerSpec[]): void {
  const { state, slot, item, imgBase, filter, accFilter } = ctx;
  if (!state.payload.阴茎 || (slot.cn !== "下装" && slot.cn !== "内衣下装")) return;

  const bulgeVisible = slot.cn === "下装" ? (state.payload.阴茎大小 ?? 2) >= 4 : true;
  const hiddenByBelly = state.belly >= 19;
  if (bulgeVisible && !hiddenByBelly && item.penisImg === 1) {
    pushLayer(
      layers,
      `cloth-${slot.cn}-penis`,
      imgBase,
      "penis",
      slot.cn === "下装" ? Z.LOWER_TOP : Z.UNDER_LOWER_PENIS,
      filter,
    );
  }
  if (bulgeVisible && !hiddenByBelly && item.penisAccImg === 1 && item.accessory === 1) {
    pushLayer(
      layers,
      `cloth-${slot.cn}-penis-acc`,
      imgBase,
      "acc-penis",
      slot.cn === "下装" ? Z.LOWER_TOP_PENIS_ACC : Z.UNDER_LOWER_PENIS_ACC,
      accFilter,
    );
  }
}

function buildResolvedClothingLayers(
  state: ResolvedState,
  resolved: ResolvedClothing,
): LayerSpec[] {
  const layers: LayerSpec[] = [];
  const ctx = createRenderContext(state, resolved);

  if (ctx.slot.cn === "手持物品")
    return buildHandheldLayers(state, resolved, ctx.imgBase, ctx.slot.z);
  if (applyHandLayers(ctx, layers)) return layers;

  applyBackLayers(ctx, layers);
  applyMainLayers(ctx, layers);
  applyFittedLayers(ctx, layers);
  applySleeveLayers(ctx, layers);
  applyFittedSleeveLayers(ctx, layers);
  applyBreastLayers(ctx, layers);
  applyAccessoryLayers(ctx, layers);
  applyBellyShadowLayers(ctx, layers);
  applyBellyLayers(ctx, layers);
  applyGenitalLayers(ctx, layers);

  return layers;
}

export function buildClothingLayers(state: ResolvedState): LayerSpec[] {
  if (!state.payload.衣物) return [];

  const layers: LayerSpec[] = [];
  for (const slotDef of SLOTS) {
    const resolved = state.clothing[slotDef.cn];
    if (!resolved) continue;
    layers.push(...buildResolvedClothingLayers(state, resolved));
  }
  return layers;
}

export function getClothingBranchHints(
  slotCn: string,
  name: string,
): Record<string, boolean> | undefined {
  const slot = SLOTS.find((candidate) => candidate.cn === slotCn);
  const item = slot?.data.find((candidate) => candidate.cnName === name || candidate.name === name);
  return item?.branchHints;
}
