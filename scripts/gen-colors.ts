/**
 * gen-colors.ts
 * 从 DoL 的 colours.js 中提取发色、瞳色的 canvasfilter 定义，
 * 结合 i18n 翻译，输出 src/data/generated/colors.json
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { ensureOutDir, writeJson, loadI18n, DOL_PATH } from "./utils";

const COLOURS_JS = join(DOL_PATH, "game/04-Variables/colours.js");

interface ColorFilter {
  blend?: string;
  blendMode?: string;
  brightness?: number;
  contrast?: number;
  desaturate?: boolean;
}

interface ColorEntry {
  variable: string;
  name: string;
  cnName: string;
  filter: ColorFilter;
}

interface SkinOption {
  gradient: string[];
  blendMode: string;
}

function parseColourArray(text: string, arrayName: string): ColorEntry[] {
  const results: ColorEntry[] = [];
  const arrayStart = text.indexOf(`setup.colours.${arrayName} = [`);
  if (arrayStart === -1) return results;

  let depth = 0,
    inArray = false;
  let arrayContent = "";
  for (let i = arrayStart; i < text.length; i++) {
    if (text[i] === "[" && !inArray) {
      inArray = true;
      depth = 1;
      continue;
    }
    if (!inArray) continue;
    if (text[i] === "[" || text[i] === "{") depth++;
    if (text[i] === "]" || text[i] === "}") depth--;
    if (depth === 0) break;
    arrayContent += text[i];
  }

  let itemDepth = 0,
    itemStart = -1;
  const blocks: string[] = [];
  for (let i = 0; i < arrayContent.length; i++) {
    if (arrayContent[i] === "{") {
      if (itemDepth === 0) itemStart = i;
      itemDepth++;
    } else if (arrayContent[i] === "}") {
      itemDepth--;
      if (itemDepth === 0 && itemStart >= 0) {
        blocks.push(arrayContent.slice(itemStart, i + 1));
        itemStart = -1;
      }
    }
  }

  for (const block of blocks) {
    const mVar = block.match(/variable:\s*"([^"]+)"/);
    const mName = block.match(/(?<![_a-z])name:\s*"([^"]+)"/);
    if (!mVar || !mName) continue;

    const cfIdx = block.indexOf("canvasfilter:");
    if (cfIdx === -1) continue;
    const cfStart = block.indexOf("{", cfIdx);
    let cfDepth = 0,
      cfEnd = -1;
    for (let i = cfStart; i < block.length; i++) {
      if (block[i] === "{") cfDepth++;
      if (block[i] === "}") {
        cfDepth--;
        if (cfDepth === 0) {
          cfEnd = i;
          break;
        }
      }
    }
    const cfBlock = block.slice(cfStart, cfEnd + 1);

    const filter: ColorFilter = {};
    const mBlend = cfBlock.match(/blend:\s*"([^"]+)"/);
    const mBlendMode = cfBlock.match(/blendMode:\s*"([^"]+)"/);
    const mBrightness = cfBlock.match(/brightness:\s*(-?[\d.]+)/);
    const mContrast = cfBlock.match(/contrast:\s*([\d.]+)/);
    const mDesaturate = cfBlock.match(/desaturate:\s*(true|false)/);

    if (mBlend) filter.blend = mBlend[1];
    if (mBlendMode) filter.blendMode = mBlendMode[1];
    if (mBrightness) filter.brightness = parseFloat(mBrightness[1]!);
    if (mContrast) filter.contrast = parseFloat(mContrast[1]!);
    if (mDesaturate) filter.desaturate = mDesaturate[1] === "true";

    results.push({ variable: mVar[1]!, name: mName[1]!, cnName: "", filter });
  }
  return results;
}

function removeRandomColors(colors: ColorEntry[]): ColorEntry[] {
  return colors.filter(
    (color) =>
      color.variable !== "random" &&
      color.name.toLowerCase() !== "random" &&
      color.cnName !== "随机",
  );
}

function parseSkinOptions(text: string): Record<string, SkinOption> {
  const result: Record<string, SkinOption> = {};
  const start = text.indexOf("skin_options:");
  if (start === -1) return result;

  let depth = 0,
    inObj = false,
    content = "";
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") {
      if (!inObj) inObj = true;
      depth++;
    }
    if (!inObj) continue;
    if (text[i] === "}") {
      depth--;
      if (depth === 0) {
        content = text.slice(text.indexOf("{", start), i + 1);
        break;
      }
    }
  }

  const keyRe = /(\w+):\s*\{([^{}]+)\}/g;
  let m: RegExpExecArray | null;
  while ((m = keyRe.exec(content)) !== null) {
    const body = m[2];
    const mGradient = body!.match(/gradient:\s*\[([^\]]+)\]/);
    const mBlendMode = body!.match(/blendMode:\s*"([^"]+)"/);
    if (mGradient && mBlendMode) {
      result[m[1]!] = {
        gradient: [...mGradient[1]!.matchAll(/"([^"]+)"/g)].map((x) => x[1]!),
        blendMode: mBlendMode[1]!,
      };
    }
  }
  return result;
}

// ── main ─────────────────────────────────────────────────────────────────────

if (!existsSync(COLOURS_JS)) {
  console.error(`colours.js not found: ${COLOURS_JS}`);
  process.exit(1);
}

console.log("gen-colors: loading colours.js...");
const text = readFileSync(COLOURS_JS, "utf8");

console.log("gen-colors: loading i18n...");
const i18n = loadI18n();

const colorCnMap: Record<string, string> = {};
for (const item of i18n.typeB.TypeBOutputText) {
  if (item.fileName !== "colours.js") continue;
  const mEn = item.f?.match(/^name(_cap)?: "([^"]+)"/);
  const mCn = item.t?.match(/^name(_cap)?: "([^"]+)"/);
  if (mEn && mCn) colorCnMap[mEn[2]!.toLowerCase()] = mCn[2]!;
}

let hair = parseColourArray(text, "hair");
let eyes = parseColourArray(text, "eyes");
let clothes = parseColourArray(text, "clothes");
const skin = parseSkinOptions(text);

for (const item of [...hair, ...eyes, ...clothes]) {
  item.cnName =
    colorCnMap[item.name.toLowerCase()] ?? colorCnMap[item.variable.toLowerCase()] ?? "";
}

hair = removeRandomColors(hair);
eyes = removeRandomColors(eyes);
clothes = removeRandomColors(clothes);

console.log(`  hair colors: ${hair.length}`);
console.log(`  eye colors: ${eyes.length}`);
console.log(`  cloth colors: ${clothes.length}`);
console.log(`  skin types: ${Object.keys(skin).length}`);

ensureOutDir();
writeJson("colors", { hair, eyes, clothes, skin });
console.log("gen-colors: done");
