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
  const belly = state.belly;
  return belly >= 19 && belly <= 24
    ? `${state.baseUrl}clothes/belly/mask-clip-${belly}.png`
    : undefined;
}

function bellyMask(state: ResolvedState, item: ClothingItem): string | undefined {
  const belly = state.belly;
  if (belly < 15 || belly > 24) return undefined;
  return item.pregType === "min"
    ? `${state.baseUrl}clothes/belly/mask-min-${belly}.png`
    : `${state.baseUrl}clothes/belly/mask-${belly}.png`;
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
    ...(resolved.slot.cn === "下装" ? (state.masksFor("lower") ?? []) : []),
    ...(resolved.slot.cn === "腿饰" ? (state.masksFor("legs") ?? []) : []),
  ].filter((src): src is string => !!src);
  return masks.length ? masks : undefined;
}

function breastMasks(state: ResolvedState, resolved: ResolvedClothing): string[] | undefined {
  const masks = [
    clothingMaskSrc(state, resolved.slot.dir, resolved.item, resolved.worn),
    bellyMask(state, resolved.item),
  ].filter((src): src is string => !!src);
  return masks.length ? masks : undefined;
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

function applyBellyLayers(ctx: ClothingRenderContext, layers: LayerSpec[]): void {
  const { state, resolved, slot, item, imgBase, filter, accFilter } = ctx;
  if (state.belly <= 7 || !["上装", "下装", "内衣上装", "内衣下装"].includes(slot.cn)) return;

  const stem = mainStem(resolved);
  const clip =
    slot.cn === "下装" || slot.cn === "内衣下装" ? bellyClipMask(state) : bellyMask(state, item);
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
  applySleeveLayers(ctx, layers);
  applyBreastLayers(ctx, layers);
  applyAccessoryLayers(ctx, layers);
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
