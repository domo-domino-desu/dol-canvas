import type { ClothingItem, SlotCn } from "@/character/render-catalog";
import type { TransformEntry } from "@/data/options/types";

export type RuntimeClothingSlot = SlotCn;
export type DefaultClothingState = "full" | "torn" | "tattered" | "frayed";
export type ClothingSide = "left" | "right";
export type LeftArmPose = "idle" | "cover";
export type RightArmPose = "idle" | "cover" | "hold";
export type PatternLayer = "primary" | "secondary" | "tertiary";
export type RuntimeTransformPart =
  | "wings-idle"
  | "wings-cover"
  | "wings-flaunt"
  | "tail-idle"
  | "tail-cover"
  | "tail-flaunt"
  | "halo"
  | "ears"
  | "horns"
  | "eyes"
  | "cheeks"
  | "feathers";

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

type States<T> = T extends { states: readonly (infer S extends string)[] }
  ? S
  : DefaultClothingState;
type Patterns<T> = T extends { patternOptions: readonly (infer P extends string)[] } ? P : never;
type LeftPoses<T> = T extends { armPoses: { left: readonly (infer P extends string)[] } }
  ? P
  : LeftArmPose;
type RightPoses<T> = T extends { armPoses: { right: readonly (infer P extends string)[] } }
  ? P
  : RightArmPose;
type BreastSizes<T> = T extends { breastImg: readonly (infer N extends number)[] }
  ? `${N}`
  : T extends { breastImg: true }
    ? "0" | "1" | "2" | "3" | "4" | "5" | "6"
    : T extends { breastImg: Record<number, number | null> }
      ? `${keyof T["breastImg"] & number}`
      : never;
type MainStateKeys<T> = T extends { mainImage: false } ? never : States<T>;
type AccessoryKeys<T> = T extends { accessory: true }
  ? T extends { accessoryIntegrityImg: true }
    ? `acc-${States<T>}`
    : "acc"
  : never;
type SleeveKeys<T> =
  | (T extends { sleeveImg: true } ? `left-${LeftPoses<T>}` | `right-${RightPoses<T>}` : never)
  | (T extends { sleeveAccImg: true }
      ? `left-${LeftPoses<T>}-acc` | `right-${RightPoses<T>}-acc`
      : never);
type BreastKeys<T> =
  | BreastSizes<T>
  | (T extends { breastAccImg: true | readonly number[] | Record<number, number | null> }
      ? `${BreastSizes<T>}-acc`
      : never);
type BackKeys<T> =
  | (T extends { backImg: true }
      ? T extends { backIntegrityImg: true }
        ? `back-${States<T>}`
        : "back"
      : never)
  | (T extends { backImgAcc: true }
      ? T extends { backIntegrityImg: true }
        ? `back-${States<T>}-acc`
        : "back-acc"
      : never);
type MaskKeys<T> = T extends { maskImg: true } ? "mask" | `mask-${States<T>}` : never;
type BranchKeys<T> =
  | (T extends { altposition: string } ? `${States<T>}-alt` | "back-alt" : never)
  | (T extends { hood: true } | { hoodposition: string } ? `${States<T>}-down` : never);
type PenisKeys<T> =
  | (T extends { penisImg: true } ? "penis" : never)
  | (T extends { penisAccImg: true } ? "acc-penis" : never);
type PatternKeys<T> =
  | `${States<T>}-${Patterns<T>}`
  | `acc-${Patterns<T>}`
  | `acc-${States<T>}-${Patterns<T>}`
  | `left-${LeftPoses<T>}-${Patterns<T>}`
  | `right-${RightPoses<T>}-${Patterns<T>}`
  | `${BreastSizes<T>}-${Patterns<T>}`
  | `${BreastSizes<T>}-acc-${Patterns<T>}`
  | (T extends { patternLayer: "tertiary" } ? Patterns<T> : never);

export type RuntimeClothingImageKey<T> =
  | MainStateKeys<T>
  | AccessoryKeys<T>
  | SleeveKeys<T>
  | BreastKeys<T>
  | BackKeys<T>
  | MaskKeys<T>
  | BranchKeys<T>
  | PenisKeys<T>
  | PatternKeys<T>;

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

export type RuntimeTransformationImageKey<T> = T extends { parts: infer P }
  ? {
      [K in keyof P & RuntimeTransformPart]: P[K] extends readonly (infer V extends string)[]
        ? `${K}/${V}`
        : never;
    }[keyof P & RuntimeTransformPart]
  : never;

