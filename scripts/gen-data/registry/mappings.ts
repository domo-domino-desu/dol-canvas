import { FALLBACK_HAIR_LENGTHS, FALLBACK_TRANSFORM_TYPES } from "../config/fallbacks";
import { I18N_CLOTHING_SLOTS } from "../config/slots";
import type {
  BuildContext,
  BuildMappings,
  ClothingMappingEntry,
  I18nItem,
  MappingEntry,
} from "../types";

function cleanText(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/：$/, "")
    .replace(/:$/, "")
    .replace(/化$/, "")
    .trim();
}

function normKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function allI18nItems(ctx: BuildContext): I18nItem[] {
  return [...ctx.i18nRaw.typeB.TypeBOutputText, ...ctx.i18nRaw.typeB.TypeBInputStoryScript];
}

function buildClothingCapToCn(ctx: BuildContext): Record<string, string> {
  const result: Record<string, string> = {};
  for (const item of ctx.i18nRaw.typeB.TypeBOutputText) {
    const mEn = item.f?.match(/^name_cap:\s*"([^"]+)"/);
    const mCn = item.t?.match(/cn_name_cap:\s*"([^"]+)"/);
    if (mEn && mCn) result[mEn[1]!] = mCn[1]!;
  }
  return result;
}

function buildStoryCapToCn(ctx: BuildContext): Record<string, string> {
  const result: Record<string, string> = {};
  for (const item of ctx.i18nRaw.typeB.TypeBInputStoryScript) {
    const mEn = item.f?.match(/^name_cap:\s*"([^"]+)"/);
    const mCn = item.t?.match(/^name_cap:\s*"([^"]+)"/);
    if (mEn && mCn) result[mEn[1]!] = mCn[1]!;
  }
  return result;
}

function buildClothingMappings(
  ctx: BuildContext,
): Pick<BuildMappings, "clothing" | "clothingBySlot"> {
  const clothingCapToCn = buildClothingCapToCn(ctx);
  const raw: Array<{ cn: string; en: string; variable: string; slot: string }> = [];

  for (const { slot } of I18N_CLOTHING_SLOTS) {
    for (const item of ctx.dol.clothing[slot] ?? []) {
      const en = item.name_cap ?? item.nameCapEn ?? item.name;
      const cn = clothingCapToCn[en];
      if (cn) raw.push({ cn, en, variable: item.variable, slot });
    }
  }

  const counts = raw.reduce<Record<string, number>>((acc, item) => {
    const key = `${item.slot}\u0000${item.cn}`;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const clothing: Record<string, ClothingMappingEntry> = {};
  const clothingBySlot: Record<string, Record<string, ClothingMappingEntry>> = {};
  for (const item of raw) {
    const key =
      (counts[`${item.slot}\u0000${item.cn}`] ?? 0) > 1 ? `${item.cn}${item.variable}` : item.cn;
    const entry = { en: item.en, variable: item.variable, slot: item.slot };
    clothingBySlot[item.slot] ??= {};
    clothingBySlot[item.slot]![key] = entry;
    clothing[key] ??= entry;
  }

  return { clothing, clothingBySlot };
}

function buildHairMappings(ctx: BuildContext): Pick<BuildMappings, "hairStyles" | "fringeStyles"> {
  const storyCapToCn = buildStoryCapToCn(ctx);
  const fromHair = (items: typeof ctx.dol.hair.sides): Record<string, MappingEntry> => {
    const result: Record<string, MappingEntry> = {};
    for (const item of items) {
      const cn = storyCapToCn[item.name_cap];
      if (cn) result[cn] = { en: item.name_cap, variable: item.variable };
    }
    return result;
  };

  return {
    hairStyles: fromHair(ctx.dol.hair.sides),
    fringeStyles: fromHair(ctx.dol.hair.fringe),
  };
}

function buildColors(ctx: BuildContext): Record<string, { en: string }> {
  const colors: Record<string, { en: string }> = {};
  for (const item of ctx.i18nRaw.typeB.TypeBOutputText) {
    if (item.fileName !== "colours.js") continue;
    const mEn = item.f?.match(/^name(?:_cap)?:\s*"([^"]+)"/);
    const mCn = item.t?.match(/^name(?:_cap)?:\s*"([^"]+)"/);
    if (mEn && mCn && mEn[1] !== mCn[1]) {
      const en = mEn[1]!.toLowerCase();
      colors[mCn[1]!] ??= { en };
    }
  }
  return colors;
}

