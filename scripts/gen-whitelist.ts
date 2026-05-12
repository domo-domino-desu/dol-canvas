/**
 * gen-whitelist.ts
 * 检查 whitelist.json 中哪些条目无法解析，或用 --reset 重置为全量可用条目。
 *
 * 用法:
 *   bun scripts/gen-whitelist.ts          # 检查模式
 *   bun scripts/gen-whitelist.ts --reset  # 重置模式
 */

import { readFileSync, existsSync, writeFileSync } from "fs";
import { join } from "path";
import { ROOT, IMG_DIR, DOL_PATH, loadI18n, loadWhitelist, type Whitelist } from "./utils";

const RESET = process.argv.includes("--reset");

interface SlotDef {
  cn: string;
  slot: string;
  js: string;
}

const CLOTHING_SLOTS: SlotDef[] = [
  { cn: "上装", slot: "upper", js: "clothing-upper.js" },
  { cn: "下装", slot: "lower", js: "clothing-lower.js" },
  { cn: "内衣上装", slot: "under-upper", js: "clothing-under-upper.js" },
  { cn: "内衣下装", slot: "under-lower", js: "clothing-under-lower.js" },
  { cn: "头饰", slot: "head", js: "clothing-head.js" },
  { cn: "面饰", slot: "face", js: "clothing-face.js" },
  { cn: "颈部", slot: "neck", js: "clothing-neck.js" },
  { cn: "手饰", slot: "hands", js: "clothing-hands.js" },
  { cn: "手持物品", slot: "handheld", js: "clothing-handheld.js" },
  { cn: "鞋子", slot: "feet", js: "clothing-feet.js" },
  { cn: "腿饰", slot: "legs", js: "clothing-legs.js" },
  { cn: "私部装备", slot: "genitals", js: "clothing-genitals.js" },
];

