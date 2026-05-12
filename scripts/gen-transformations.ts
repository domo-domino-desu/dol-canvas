/**
 * gen-transformations.ts
 * 扫描 img/transformations/ 目录，提取各转化类型及其部位变体，
 * 并从 clothes-testing.twee 的 i18n 条目中补全展示标签。
 */

import { join } from "path";
import {
  ensureOutDir,
  writeJson,
  listDirs,
  listPngStems,
  IMG_DIR,
  loadI18n,
  type I18nItem,
} from "./utils";

const TRANSFORM_CN: Record<string, string> = {
  angel: "天使",
  fallen: "堕天使",
  demon: "恶魔",
  cat: "猫",
  fox: "狐",
  wolf: "狼",
  cow: "牛",
  bird: "鸟",
};

const TYPE_TITLE: Record<string, string> = {
  angel: "Angel",
  fallen: "Fallen Angel",
  demon: "Demon",
  cat: "Cat",
  fox: "Fox",
  wolf: "Wolf",
  cow: "Cow",
  bird: "Bird",
};

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

function parseTransformLabels(): TransformLabels {
  const i18n = loadI18n();
  const items = [...i18n.typeB.TypeBOutputText, ...i18n.typeB.TypeBInputStoryScript]
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

  const pieces = base.split("-").map((part) => labels.variantLabels[normKey(part)] ?? part);
  return pieces.join("");
}

const labels = parseTransformLabels();
const transformDir = join(IMG_DIR, "transformations");
const types = listDirs(transformDir);

const output: Record<string, TransformData> = {};
for (const type of types) {
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
    cnName: TRANSFORM_CN[type] ?? type,
    label: labels.typeLabels[normKey(TYPE_TITLE[type] ?? type)] ?? TRANSFORM_CN[type] ?? type,
    parts,
    partLabels,
    variantLabels,
  };
}

ensureOutDir();
writeJson("transformations", output);
console.log(`gen-transformations: ${types.length} types`);
for (const [type, data] of Object.entries(output)) {
  console.log(
    `  ${type} (${data.cnName}/${data.label}): parts=[${Object.keys(data.parts).join(", ")}]`,
  );
}
console.log("gen-transformations: done");