function buildHairColorStyles(ctx: BuildContext): Record<string, { en: string }> {
  const result: Record<string, { en: string }> = {};
  for (const item of ctx.i18nRaw.typeB.TypeBInputStoryScript) {
    if (item.fileName !== "hairDressers.twee") continue;
    const mEn = item.f?.match(/<<option\s+"([^"]+)"\s+"(low-ombre|high-ombre|split|face-frame)">>/);
    const mCn = item.t?.match(/<<option\s+"([^"]+)"\s+"(low-ombre|high-ombre|split|face-frame)">>/);
    if (mEn && mCn && mEn[2] === mCn[2]) result[mCn[1]!] = { en: mCn[2]! };
  }
  return result;
}

function buildDemeanor(ctx: BuildContext): Record<string, { en: string }> {
  const result: Record<string, { en: string }> = {};
  for (const item of ctx.i18nRaw.typeB.TypeBInputStoryScript) {
    if (item.fileName !== "variables-static.twee") continue;
    const mEn = item.f?.match(/^"([A-Za-z]+)":\s*"([a-z]+)",?$/);
    const mCn = item.t?.match(/^"([^"]+)":\s*"([a-z]+)",?$/);
    if (mEn && mCn && mEn[2] === mCn[2]) result[mCn[1]!] = { en: mCn[2]! };
  }
  return result;
}

function buildBodyShapes(ctx: BuildContext): Record<string, { en: string }> {
  const result: Record<string, { en: string }> = {};
  for (const item of ctx.i18nRaw.typeB.TypeBInputStoryScript) {
    if (!item.t?.includes("bodyShapescn")) continue;
    const match = item.t.match(/bodyShapescn to \{([^}]+)\}/);
    if (!match) continue;
    for (const pair of match[1]!.matchAll(/"([^"]+)":\s*"([^"]+)"/g)) {
      result[pair[1]!] = { en: pair[2]! };
    }
    break;
  }
  return result;
}

function buildTransformTypes(ctx: BuildContext): Record<string, { en: string }> {
  const titleToType: Record<string, string> = {
    angel: "angel",
    fallenangel: "fallen",
    demon: "demon",
    cat: "cat",
    fox: "fox",
    wolf: "wolf",
    cow: "cow",
    bird: "bird",
  };
  const result: Record<string, { en: string }> = {};
  const items = allI18nItems(ctx)
    .filter(
      (item) =>
        item.fileName === "clothes-testing.twee" && item.pN === "clothesTestingImageGenerate",
    )
    .sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0));

  for (const item of items) {
    const typeMatch = item.f?.match(/<span class="gold">([^<]+):<\/span>/);
    const cnMatch = item.t?.match(/<span class="gold">([^<]+)：<\/span>/);
    if (!typeMatch || !cnMatch) continue;
    const en = titleToType[normKey(typeMatch[1]!)];
    if (en) result[cleanText(cnMatch[1]!)] = { en };
  }

  return { ...FALLBACK_TRANSFORM_TYPES, ...result };
}

export function buildMappings(ctx: BuildContext): BuildMappings {
  return {
    ...buildClothingMappings(ctx),
    ...buildHairMappings(ctx),
    colors: buildColors(ctx),
    demeanor: buildDemeanor(ctx),
    bodyShapes: buildBodyShapes(ctx),
    hairLengths: FALLBACK_HAIR_LENGTHS,
    hairColorStyles: buildHairColorStyles(ctx),
    transformTypes: buildTransformTypes(ctx),
  };
}
