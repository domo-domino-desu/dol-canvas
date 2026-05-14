import type { CharacterPayload, ClothingWorn, RightArmState } from "@/types";
import { resolveBodyShape } from "@/character/body";
import {
  SLOTS,
  findItem,
  hairMaskProfile,
  hasFile,
  itemTags,
  type ClothingItem,
  type SlotCn,
  type SlotDef,
} from "@/character/render-catalog";

export type MaskTarget =
  | "head"
  | "upper"
  | "underUpper"
  | "lower"
  | "underLower"
  | "legs"
  | "lowerShadow"
  | "underLowerShadow";

export type FittedMasks = {
  clip?: string;
  leftMove?: string;
  rightMove?: string;
};

export type BellyMasks = {
  mask?: string;
  clip?: string;
  underLowerClip?: string;
  shadow?: string;
  shirtClip?: string;
  shirtBreasts?: string;
  shirtLeft?: string;
  shirtLeft2?: string;
  shirtRight?: string;
  shirtRight2?: string;
  shirtRight3?: string;
  hidesLower: boolean;
  hidesUnderLower: boolean;
};

export type ResolvedClothing = {
  slot: SlotDef;
  worn: ClothingWorn;
  item: ClothingItem;
  tags: Set<string>;
  flags: {
    useUnderAccessory: boolean;
    collarSuffix: "" | "-nocollar" | "-serafuku";
  };
};

export type ResolvedState = {
  payload: CharacterPayload;
  baseUrl: string;
  bodyShape: string;
  breastSize: number;
  belly: number;
  coverBelly: boolean;
  leftArm: "idle" | "cover";
  rightArm: RightArmState;
  clothing: Partial<Record<SlotCn, ResolvedClothing>>;
  bellyMasks: BellyMasks;
  fittedMasks: Partial<Record<SlotCn, FittedMasks>>;
  maskRegistry: Record<MaskTarget, string[]>;
  masksFor: (target: MaskTarget) => string[];
};

function wornForSlot(payload: CharacterPayload, slotCn: SlotCn): ClothingWorn | undefined {
  return payload.衣物?.[slotCn as keyof NonNullable<CharacterPayload["衣物"]>] ?? undefined;
}

function plainMaskSrc(
  baseUrl: string,
  slotDir: string,
  item: ClothingItem,
  stem = "mask",
): string | undefined {
  return hasFile(item, stem) ? `${baseUrl}clothes/${slotDir}/${item.name}/${stem}.png` : undefined;
}

function buildResolvedClothing(
  payload: CharacterPayload,
): Partial<Record<SlotCn, ResolvedClothing>> {
  const clothing: Partial<Record<SlotCn, ResolvedClothing>> = {};
  for (const slot of SLOTS) {
    const worn = wornForSlot(payload, slot.cn);
    if (!worn) continue;
    const item = findItem(slot.data, worn.名称);
    if (!item) continue;
    clothing[slot.cn] = {
      slot,
      worn,
      item,
      tags: itemTags(slot.dir, item),
      flags: {
        useUnderAccessory: false,
        collarSuffix: "",
      },
    };
  }
  return clothing;
}

function resolveClothingRules(clothing: Partial<Record<SlotCn, ResolvedClothing>>): void {
  const upper = clothing.上装;
  const lower = clothing.下装;
  const neck = clothing.颈部;

  if (
    upper?.tags.has("school_blouse") &&
    lower?.tags.has("pinafore") &&
    hasFile(lower.item, "acc-under")
  ) {
    lower.flags.useUnderAccessory = true;
  }

  if (upper && neck) {
    const upperAltDressShirt = upper.tags.has("dress_shirt") && !!upper.worn.替代;
    if (neck.item.hasCollar === 1 && upper.item.hasCollar === 1 && !upperAltDressShirt) {
      neck.flags.collarSuffix = "-nocollar";
    } else if (neck.tags.has("serafuku_neckwear") && upper.tags.has("serafuku_upper")) {
      neck.flags.collarSuffix = "-serafuku";
    }
  }
}

