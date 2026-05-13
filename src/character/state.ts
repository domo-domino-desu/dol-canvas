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

export type MaskTarget = "head" | "lower" | "legs";

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
  leftArm: "idle" | "cover";
  rightArm: RightArmState;
  clothing: Partial<Record<SlotCn, ResolvedClothing>>;
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

export function resolveCharacterState(payload: CharacterPayload, baseUrl: string): ResolvedState {
  const clothing = buildResolvedClothing(payload);
  resolveClothingRules(clothing);

  const state: Omit<ResolvedState, "masksFor"> = {
    payload,
    baseUrl,
    bodyShape: resolveBodyShape(payload.身形),
    breastSize: payload.胸部 ?? 3,
    belly: payload.孕肚 ?? 0,
    leftArm: payload.左臂 === "cover" ? "cover" : "idle",
    rightArm: payload.右臂 ?? "idle",
    clothing,
    maskRegistry: {
      head: [],
      lower: [],
      legs: [],
    },
  };

  registerClothingMasks(state);

  return {
    ...state,
    masksFor(target) {
      return state.maskRegistry[target];
    },
  };
}