export type RuntimeTransformationImages<T> = Partial<
  Record<RuntimeTransformationImageKey<T>, string>
>;

type RuntimeClothingEntry = {
  item: ClothingItem;
  images: Record<string, string>;
};

type RuntimeTransformEntry = TransformEntry & {
  images: Record<string, string>;
};

const clothing = new Map<SlotCn, RuntimeClothingEntry[]>();
const transformations = new Map<string, RuntimeTransformEntry>();
const clothingIds = new WeakMap<ClothingItem, string>();
const clothingById = new Map<string, RuntimeClothingEntry>();
const RUNTIME_CLOTHING_BASE = "runtime-clothing:";

function boolNumber(value: boolean | undefined): number {
  return value ? 1 : 0;
}

function imageKeys(images: Record<string, string>): string[] {
  return Object.keys(images).filter((key) => images[key]);
}

function normalizeStates(
  options: RuntimeClothingOptions,
  images: Record<string, string>,
): string[] {
  const configured = options.states?.length
    ? [...options.states]
    : (["full", "torn", "tattered", "frayed"] satisfies DefaultClothingState[]);
  const keys = imageKeys(images);
  const present = configured.filter((state) =>
    keys.some((key) => key === state || key.startsWith(`${state}-`)),
  );
  return present.length ? present : configured;
}

function breastSetting(
  value: RuntimeClothingOptions["breastImg"] | RuntimeClothingOptions["breastAccImg"],
): number | Record<string, number | null> {
  if (value === true) return 1;
  if (Array.isArray(value)) return Object.fromEntries(value.map((size) => [String(size), size]));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, mapped]) => [String(key), mapped]));
  }
  return 0;
}

function normalizeClothingItem(
  options: RuntimeClothingOptions,
  images: Record<string, string>,
): ClothingItem {
  const allFiles = imageKeys(images);
  const armVariants = allFiles.filter((file) => /^(left|right)-(idle|cover|hold)/.test(file));
  const states = normalizeStates(options, images);
  const accessory = boolNumber(options.accessory);

  return {
    name: options.name,
    cnName: options.cnName,
    colorOptions: [...(options.colorOptions ?? [])],
    accColorOptions: [...(options.accColorOptions ?? [])],
    patternOptions: [...(options.patternOptions ?? [])],
    patternLayer: options.patternLayer ?? "",
    states,
    numeric: allFiles.filter((file) => /^\d+$/.test(file)).sort((a, b) => +a - +b),
    armVariants,
    allFiles,
    hasAcc: accessory > 0,
    accessory,
    accessoryIntegrityImg: options.accessoryIntegrityImg === true,
    mainImage: options.mainImage === false ? 0 : 1,
    accImage: options.accImage === false ? 0 : 1,
    leftImage: options.leftImage === false ? 0 : 1,
    rightImage: options.rightImage === false ? 0 : 1,
    coverImage: options.coverImage === false ? 0 : 1,
    sleeveImg: options.sleeveImg === true,
    sleeveAccImg: options.sleeveAccImg === true,
    sleeveColour: options.sleeveColour === "primary" ? "" : (options.sleeveColour ?? ""),
    breastImg: breastSetting(options.breastImg),
    breastAccImg: breastSetting(options.breastAccImg),
    breastPattern: options.breastPattern === true,
    backImg: boolNumber(options.backImg),
    backImgAcc: boolNumber(options.backImgAcc),
    backImgColour: options.backImgColour === "primary" ? "" : (options.backImgColour ?? ""),
    backImgAccColour:
      options.backImgAccColour === "primary" ? "" : (options.backImgAccColour ?? ""),
    backIntegrityImg: options.backIntegrityImg === true,
    maskImg: boolNumber(options.maskImg),
    altposition: options.altposition ?? "",
    altdisabled: [...(options.altdisabled ?? [])],
    hood: boolNumber(options.hood),
    hoodposition: options.hoodposition ?? "",
    outfitPrimaryHead: false,
    outfitSecondary: false,
    pregType: options.pregType ?? 0,
    formfitting: boolNumber(options.formfitting),
    notuck: boolNumber(options.notuck),
    onePiece: boolNumber(options.onePiece),
    hasCollar: boolNumber(options.hasCollar),
    penisImg: boolNumber(options.penisImg),
    penisAccImg: boolNumber(options.penisAccImg),
    branchHints: {
      替代: !!options.altposition,
      兜帽: !!options.hood || !!options.hoodposition,
      卷袖: allFiles.some((file) => file.endsWith("-rolled")),
      阴茎凸起自动: !!options.penisImg || !!options.penisAccImg,
      领口变体自动: allFiles.some(
        (file) => file.includes("-nocollar") || file.includes("-serafuku"),
      ),
      背面层: !!options.backImg || !!options.backImgAcc,
      遮罩: !!options.maskImg,
      孕肚适配: !!options.pregType || allFiles.some((file) => /(?:preg|belly|shadow)/.test(file)),
    },
    detail: boolNumber(options.detail),
    zIndex: options.zIndex == null ? "" : String(options.zIndex),
  };
}

