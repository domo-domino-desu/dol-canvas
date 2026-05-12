/**
 * gen-hair.ts
 * 读取 whitelist.json 中的发型/刘海中文名，通过 i18n 反查找到 variable（img 目录名），
 * 输出 src/data/generated/hair.json
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

const LENGTH_ORDER = ["short", "shoulder", "chest", "navel", "waist", "thighs", "feet"];

const HAIR_LENGTH_LABELS: Record<string, string> = {
  short: "短",
  shoulder: "及肩",
  chest: "到胸",
  navel: "到腹",
  waist: "到腰",
  thighs: "到大腿",
  feet: "到脚",
};

interface HairSections {
  sides: Record<string, string>;
  fringe: Record<string, string>;
}

function parseHairStylesTwee(tweePath: string): HairSections {
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

console.log("gen-hair: loading i18n and whitelist...");
const i18n = loadI18n();
const whitelist = loadWhitelist();

const capToCn: Record<string, string> = {};
for (const item of i18n.typeB.TypeBInputStoryScript) {
  if (!item.f || !item.t) continue;
  const mEn = item.f.match(/^name_cap:\s*"([^"]+)"/);
  const mCn = item.t.match(/^name_cap:\s*"([^"]+)"/);
  if (mEn && mCn) capToCn[mEn[1]!] = mCn[1]!;
}

const tweePath = join(DOL_PATH, "game/04-Variables/hair-styles.twee");
const { sides: sidesCapToVar, fringe: fringeCapToVar } = parseHairStylesTwee(tweePath);

const sidesCnToVar: Record<string, string> = {};
for (const [nameCap, variable] of Object.entries(sidesCapToVar)) {
  const cn = capToCn[nameCap];
  if (cn) sidesCnToVar[cn] = variable;
}

const fringeCnToVar: Record<string, string> = {};
for (const [nameCap, variable] of Object.entries(fringeCapToVar)) {
  const cn = capToCn[nameCap];
  if (cn) fringeCnToVar[cn] = variable;
}

const hairImgDir = join(IMG_DIR, "hair");

interface HairStyleEntry {
  name: string;
  cnName: string;
  backLengths: string[];
  sideFiles: string[];
}

const 发型Names = whitelist["发型"] ?? [];
const hairStyles: HairStyleEntry[] = [];
for (const cnName of 发型Names) {
  const variable = sidesCnToVar[cnName];
  if (!variable) {
    console.warn(`  [发型] no variable for cn="${cnName}"`);
    continue;
  }

  const backDir = join(hairImgDir, "back", variable);
  const sidesDir = join(hairImgDir, "sides", variable);
  if (!existsSync(backDir) && !existsSync(sidesDir)) {
    console.warn(`  [发型] img dir not found: ${variable}`);
    continue;
  }

  const backLengths = listPngStems(backDir)
    .filter((f) => LENGTH_ORDER.includes(f))
    .sort((a, b) => LENGTH_ORDER.indexOf(a) - LENGTH_ORDER.indexOf(b));

  hairStyles.push({ name: variable, cnName, backLengths, sideFiles: listPngStems(sidesDir) });
}

interface FringeStyleEntry {
  name: string;
  cnName: string;
  files: string[];
}

const 刘海Names = whitelist["刘海"] ?? [];
const fringeStyles: FringeStyleEntry[] = [];
for (const cnName of 刘海Names) {
  const variable = fringeCnToVar[cnName];
  if (!variable) {
    console.warn(`  [刘海] no variable for cn="${cnName}"`);
    continue;
  }

  const dir = join(hairImgDir, "fringe", variable);
  if (!existsSync(dir)) {
    console.warn(`  [刘海] img dir not found: ${variable}`);
    continue;
  }

  fringeStyles.push({ name: variable, cnName, files: listPngStems(dir) });
}

console.log(`  发型: ${hairStyles.length} styles`);
console.log(`  刘海: ${fringeStyles.length} styles`);

ensureOutDir();
writeJson("hair", { hairStyles, fringeStyles, hairLengthLabels: HAIR_LENGTH_LABELS });
console.log("gen-hair: done");
