/**
 * gen-i18n.ts
 * 从 DoL 的 i18n JSON + 源文件提取所有名称翻译，输出 src/data/generated/i18n.json
 *
 * 输出结构（所有 section 以中文为 key）:
 * {
 *   clothing:     { "女式衬衫": { en: "Blouse", variable: "blouse", slot: "upper" }, ... },
 *   colors:       { "红色": { en: "red" }, ... },
 *   hairStyles:   { "直发": { en: "Straight", variable: "straight" }, ... },
 *   fringeStyles: { "齐刘海": { en: "Straight Bangs", variable: "straight bangs" }, ... },
 *   demeanor:     { "温柔": { en: "default" }, ... },
 *   bodyShapes:   { "经典": { en: "classic" }, ... },
 *   hairLengths:  { "短": { en: "short" }, ... },
 *   transformTypes: { "天使": { en: "angel" }, ... },
 * }
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { ensureOutDir, writeJson, loadI18n, DOL_PATH } from "./utils";

interface ClothingSlot {
  js: string;
  slot: string;
}

const CLOTHING_FILES: ClothingSlot[] = [
  { js: "clothing-upper", slot: "upper" },
  { js: "clothing-lower", slot: "lower" },
  { js: "clothing-under-upper", slot: "under-upper" },
  { js: "clothing-under-lower", slot: "under-lower" },
  { js: "clothing-head", slot: "head" },
  { js: "clothing-face", slot: "face" },
  { js: "clothing-neck", slot: "neck" },
  { js: "clothing-hands", slot: "hands" },
  { js: "clothing-handheld", slot: "handheld" },
  { js: "clothing-feet", slot: "feet" },
  { js: "clothing-legs", slot: "legs" },
  { js: "clothing-genitals", slot: "genitals" },
  { js: "clothing-over-upper", slot: "over-upper" },
  { js: "clothing-over-lower", slot: "over-lower" },
  { js: "clothing-over-head", slot: "over-head" },
];

function parseClothingNameCapToVariable(jsFilePath: string): Record<string, string> {
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

  const map: Record<string, string> = {};
  for (const block of blocks) {
    const mVar = /variable:\s*"([^"]+)"/.exec(block);
    const mCap = /name_cap:\s*"([^"]+)"/.exec(block);
    if (mVar && mCap) map[mCap[1]!] = mVar[1]!;
  }
  return map;
}

interface HairSections {
  sides: Record<string, string>;
  fringe: Record<string, string>;
}

function parseHairStylesNameCapToVariable(tweePath: string): HairSections {
  if (!existsSync(tweePath)) return { sides: {}, fringe: {} };
  const text = readFileSync(tweePath, "utf8");

  function parseSection(sectionText: string): Record<string, string> {
    const map: Record<string, string> = {};
    for (const m of sectionText.matchAll(
      /\{[^{}]*name_cap:\s*"([^"]+)"[^{}]*variable:\s*"([^"]+)"/gs,
    ))
      map[m[1]!] = m[2]!;
    return map;
  }

  const sidesStart = text.indexOf('<<widget "init_hairsides">>');
  const sidesEnd = text.indexOf("<</widget>>", sidesStart);
  const fringeStart = text.indexOf('<<widget "init_hairfringe">>');
  const fringeEnd = text.indexOf("<</widget>>", fringeStart);

  return {
    sides: sidesStart >= 0 ? parseSection(text.slice(sidesStart, sidesEnd)) : {},
    fringe: fringeStart >= 0 ? parseSection(text.slice(fringeStart, fringeEnd)) : {},
  };
}

// ── main ─────────────────────────────────────────────────────────────────────

console.log("gen-i18n: loading i18n data...");
const i18n = loadI18n();

const clothingCapToCn: Record<string, string> = {};
for (const item of i18n.typeB.TypeBOutputText) {
  const mEn = item.f?.match(/^name_cap:\s*"([^"]+)"/);
  const mCn = item.t?.match(/cn_name_cap:\s*"([^"]+)"/);
  if (mEn && mCn) clothingCapToCn[mEn[1]!] = mCn[1]!;
}

const storyCapToCn: Record<string, string> = {};
for (const item of i18n.typeB.TypeBInputStoryScript) {
  const mEn = item.f?.match(/^name_cap:\s*"([^"]+)"/);
  const mCn = item.t?.match(/^name_cap:\s*"([^"]+)"/);
  if (mEn && mCn) storyCapToCn[mEn[1]!] = mCn[1]!;
}

// ── Clothing ──────────────────────────────────────────────────────────────────

interface ClothingEntry {
  en: string;
  variable: string;
  slot: string;
}
const clothing: Record<string, ClothingEntry> = {};

for (const { js, slot } of CLOTHING_FILES) {
  const jsPath = join(DOL_PATH, "game/base-clothing", `${js}.js`);
  const capToVar = parseClothingNameCapToVariable(jsPath);
  for (const [nameCap, variable] of Object.entries(capToVar)) {
    const cn = clothingCapToCn[nameCap];
    if (!cn) continue;
    if (!clothing[cn]) clothing[cn] = { en: nameCap, variable, slot };
  }
}

// ── Hair styles ───────────────────────────────────────────────────────────────

const tweePath = join(DOL_PATH, "game/04-Variables/hair-styles.twee");
const { sides: sidesCapToVar, fringe: fringeCapToVar } = parseHairStylesNameCapToVariable(tweePath);

interface HairEntry {
  en: string;
  variable: string;
}

const hairStyles: Record<string, HairEntry> = {};
for (const [nameCap, variable] of Object.entries(sidesCapToVar)) {
  const cn = storyCapToCn[nameCap];
  if (cn) hairStyles[cn] = { en: nameCap, variable };
}

const fringeStyles: Record<string, HairEntry> = {};
for (const [nameCap, variable] of Object.entries(fringeCapToVar)) {
  const cn = storyCapToCn[nameCap];
  if (cn) fringeStyles[cn] = { en: nameCap, variable };
}

// ── Colors ────────────────────────────────────────────────────────────────────

const colors: Record<string, { en: string }> = {};
for (const item of i18n.typeB.TypeBOutputText) {
  if (item.fileName !== "colours.js") continue;
  const mEn = item.f?.match(/^name(?:_cap)?:\s*"([^"]+)"/);
  const mCn = item.t?.match(/^name(?:_cap)?:\s*"([^"]+)"/);
  if (mEn && mCn && mEn[1] !== mCn[1]) {
    const en = mEn[1]!.toLowerCase();
    if (!colors[mCn[1]!]) colors[mCn[1]!] = { en };
  }
}

// ── Demeanor ──────────────────────────────────────────────────────────────────

const DEMEANOR_FALLBACK: Record<string, string> = {
  温柔: "default",
  妩媚: "catty",
  高冷: "aloof",
  甜美: "sweet",
  勾人: "foxy",
  忧郁: "gloomy",
};
const demeanor: Record<string, { en: string }> = {};
for (const item of i18n.typeB.TypeBInputStoryScript) {
  if (item.fileName !== "variables-static.twee") continue;
  const mEn = item.f?.match(/^"([A-Za-z]+)":\s*"([a-z]+)",?$/);
  const mCn = item.t?.match(/^"([^"]+)":\s*"([a-z]+)",?$/);
  if (mEn && mCn && mEn[2] === mCn[2]) demeanor[mCn[1]!] = { en: mCn[2]! };
}
const demeanorOut =
  Object.keys(demeanor).length > 0
    ? demeanor
    : Object.fromEntries(Object.entries(DEMEANOR_FALLBACK).map(([cn, en]) => [cn, { en }]));

// ── Body shapes ───────────────────────────────────────────────────────────────

const BODY_FALLBACK: Record<string, string> = {
  经典: "classic",
  瘦长: "slender",
  曲线: "curvy",
  柔软: "soft",
};
const bodyShapes: Record<string, { en: string }> = {};
for (const item of i18n.typeB.TypeBInputStoryScript) {
  if (!item.t?.includes("bodyShapescn")) continue;
  const m = item.t.match(/bodyShapescn to \{([^}]+)\}/);
  if (!m) continue;
  for (const pair of m[1]!.matchAll(/"([^"]+)":\s*"([^"]+)"/g))
    bodyShapes[pair[1]!] = { en: pair[2]! };
  break;
}
const bodyShapesOut =
  Object.keys(bodyShapes).length > 0
    ? bodyShapes
    : Object.fromEntries(Object.entries(BODY_FALLBACK).map(([cn, en]) => [cn, { en }]));

// ── Fixed tables ──────────────────────────────────────────────────────────────

const hairLengths: Record<string, { en: string }> = {
  短: { en: "short" },
  及肩: { en: "shoulder" },
  到胸: { en: "chest" },
  到腹: { en: "navel" },
  到腰: { en: "waist" },
  到大腿: { en: "thighs" },
  到脚: { en: "feet" },
};

const transformTypes: Record<string, { en: string }> = {
  天使: { en: "angel" },
  堕天使: { en: "fallen" },
  恶魔: { en: "demon" },
  猫: { en: "cat" },
  狐: { en: "fox" },
  狼: { en: "wolf" },
  牛: { en: "cow" },
  鸟: { en: "bird" },
};

// ── Output ────────────────────────────────────────────────────────────────────

const output = {
  clothing,
  colors,
  hairStyles,
  fringeStyles,
  demeanor: demeanorOut,
  bodyShapes: bodyShapesOut,
  hairLengths,
  transformTypes,
};

ensureOutDir();
writeJson("i18n", output);
console.log(`  clothing entries: ${Object.keys(clothing).length}`);
console.log(`  color entries: ${Object.keys(colors).length}`);
console.log(`  hairStyles: ${Object.keys(hairStyles).length}`);
console.log(`  fringeStyles: ${Object.keys(fringeStyles).length}`);
console.log("gen-i18n: done");