function parseClothingJs(jsFilePath: string): Record<string, string> {
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

// ── Build lookup maps ──────────────────────────────────────────────────────────

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

const tweePath = join(DOL_PATH, "game/04-Variables/hair-styles.twee");
const { sides: sidesCapToVar, fringe: fringeCapToVar } = parseHairStylesTwee(tweePath);

const sidesCnToVar: Record<string, string> = {};
for (const [cap, variable] of Object.entries(sidesCapToVar)) {
  const cn = storyCapToCn[cap];
  if (cn) sidesCnToVar[cn] = variable;
}
const fringeCnToVar: Record<string, string> = {};
for (const [cap, variable] of Object.entries(fringeCapToVar)) {
  const cn = storyCapToCn[cap];
  if (cn) fringeCnToVar[cn] = variable;
}

// ── Check mode ─────────────────────────────────────────────────────────────────

function checkWhitelist(): void {
  const whitelist = loadWhitelist();
  let totalInvalid = 0;

  for (const { cn, slot, js } of CLOTHING_SLOTS) {
    const names = whitelist[cn] ?? [];
    if (!names.length) continue;

    const capToVar = parseClothingJs(join(DOL_PATH, "game/base-clothing", js));
    // Prefer variables whose img exists in canvas; don't overwrite a valid mapping
    const cnToVar: Record<string, string> = {};
    for (const [cap, variable] of Object.entries(capToVar)) {
      const cnName = clothingCapToCn[cap];
      if (!cnName) continue;
      const exists = existsSync(join(IMG_DIR, "clothes", slot, variable));
      if (!(cnName in cnToVar) || exists) cnToVar[cnName] = variable;
    }

    const invalid: string[] = [];
    for (const cnName of names) {
      const variable = cnToVar[cnName];
      if (!variable) {
        invalid.push(`  ✗ "${cnName}" — 无i18n映射`);
        continue;
      }
      if (!existsSync(join(IMG_DIR, "clothes", slot, variable)))
        invalid.push(`  ✗ "${cnName}" (${variable}) — img目录不存在`);
    }
    if (invalid.length) {
      console.log(`[${cn}] ${invalid.length} 项无效:`);
      invalid.forEach((l) => console.log(l));
      totalInvalid += invalid.length;
    }
  }

  const hairSections: Array<[string, Record<string, string>, string[]]> = [
    ["发型", sidesCnToVar, ["back", "sides"]],
    ["刘海", fringeCnToVar, ["fringe"]],
  ];
  for (const [sectionCn, cnToVar, imgSubDirs] of hairSections) {
    const names = loadWhitelist()[sectionCn] ?? [];
    const invalid: string[] = [];
    for (const cnName of names) {
      const variable = cnToVar[cnName];
      if (!variable) {
        invalid.push(`  ✗ "${cnName}" — 无i18n映射`);
        continue;
      }
      if (!imgSubDirs.some((sub) => existsSync(join(IMG_DIR, "hair", sub, variable))))
        invalid.push(`  ✗ "${cnName}" (${variable}) — img目录不存在`);
    }
    if (invalid.length) {
      console.log(`[${sectionCn}] ${invalid.length} 项无效:`);
      invalid.forEach((l) => console.log(l));
      totalInvalid += invalid.length;
    }
  }

  if (totalInvalid === 0) {
    console.log("✓ whitelist 所有条目均有效");
  } else {
    console.log(`\n共 ${totalInvalid} 项无效（这些条目在生成时会被跳过）`);
  }
}

// ── Reset mode ─────────────────────────────────────────────────────────────────

function resetWhitelist(): void {
  const result: Whitelist = {};

  for (const { cn, slot, js } of CLOTHING_SLOTS) {
    const capToVar = parseClothingJs(join(DOL_PATH, "game/base-clothing", js));
    const names: string[] = [];
    for (const [nameCap, variable] of Object.entries(capToVar)) {
      const cnName = clothingCapToCn[nameCap];
      if (!cnName) continue;
      // Check source exists in DoL (catches items defined in JS but missing art)
      if (!existsSync(join(DOL_PATH, "img/clothes", slot, variable))) continue;
      if (!names.includes(cnName)) names.push(cnName);
    }
    result[cn] = names;
    console.log(`  ${cn}: ${names.length} 项`);
  }

  const hairNames: string[] = [];
  for (const [cap, variable] of Object.entries(sidesCapToVar)) {
    const cn = storyCapToCn[cap];
    if (!cn) continue;
    if (
      !existsSync(join(DOL_PATH, "img/hair/back", variable)) &&
      !existsSync(join(DOL_PATH, "img/hair/sides", variable))
    )
      continue;
    if (!hairNames.includes(cn)) hairNames.push(cn);
  }
  result["发型"] = hairNames;
  console.log(`  发型: ${hairNames.length} 项`);

  const fringeNames: string[] = [];
  for (const [cap, variable] of Object.entries(fringeCapToVar)) {
    const cn = storyCapToCn[cap];
    if (!cn) continue;
    if (!existsSync(join(DOL_PATH, "img/hair/fringe", variable))) continue;
    if (!fringeNames.includes(cn)) fringeNames.push(cn);
  }
  result["刘海"] = fringeNames;
  console.log(`  刘海: ${fringeNames.length} 项`);

  result["转化"] = ["天使", "鸟", "猫", "牛", "恶魔", "堕天使", "狐", "狼"];
  result["仪态"] = ["温柔", "高冷", "妩媚", "甜美", "勾人", "忧郁"];

  writeFileSync(join(ROOT, "whitelist.json"), JSON.stringify(result, null, 2), "utf8");
  console.log("\nwrote whitelist.json");
}

// ── Entry ──────────────────────────────────────────────────────────────────────

if (RESET) {
  console.log("gen-whitelist: reset mode — rebuilding from all available items...");
  resetWhitelist();
} else {
  console.log("gen-whitelist: check mode — validating whitelist.json...");
  checkWhitelist();
}
