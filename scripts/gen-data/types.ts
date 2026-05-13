export interface I18nItem {
  f?: string;
  t?: string;
  fileName?: string;
  pN?: string;
  pos?: number;
}

export interface I18nData {
  typeB: {
    TypeBOutputText: I18nItem[];
    TypeBInputStoryScript: I18nItem[];
  };
}

export type Whitelist = Record<string, string[]>;

export interface SlotDef {
  cn: string;
  slot: string;
  imgDir: string;
  jsFile: string;
}

export interface DolClothingInfo {
  name: string;
  name_cap?: string;
  nameCapEn: string;
  variable: string;
  colour_options?: string[];
  accessory_colour_options?: string[];
  pattern_options?: string[];
  pattern_layer?: string;
  accessory?: number;
  accessory_integrity_img?: number | boolean;
  mainImage?: number;
  accImage?: number;
  leftImage?: number;
  rightImage?: number;
  coverImage?: number;
  sleeve_img?: number | boolean;
  sleeve_acc_img?: number | boolean;
  sleeve_colour?: string | number;
  breast_img?: number | Record<string, number | null>;
  breast_acc_img?: number | Record<string, number | null>;
  breast_pattern?: boolean;
  back_img?: number | string;
  back_img_acc?: number | string;
  back_img_colour?: string;
  back_img_acc_colour?: string;
  back_integrity_img?: number | boolean;
  mask_img?: number;
  altposition?: string;
  altdisabled?: string[];
  hood?: number;
  hoodposition?: string;
  outfitPrimary?: Record<string, unknown>;
  outfitSecondary?: unknown;
  pregType?: number | string;
  formfitting?: number;
  notuck?: number;
  one_piece?: number;
  has_collar?: number;
  penis_img?: number;
  penis_acc_img?: number;
  detail?: number;
  zIndex?: string;
}

export interface DolHairStyle {
  name: string;
  name_cap: string;
  variable: string;
  type?: string[];
}

export interface DolHairSections {
  sides: DolHairStyle[];
  fringe: DolHairStyle[];
}

export interface ColorFilter {
  blend?: string;
  blendMode?: string;
  brightness?: number;
  contrast?: number;
  desaturate?: boolean;
}

export interface DolColorEntry {
  variable: string;
  name?: string;
  canvasfilter?: ColorFilter;
}

export interface SkinOption {
  gradient: string[];
  blendMode: string;
}

export interface HairGradientPrototype {
  gradient: "linear" | "radial";
  values: number[];
  stops: [number, number];
  lengthOffset?: "minus-half";
}

export type HairGradientEntry = HairGradientPrototype | Record<string, HairGradientPrototype>;

export interface ParsedColours {
  hair: DolColorEntry[];
  eyes: DolColorEntry[];
  clothes: DolColorEntry[];
  skin: Record<string, SkinOption>;
  hairGradients: Record<"fringe" | "sides", Record<string, HairGradientEntry>>;
}

export interface MappingEntry {
  en: string;
  variable: string;
}

export interface ClothingMappingEntry extends MappingEntry {
  slot: string;
}

export interface BuildMappings {
  clothing: Record<string, ClothingMappingEntry>;
  clothingBySlot: Record<string, Record<string, ClothingMappingEntry>>;
  colors: Record<string, { en: string }>;
  hairStyles: Record<string, MappingEntry>;
  fringeStyles: Record<string, MappingEntry>;
  demeanor: Record<string, { en: string }>;
  bodyShapes: Record<string, { en: string }>;
  hairLengths: Record<string, { en: string }>;
  hairColorStyles: Record<string, { en: string }>;
  transformTypes: Record<string, { en: string }>;
}

export interface FsCache {
  images: Set<string>;
}

export interface BuildContext {
  root: string;
  imgDir: string;
  outDir: string;
  dolPath: string;
  i18nPath: string;
  i18nRaw: I18nData;
  whitelist: Whitelist;
  fsCache: FsCache;
  dol: {
    clothing: Record<string, DolClothingInfo[]>;
    hair: DolHairSections;
    colors: ParsedColours;
  };
  mappings: BuildMappings;
  validWhitelist: Whitelist;
  warnings: string[];
}