function registerClothingMasks(state: Omit<ResolvedState, "masksFor">): void {
  const head = state.clothing.头饰;
  if (head?.item.maskImg === 1) {
    const hair =
      typeof state.payload.发型 === "object" ? state.payload.发型.发型 : state.payload.发型;
    const stem =
      hasFile(head.item, "mask-ponytail") && hairMaskProfile(hair) === "ponytail"
        ? "mask-ponytail"
        : "mask";
    const src = plainMaskSrc(state.baseUrl, "head", head.item, stem);
    if (src) state.maskRegistry.head.push(src);
  }

  const handheld = state.clothing.手持物品;
  if (handheld?.item.maskImg === 1) {
    const src = plainMaskSrc(state.baseUrl, "handheld", handheld.item);
    if (src) state.maskRegistry.head.push(src);
  }

  const feet = state.clothing.鞋子;
  const feetMask = feet ? plainMaskSrc(state.baseUrl, "feet", feet.item) : undefined;
  if (feetMask && feet?.item.notuck !== 1) {
    state.maskRegistry.lower.push(feetMask);
    state.maskRegistry.legs.push(feetMask);
  }
}

function between(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

function buildBellyMasks(
  payload: CharacterPayload,
  baseUrl: string,
  clothing: Partial<Record<SlotCn, ResolvedClothing>>,
): BellyMasks {
  const belly = payload.孕肚 ?? 0;
  const upper = clothing.上装;
  const lower = clothing.下装;
  const underUpper = clothing.内衣上装;
  const bellyDir = `${baseUrl}clothes/belly`;
  const split = upper?.item.pregType === "split";
  const shirtBig = belly >= 22 ? "-big" : "";
  const mask =
    between(belly, 15, 24) && upper?.item.pregType === "min"
      ? `${bellyDir}/mask-min-${belly}.png`
      : between(belly, 15, 24)
        ? `${bellyDir}/mask-${belly}.png`
        : undefined;
  const clip = between(belly, 19, 24) ? `${bellyDir}/mask-clip-${belly}.png` : undefined;
  const underLowerClip = between(belly, 15, 24) ? `${bellyDir}/mask-clip-${belly}.png` : undefined;

  return {
    mask,
    clip,
    underLowerClip,
    shadow: between(belly, 8, 24) ? `${bellyDir}/shadow-${belly}.png` : undefined,
    shirtClip: split && clip ? `${bellyDir}/mask-shirt-clip${shirtBig}.png` : undefined,
    shirtBreasts: split && clip ? `${bellyDir}/mask-shirt-breasts.png` : undefined,
    shirtLeft: split && clip ? `${bellyDir}/mask-shirt-left${shirtBig}.png` : undefined,
    shirtLeft2: split && clip ? `${bellyDir}/mask-shirt-left2.png` : undefined,
    shirtRight: split && clip ? `${bellyDir}/mask-shirt-right.png` : undefined,
    shirtRight2: split && clip ? `${bellyDir}/mask-shirt-right2.png` : undefined,
    shirtRight3: split && clip ? `${bellyDir}/mask-shirt-right3.png` : undefined,
    hidesLower: Boolean(clip && upper && lower?.item.pregType !== "cover"),
    hidesUnderLower: Boolean(underLowerClip && underUpper),
  };
}

function buildFittedMasks(
  payload: CharacterPayload,
  baseUrl: string,
  clothing: Partial<Record<SlotCn, ResolvedClothing>>,
  bellyMasks: BellyMasks,
): Partial<Record<SlotCn, FittedMasks>> {
  const bodyShape = resolveBodyShape(payload.身形);
  const belly = payload.孕肚 ?? 0;
  const noPregBellyFit = !between(belly, 8, 24);
  const result: Partial<Record<SlotCn, FittedMasks>> = {};

  for (const slotCn of ["上装", "内衣上装"] as const) {
    const item = clothing[slotCn]?.item;
    if (!item) continue;
    if ((bodyShape === "curvy" || bodyShape === "slender") && item.formfitting === 1) {
      result[slotCn] = {
        clip: `${baseUrl}clothes/masks/formfitting-${bodyShape}.png`,
        leftMove: `${baseUrl}clothes/masks/formfitting-left-move.png`,
        rightMove: `${baseUrl}clothes/masks/formfitting-right-move.png`,
      };
    } else if (bodyShape === "soft" && noPregBellyFit) {
      result[slotCn] = {
        leftMove: `${baseUrl}clothes/masks/soft-left-move.png`,
        rightMove: `${baseUrl}clothes/masks/soft-right-move.png`,
      };
    }
  }

  if (bodyShape !== "soft" || !noPregBellyFit) return result;

  for (const slotCn of ["下装", "内衣下装"] as const) {
    const item = clothing[slotCn]?.item;
    if (!item) continue;
    if (payload.覆盖孕肚 || item.onePiece === 1) {
      result[slotCn] = {
        leftMove: `${baseUrl}clothes/masks/soft-left-move.png`,
        rightMove: `${baseUrl}clothes/masks/soft-right-move.png`,
      };
    }
  }
  return result;
}

function registerBodyShapeMasks(state: Omit<ResolvedState, "masksFor">): void {
  const bodyShape = state.bodyShape;
  if (bodyShape !== "soft" || between(state.belly, 8, 24)) return;

  const softLowerClip = `${state.baseUrl}clothes/masks/soft-lower-clip.png`;
  const softShadow = `${state.baseUrl}clothes/masks/soft-shadow.png`;
  const upperCheck = Boolean(state.clothing.上装 && !state.coverBelly && !state.bellyMasks.clip);
  const underUpperCheck = Boolean(state.clothing.内衣上装 && !state.bellyMasks.clip);

  if (upperCheck) {
    state.maskRegistry.lowerShadow.push(softShadow);
    if (!state.coverBelly) {
      state.maskRegistry.lower.push(softLowerClip);
      state.maskRegistry.legs.push(softLowerClip);
    }
  }
  if (underUpperCheck) {
    state.maskRegistry.underLowerShadow.push(softShadow);
    state.maskRegistry.underLower.push(softLowerClip);
  }
}

function registerBellyMasks(state: Omit<ResolvedState, "masksFor">): void {
  const { bellyMasks } = state;
  if (bellyMasks.shadow) {
    state.maskRegistry.lowerShadow.push(bellyMasks.shadow);
    state.maskRegistry.underLowerShadow.push(bellyMasks.shadow);
  }
  if (bellyMasks.clip) {
    if (bellyMasks.hidesLower) {
      state.maskRegistry.lower.push(bellyMasks.clip);
      state.maskRegistry.legs.push(bellyMasks.clip);
    }
  }
  if (bellyMasks.underLowerClip) {
    state.maskRegistry.underLower.push(bellyMasks.underLowerClip);
    state.maskRegistry.underLowerShadow.push(bellyMasks.underLowerClip);
  }
  if (bellyMasks.shirtClip) {
    state.maskRegistry.upper.push(bellyMasks.shirtClip);
    state.maskRegistry.underUpper.push(bellyMasks.shirtClip);
  } else {
    const upperClip = state.fittedMasks.上装?.clip;
    const underUpperClip = state.fittedMasks.内衣上装?.clip;
    if (upperClip) state.maskRegistry.upper.push(upperClip);
    if (underUpperClip) state.maskRegistry.underUpper.push(underUpperClip);
  }
}

export function resolveCharacterState(payload: CharacterPayload, baseUrl: string): ResolvedState {
  const clothing = buildResolvedClothing(payload);
  resolveClothingRules(clothing);
  const bellyMasks = buildBellyMasks(payload, baseUrl, clothing);
  const fittedMasks = buildFittedMasks(payload, baseUrl, clothing, bellyMasks);

  const state: Omit<ResolvedState, "masksFor"> = {
    payload,
    baseUrl,
    bodyShape: resolveBodyShape(payload.身形),
    breastSize: payload.胸部 ?? 3,
    belly: payload.孕肚 ?? 0,
    coverBelly: payload.覆盖孕肚 === true,
    leftArm: payload.左臂 === "cover" ? "cover" : "idle",
    rightArm: payload.右臂 ?? "idle",
    clothing,
    bellyMasks,
    fittedMasks,
    maskRegistry: {
      head: [],
      upper: [],
      underUpper: [],
      lower: [],
      underLower: [],
      legs: [],
      lowerShadow: [],
      underLowerShadow: [],
    },
  };

  registerBellyMasks(state);
  registerBodyShapeMasks(state);
  registerClothingMasks(state);

  return {
    ...state,
    masksFor(target) {
      return state.maskRegistry[target];
    },
  };
}
