import { join } from "node:path";
import type { BuildContext, I18nItem } from "../types";
import { listDirs, listPngStems } from "../utils/fs";

interface TransformLabels {
  typeLabels: Record<string, string>;
  partLabels: Record<string, string>;
  variantLabels: Record<string, string>;
}

interface TransformData {
  cnName: string;
  label: string;
  parts: Record<string, string[]>;
  partLabels: Record<string, string>;
  variantLabels: Record<string, Record<string, string>>;
}

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

function parseOption(item: I18nItem): { value: string; label: string } | undefined {
  const en =
    item.f?.match(/<<option\s+"[^"]+"\s+"([^"]+)">>/) ?? item.f?.match(/<<option\s+"([^"]+)">>/);
  const cn = item.t?.match(/<<option\s+"([^"]+)"(?:\s+"[^"]+")?>>/);
  if (!en || !cn) return undefined;
  return { value: normKey(en[1]!), label: cn[1]! };
}

function parseTransformLabels(ctx: BuildContext): TransformLabels {
  const items = [...ctx.i18nRaw.typeB.TypeBOutputText, ...ctx.i18nRaw.typeB.TypeBInputStoryScript]
    .filter(
      (item) =>
        item.fileName === "clothes-testing.twee" && item.pN === "clothesTestingImageGenerate",
    )
    .sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0));

  const typeLabels: Record<string, string> = {};
  const partLabels: Record<string, string> = {};
  const variantLabels: Record<string, string> = {};
  let inTransforms = false;

  for (const item of items) {
    if (item.f?.includes("<h4>Transformations</h4>")) {
      inTransforms = true;
      continue;
    }
    if (inTransforms && item.f?.includes("<h4>Clothes</h4>")) break;
    if (!inTransforms) continue;

    const typeMatch = item.f?.match(/<span class="gold">([^<]+):<\/span>/);
    if (typeMatch && item.t) {
      const cnMatch = item.t.match(/<span class="gold">([^<]+)：<\/span>/);
      if (cnMatch) typeLabels[normKey(typeMatch[1]!)] = cleanText(cnMatch[1]!);
      continue;
    }

    const partMatch = item.f?.match(/^([A-Za-z ]+):$/);
    if (partMatch && item.t) {
      partLabels[normKey(partMatch[1]!)] = cleanText(item.t);
      continue;
    }

    const option = parseOption(item);
    if (option) variantLabels[option.value] = option.label;
  }

  return { typeLabels, partLabels, variantLabels };
}

function labelForPart(part: string, labels: TransformLabels): string {
  const base = part.replace(/-(idle|cover|flaunt)$/, "").replace(/-/g, " ");
  return labels.partLabels[normKey(base)] ?? part;
}

function labelForVariant(variant: string, labels: TransformLabels): string {
  const base = variant
    .split("-")
    .filter((part) => !["back", "front", "left", "right"].includes(part))
    .join("-");
  const direct = labels.variantLabels[normKey(base)];
  if (direct) return direct;

  const compact = labels.variantLabels[normKey(base.replace(/-/g, ""))];
  if (compact) return compact;

  return base
    .split("-")
    .map((part) => labels.variantLabels[normKey(part)] ?? part)
    .join("");
}

function transformCnByEn(ctx: BuildContext): Record<string, string> {
  const result = Object.fromEntries(
    Object.entries(ctx.mappings.transformTypes).map(([cn, entry]) => [entry.en, cn]),
  );
  for (const cn of ctx.whitelist["转化"] ?? []) {
    const en = ctx.mappings.transformTypes[cn]?.en;
    if (en) result[en] = cn;
  }
  return result;
}

function typeTitle(type: string): string {
  const titles: Record<string, string> = {
    angel: "Angel",
    fallen: "Fallen Angel",
    demon: "Demon",
    cat: "Cat",
    fox: "Fox",
    wolf: "Wolf",
    cow: "Cow",
    bird: "Bird",
  };
  return titles[type] ?? type;
}

export function generateTransformations(ctx: BuildContext): Record<string, TransformData> {
  const labels = parseTransformLabels(ctx);
  const cnByEn = transformCnByEn(ctx);
  const transformDir = join(ctx.imgDir, "transformations");
  const output: Record<string, TransformData> = {};

  for (const type of listDirs(transformDir)) {
    const typeDir = join(transformDir, type);
    const parts: Record<string, string[]> = {};
    const partLabels: Record<string, string> = {};
    const variantLabels: Record<string, Record<string, string>> = {};

    for (const part of listDirs(typeDir)) {
      const variants = listPngStems(join(typeDir, part));
      parts[part] = variants;
      partLabels[part] = labelForPart(part, labels);
      variantLabels[part] = Object.fromEntries(
        variants.map((variant) => [variant, labelForVariant(variant, labels)]),
      );
    }

    output[type] = {
      cnName: cnByEn[type] ?? type,
      label: labels.typeLabels[normKey(typeTitle(type))] ?? cnByEn[type] ?? type,
      parts,
      partLabels,
      variantLabels,
    };
  }

  console.log(`  transformations: ${Object.keys(output).length} types`);
  return output;
}
