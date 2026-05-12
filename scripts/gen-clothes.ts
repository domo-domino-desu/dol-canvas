/**
 * gen-clothes.ts
 * 读取 whitelist.json 中各槽位的中文衣物名，通过 i18n 反查找到 variable（img 目录名），
 * 从 DoL 的 clothing-{slot}.js 中提取属性，输出 src/data/generated/clothes.json
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import {
  ensureOutDir,
  writeJson,
  loadI18n,
  loadWhitelist,
  listPngStems,
  IMG_DIR,
  DOL_PATH,
} from "./utils";

interface SlotDef {
  cn: string;
  slot: string;
  imgDir: string;
  jsFile: string;
}

const SLOTS: SlotDef[] = [
  { cn: "上装", slot: "upper", imgDir: "upper", jsFile: "clothing-upper.js" },
  { cn: "下装", slot: "lower", imgDir: "lower", jsFile: "clothing-lower.js" },
  { cn: "内衣上装", slot: "under-upper", imgDir: "under-upper", jsFile: "clothing-under-upper.js" },
  { cn: "内衣下装", slot: "under-lower", imgDir: "under-lower", jsFile: "clothing-under-lower.js" },
  { cn: "头饰", slot: "head", imgDir: "head", jsFile: "clothing-head.js" },
  { cn: "面饰", slot: "face", imgDir: "face", jsFile: "clothing-face.js" },
  { cn: "颈部", slot: "neck", imgDir: "neck", jsFile: "clothing-neck.js" },
  { cn: "手饰", slot: "hands", imgDir: "hands", jsFile: "clothing-hands.js" },
  { cn: "手持物品", slot: "handheld", imgDir: "handheld", jsFile: "clothing-handheld.js" },
  { cn: "鞋子", slot: "feet", imgDir: "feet", jsFile: "clothing-feet.js" },
  { cn: "腿饰", slot: "legs", imgDir: "legs", jsFile: "clothing-legs.js" },
  { cn: "私部装备", slot: "genitals", imgDir: "genitals", jsFile: "clothing-genitals.js" },
];

interface DolClothingInfo {
  name: string;
  nameCapEn: string;
  colourOptions: string[];
  accColourOptions: string[];
  accessory: number;
}

function parseClothingJs(jsFilePath: string): Record<string, DolClothingInfo> {
  if (!existsSync(jsFilePath)) return {};
  const text = readFileSync(jsFilePath, "utf8");

  let marker = text.indexOf("const clothing = [");
  if (marker === -1) marker = text.search(/setup\.clothes\.\w+\s*=\s*\[/);
  if (marker === -1) return {};

  let depth = 0,
    start = -1,
    end = -1;
  for (let i = marker; i < text.length; i++) {
    if (text[i] === "[") {
      if (!depth) start = i + 1;
      depth++;
    } else if (text[i] === "]") {
      depth--;
      if (!depth) {
        end = i;
        break;
      }
    }
  }
  const arr = text.slice(start, end);

  let d = 0,
    s = -1;
  const blocks: string[] = [];
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === "{") {
      if (!d) s = i;
      d++;
    } else if (arr[i] === "}") {
      d--;
      if (!d && s >= 0) {
        blocks.push(arr.slice(s, i + 1));
        s = -1;
      }
    }
  }

  const variableRe = /variable:\s*"([^"]+)"/;
  const nameRe = /\bname:\s*"([^"]+)"/;
  const nameCapRe = /name_cap:\s*"([^"]+)"/;
  const colourOptsRe = /colour_options:\s*\[([^\]]*)\]/s;
  const accColourOptsRe = /accessory_colour_options:\s*\[([^\]]*)\]/s;
  const accessoryRe = /\baccessory:\s*(\d)/;
  const parseStrArray = (str?: string): string[] =>
    str ? [...str.matchAll(/"([^"]+)"/g)].map((m) => m[1]!) : [];

  const map: Record<string, DolClothingInfo> = {};
  for (const block of blocks) {
    const mVar = variableRe.exec(block);
    if (!mVar) continue;
    map[mVar[1]!] = {
      name: nameRe.exec(block)?.[1] ?? mVar[1]!,
      nameCapEn: nameCapRe.exec(block)?.[1] ?? "",
      colourOptions: parseStrArray(colourOptsRe.exec(block)?.[1]),
      accColourOptions: parseStrArray(accColourOptsRe.exec(block)?.[1]),
      accessory: parseInt(accessoryRe.exec(block)?.[1] ?? "0"),
    };
  }
  return map;
}

interface StateInfo {
  states: string[];
  numeric: string[];
  armVariants: string[];
  allFiles: string[];
}

function getStates(itemDir: string): StateInfo {
  const files = listPngStems(itemDir);
  const states = ["full", "torn", "tattered", "frayed"].filter((s) => files.includes(s));
  const numeric = files.filter((f) => /^\d+$/.test(f)).sort((a, b) => +a - +b);
  const armVariants = files.filter((f) => /^(left|right)-(idle|cover|hold)/.test(f));
  return { states, numeric, armVariants, allFiles: files };
}

// ── main ─────────────────────────────────────────────────────────────────────

console.log("gen-clothes: loading i18n and whitelist...");
const i18n = loadI18n();
const whitelist = loadWhitelist();

const capToCn: Record<string, string> = {};
for (const item of i18n.typeB.TypeBOutputText) {
  const mEn = item.f?.match(/^name_cap: "([^"]+)"/);
  const mCn = item.t?.match(/cn_name_cap: "([^"]+)"/);
  if (mEn && mCn) capToCn[mEn[1]!] = mCn[1]!;
}

function buildCnToVariable(dolData: Record<string, DolClothingInfo>): Record<string, string> {
  const cnToVar: Record<string, string> = {};
  for (const [variable, info] of Object.entries(dolData)) {
    const cn = capToCn[info.nameCapEn];
    if (cn) cnToVar[cn] = variable;
  }
  return cnToVar;
}

interface ClothingItem {
  name: string;
  cnName: string;
  enName: string;
  colorOptions: string[];
  accColorOptions: string[];
  states: string[];
  numeric: string[];
  armVariants: string[];
  hasAcc: boolean;
}

const allClothes: Record<string, ClothingItem[]> = {};

for (const { cn: slotCn, slot, imgDir, jsFile } of SLOTS) {
  const whitelistNames = whitelist[slotCn] ?? [];
  const slotImgDir = join(IMG_DIR, "clothes", imgDir);
  const dolJsPath = join(DOL_PATH, "game/base-clothing", jsFile);

  const dolData = parseClothingJs(dolJsPath);
  const cnToVar = buildCnToVariable(dolData);

  const items: ClothingItem[] = [];
  for (const cnName of whitelistNames) {
    const variable = cnToVar[cnName];
    if (!variable) {
      console.warn(`  [${slotCn}] no variable for cn="${cnName}"`);
      continue;
    }
    const itemDir = join(slotImgDir, variable);
    if (!existsSync(itemDir)) {
      console.warn(`  [${slotCn}] img dir not found: ${variable}`);
      continue;
    }
    const info = dolData[variable];
    const { states, numeric, armVariants, allFiles } = getStates(itemDir);
    items.push({
      name: variable,
      cnName,
      enName: info?.name ?? variable,
      colorOptions: info?.colourOptions ?? [],
      accColorOptions: info?.accColourOptions ?? [],
      states,
      numeric,
      armVariants,
      hasAcc: (info?.accessory ?? 0) > 0 || allFiles.some((f) => f.includes("-acc")),
    });
  }

  allClothes[slot] = items;
  console.log(`  ${slotCn}(${slot}): ${items.length} items`);
}

ensureOutDir();
writeJson("clothes", allClothes);
console.log("gen-clothes: done");