export function registerClothingItem<
  TSlot extends RuntimeClothingSlot,
  TOptions extends RuntimeClothingOptions,
>(type: TSlot, options: TOptions, images: RuntimeClothingImages<TOptions>): void {
  const normalizedImages = images as Record<string, string>;
  const item = normalizeClothingItem(options, normalizedImages);
  const list = clothing.get(type) ?? [];
  if (list.some((entry) => entry.item.name === item.name || entry.item.cnName === item.cnName)) {
    throw new Error(`Runtime clothing already registered: ${type}/${item.cnName}`);
  }
  const entry = { item, images: normalizedImages };
  const id = `${type}/${item.name}`;
  clothingIds.set(item, id);
  clothingById.set(id, entry);
  clothing.set(type, [...list, entry]);
}

export function unregisterClothingItem(type: RuntimeClothingSlot, nameOrCnName: string): boolean {
  const list = clothing.get(type);
  if (!list) return false;
  const next = list.filter(
    (entry) => entry.item.name !== nameOrCnName && entry.item.cnName !== nameOrCnName,
  );
  for (const entry of list) {
    if (entry.item.name === nameOrCnName || entry.item.cnName === nameOrCnName) {
      const id = clothingIds.get(entry.item);
      if (id) clothingById.delete(id);
    }
  }
  clothing.set(type, next);
  return next.length !== list.length;
}

export function runtimeClothingItems(type: SlotCn): ClothingItem[] {
  return clothing.get(type)?.map((entry) => entry.item) ?? [];
}

export function runtimeClothingImage(item: ClothingItem, stem: string): string | undefined {
  const id = clothingIds.get(item);
  return id ? clothingById.get(id)?.images[stem] : undefined;
}

export function runtimeClothingBase(item: ClothingItem): string | undefined {
  const id = clothingIds.get(item);
  return id ? `${RUNTIME_CLOTHING_BASE}${id}/` : undefined;
}

export function runtimeClothingImageFromBase(base: string, stem: string): string | undefined {
  if (!base.startsWith(RUNTIME_CLOTHING_BASE)) return undefined;
  const id = base.slice(RUNTIME_CLOTHING_BASE.length).replace(/\/$/, "");
  return clothingById.get(id)?.images[stem];
}

export function registerTransformation<
  TType extends string,
  TOptions extends RuntimeTransformationOptions,
>(type: TType, options: TOptions, images: RuntimeTransformationImages<TOptions>): void {
  if (transformations.has(type)) {
    throw new Error(`Runtime transformation already registered: ${type}`);
  }
  transformations.set(type, {
    cnName: options.cnName,
    label: options.label,
    parts: Object.fromEntries(
      Object.entries(options.parts).map(([part, variants]) => [part, [...(variants ?? [])]]),
    ) as Record<string, string[]>,
    partLabels: options.partLabels,
    variantLabels: options.variantLabels,
    images: images as Record<string, string>,
  });
}

export function unregisterTransformation(type: string): boolean {
  return transformations.delete(type);
}

export function runtimeTransformations(): Record<string, RuntimeTransformEntry> {
  return Object.fromEntries(transformations.entries());
}

export function runtimeTransformationImage(
  transform: TransformEntry,
  part: string,
  variant: string,
): string | undefined {
  for (const entry of transformations.values()) {
    if (entry === transform) return entry.images[`${part}/${variant}`];
  }
  return undefined;
}

export function clearRuntimeAssets(): void {
  clothing.clear();
  clothingById.clear();
  transformations.clear();
}

export function getRuntimeAssetRegistry(): {
  clothing: Record<string, ClothingItem[]>;
  transformations: Record<string, TransformEntry>;
} {
  return {
    clothing: Object.fromEntries(
      [...clothing.entries()].map(([slot, entries]) => [slot, entries.map((entry) => entry.item)]),
    ),
    transformations: runtimeTransformations(),
  };
}
