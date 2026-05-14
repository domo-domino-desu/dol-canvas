import type { BuildContext, ColorFilter, DolColorEntry } from "../types";

interface ColorEntry {
  variable: string;
  name: string;
  cnName: string;
  filter: ColorFilter;
}

function colorCnMap(ctx: BuildContext): Record<string, string> {
  const result: Record<string, string> = {};
  for (const item of ctx.i18nRaw.typeB.TypeBOutputText) {
    if (item.fileName !== "colours.js") continue;
    const mEn = item.f?.match(/^name(_cap)?: "([^"]+)"/);
    const mCn = item.t?.match(/^name(_cap)?: "([^"]+)"/);
    if (mEn && mCn) result[mEn[2]!.toLowerCase()] = mCn[2]!;
  }
  return result;
}

function stripDefaultFilter(filter: ColorFilter): ColorFilter {
  const result = { ...filter };
  if (result.blendMode === "hard-light") delete result.blendMode;
  return result;
}

function normalizeColors(items: DolColorEntry[], cnMap: Record<string, string>): ColorEntry[] {
  return items
    .map((item) => ({
      variable: item.variable,
      name: item.name ?? item.variable,
      cnName: cnMap[(item.name ?? "").toLowerCase()] ?? cnMap[item.variable.toLowerCase()] ?? "",
      filter: stripDefaultFilter(item.canvasfilter ?? {}),
    }))
    .filter(
      (item) =>
        item.variable !== "random" &&
        item.name.toLowerCase() !== "random" &&
        item.cnName !== "随机",
    );
}

export function generateColors(ctx: BuildContext) {
  const cnMap = colorCnMap(ctx);
  const hair = normalizeColors(ctx.dol.colors.hair, cnMap);
  const eyes = normalizeColors(ctx.dol.colors.eyes, cnMap);
  const clothes = normalizeColors(ctx.dol.colors.clothes, cnMap);
  const condom = normalizeColors(ctx.dol.colors.condom, cnMap);

  console.log(`  hair colors: ${hair.length}`);
  console.log(`  eye colors: ${eyes.length}`);
  console.log(`  cloth colors: ${clothes.length}`);
  console.log(`  condom colors: ${condom.length}`);
  console.log(`  skin types: ${Object.keys(ctx.dol.colors.skin).length}`);

  return {
    hair,
    eyes,
    clothes,
    condom,
    skin: ctx.dol.colors.skin,
    hairGradients: ctx.dol.colors.hairGradients,
  };
}
