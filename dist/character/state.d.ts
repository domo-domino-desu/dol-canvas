import type { CharacterPayload, ClothingWorn, RightArmState } from "../types";
import { type ClothingItem, type SlotCn, type SlotDef } from "./render-catalog";
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
export declare function resolveCharacterState(payload: CharacterPayload, baseUrl: string): ResolvedState;
