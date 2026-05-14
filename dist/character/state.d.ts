import type { CharacterPayload, ClothingWorn, RightArmState } from "../types";
import { type ClothingItem, type SlotCn, type SlotDef } from "./render-catalog";
export type MaskTarget = "head" | "upper" | "underUpper" | "lower" | "underLower" | "legs" | "lowerShadow" | "underLowerShadow";
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
export declare function resolveCharacterState(payload: CharacterPayload, baseUrl: string): ResolvedState;
