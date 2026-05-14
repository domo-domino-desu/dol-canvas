import type { ClothingItem, SlotCn } from "./character/render-catalog";
import type { TransformEntry } from "./data/options/types";
export type RuntimeClothingSlot = SlotCn;
export type DefaultClothingState = "full" | "torn" | "tattered" | "frayed";
export type ClothingSide = "left" | "right";
export type LeftArmPose = "idle" | "cover";
export type RightArmPose = "idle" | "cover" | "hold";
export type PatternLayer = "primary" | "secondary" | "tertiary";
export type RuntimeTransformPart = "wings-idle" | "wings-cover" | "wings-flaunt" | "tail-idle" | "tail-cover" | "tail-flaunt" | "halo" | "ears" | "horns" | "eyes" | "cheeks" | "feathers";
export type RuntimeClothingOptions = {
    name: string;
    cnName: string;
    states?: readonly string[];
    colorOptions?: readonly string[];
    accColorOptions?: readonly string[];
    patternOptions?: readonly string[];
    patternLayer?: PatternLayer;
    accessory?: boolean;
    accessoryIntegrityImg?: boolean;
    mainImage?: boolean;
    accImage?: boolean;
    leftImage?: boolean;
    rightImage?: boolean;
    coverImage?: boolean;
    sleeveImg?: boolean;
    sleeveAccImg?: boolean;
    sleeveColour?: "primary" | "secondary" | "pattern" | "none" | string | number;
    armPoses?: {
        left?: readonly LeftArmPose[];
        right?: readonly RightArmPose[];
    };
    breastImg?: true | readonly number[] | Record<number, number | null>;
    breastAccImg?: boolean | readonly number[] | Record<number, number | null>;
    breastPattern?: boolean;
    backImg?: boolean;
    backImgAcc?: boolean;
    backImgColour?: "primary" | "secondary" | "none" | string;
    backImgAccColour?: "primary" | "secondary" | "none" | string;
    backIntegrityImg?: boolean;
    maskImg?: boolean;
    altposition?: string;
    altdisabled?: readonly string[];
    hood?: boolean;
    hoodposition?: string;
    pregType?: 0 | "split" | "min" | "cover" | string;
    formfitting?: boolean;
    notuck?: boolean;
    onePiece?: boolean;
    hasCollar?: boolean;
    penisImg?: boolean;
    penisAccImg?: boolean;
    detail?: boolean;
    zIndex?: string | number;
};
type States<T> = T extends {
    states: readonly (infer S extends string)[];
} ? S : DefaultClothingState;
type Patterns<T> = T extends {
    patternOptions: readonly (infer P extends string)[];
} ? P : never;
type LeftPoses<T> = T extends {
    armPoses: {
        left: readonly (infer P extends string)[];
    };
} ? P : LeftArmPose;
type RightPoses<T> = T extends {
    armPoses: {
        right: readonly (infer P extends string)[];
    };
} ? P : RightArmPose;
type BreastSizes<T> = T extends {
    breastImg: readonly (infer N extends number)[];
} ? `${N}` : T extends {
    breastImg: true;
} ? "0" | "1" | "2" | "3" | "4" | "5" | "6" : T extends {
    breastImg: Record<number, number | null>;
} ? `${keyof T["breastImg"] & number}` : never;
type MainStateKeys<T> = T extends {
    mainImage: false;
} ? never : States<T>;
type AccessoryKeys<T> = T extends {
    accessory: true;
} ? T extends {
    accessoryIntegrityImg: true;
} ? `acc-${States<T>}` : "acc" : never;
type SleeveKeys<T> = (T extends {
    sleeveImg: true;
} ? `left-${LeftPoses<T>}` | `right-${RightPoses<T>}` : never) | (T extends {
    sleeveAccImg: true;
} ? `left-${LeftPoses<T>}-acc` | `right-${RightPoses<T>}-acc` : never);
type BreastKeys<T> = BreastSizes<T> | (T extends {
    breastAccImg: true | readonly number[] | Record<number, number | null>;
} ? `${BreastSizes<T>}-acc` : never);
type BackKeys<T> = (T extends {
    backImg: true;
} ? T extends {
    backIntegrityImg: true;
} ? `back-${States<T>}` : "back" : never) | (T extends {
    backImgAcc: true;
} ? T extends {
    backIntegrityImg: true;
} ? `back-${States<T>}-acc` : "back-acc" : never);
type MaskKeys<T> = T extends {
    maskImg: true;
} ? "mask" | `mask-${States<T>}` : never;
type BranchKeys<T> = (T extends {
    altposition: string;
} ? `${States<T>}-alt` | "back-alt" : never) | (T extends {
    hood: true;
} | {
    hoodposition: string;
} ? `${States<T>}-down` : never);
type PenisKeys<T> = (T extends {
    penisImg: true;
} ? "penis" : never) | (T extends {
    penisAccImg: true;
} ? "acc-penis" : never);
type PatternKeys<T> = `${States<T>}-${Patterns<T>}` | `acc-${Patterns<T>}` | `acc-${States<T>}-${Patterns<T>}` | `left-${LeftPoses<T>}-${Patterns<T>}` | `right-${RightPoses<T>}-${Patterns<T>}` | `${BreastSizes<T>}-${Patterns<T>}` | `${BreastSizes<T>}-acc-${Patterns<T>}` | (T extends {
    patternLayer: "tertiary";
} ? Patterns<T> : never);
export type RuntimeClothingImageKey<T> = MainStateKeys<T> | AccessoryKeys<T> | SleeveKeys<T> | BreastKeys<T> | BackKeys<T> | MaskKeys<T> | BranchKeys<T> | PenisKeys<T> | PatternKeys<T>;
export type RuntimeClothingImages<T> = Partial<Record<RuntimeClothingImageKey<T>, string>>;
export type RuntimeTransformationOptions = {
    cnName: string;
    label?: string;
    parts: Partial<Record<RuntimeTransformPart, readonly string[]>>;
    partLabels?: Partial<Record<RuntimeTransformPart, string>>;
    variantLabels?: {
        [K in RuntimeTransformPart]?: Record<string, string>;
    };
};
export type RuntimeTransformationImageKey<T> = T extends {
    parts: infer P;
} ? {
    [K in keyof P & RuntimeTransformPart]: P[K] extends readonly (infer V extends string)[] ? `${K}/${V}` : never;
}[keyof P & RuntimeTransformPart] : never;
export type RuntimeTransformationImages<T> = Partial<Record<RuntimeTransformationImageKey<T>, string>>;
type RuntimeTransformEntry = TransformEntry & {
    images: Record<string, string>;
};
export declare function registerClothingItem<TSlot extends RuntimeClothingSlot, TOptions extends RuntimeClothingOptions>(type: TSlot, options: TOptions, images: RuntimeClothingImages<TOptions>): void;
export declare function unregisterClothingItem(type: RuntimeClothingSlot, nameOrCnName: string): boolean;
export declare function runtimeClothingItems(type: SlotCn): ClothingItem[];
export declare function runtimeClothingImage(item: ClothingItem, stem: string): string | undefined;
export declare function runtimeClothingBase(item: ClothingItem): string | undefined;
export declare function runtimeClothingImageFromBase(base: string, stem: string): string | undefined;
export declare function registerTransformation<TType extends string, TOptions extends RuntimeTransformationOptions>(type: TType, options: TOptions, images: RuntimeTransformationImages<TOptions>): void;
export declare function unregisterTransformation(type: string): boolean;
export declare function runtimeTransformations(): Record<string, RuntimeTransformEntry>;
export declare function runtimeTransformationImage(transform: TransformEntry, part: string, variant: string): string | undefined;
export declare function clearRuntimeAssets(): void;
export declare function getRuntimeAssetRegistry(): {
    clothing: Record<string, ClothingItem[]>;
    transformations: Record<string, TransformEntry>;
};
export {};
