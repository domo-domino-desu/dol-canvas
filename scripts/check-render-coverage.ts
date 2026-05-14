import { existsSync, readdirSync, statSync } from "node:fs";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";
import { buildLayers } from "@/character/builder";
import ignoreRuleConfig from "./render-coverage-ignore-rules.json";
import type { CharacterPayload, ClothingWorn, HairColorStyle } from "@/types";
import type { PayloadListItem, ResolvedPayloadOption } from "@/data/options";
import { resolvePayloadOptions } from "@/data/options";
import { clothesData, hairData } from "@/data/generated";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const IMG_ROOT = "img";
const BASE_URL = `${IMG_ROOT}/`;
const MAX_TABLE_ROWS = Number(
  Bun.argv.find((arg) => arg.startsWith("--max="))?.split("=")[1] ?? 400,
);
const JSON_OUTPUT = Bun.argv.includes("--json");
const STRICT_IGNORED = Bun.argv.includes("--strict-ignored");

type Source = {
  src: string;
  caseName: string;
  layerId: string;
};

type LogicIssue = {
  caseName: string;
  issue: string;
};

type IgnoreRule = {
  name: string;
  test: (path: string) => boolean;
};

type ConfigIgnoreRule = {
  name: string;
  paths?: string[];
  prefixes?: string[];
  regexes?: string[];
};

const slotCn = {
  upper: "上装",
  lower: "下装",
  "under-upper": "内衣上装",
  "under-lower": "内衣下装",
  head: "头饰",
  face: "面饰",
  neck: "颈部",
  hands: "手饰",
  handheld: "手持物品",
  feet: "鞋子",
  legs: "腿饰",
  genitals: "私部装备",
} as const;

type SlotKey = keyof typeof slotCn;

type ClothingItem = {
  name: string;
  cnName: string;
  colorOptions: string[];
  accColorOptions: string[];
  patternOptions?: string[];
  states: string[];
  numeric: string[];
  armVariants: string[];
  hasAcc: boolean;
  accessory?: number;
  accessoryIntegrityImg?: boolean;
  mainImage?: number;
  accImage?: number;
  sleeveImg?: boolean;
  sleeveAccImg?: boolean;
  sleeveColour?: string | number;
  breastAccImg?: number | Record<string, number | null>;
  breastImg?: number | Record<string, number | null>;
  backImg?: number | string;
  backImgAcc?: number | string;
  backIntegrityImg?: boolean;
  maskImg?: number;
  branchHints?: Record<string, boolean>;
  penisImg?: number;
  penisAccImg?: number;
};

type BranchHint = keyof NonNullable<ClothingItem["branchHints"]>;

type ClothingCapabilities = {
  states: string[];
  breastSizes: number[];
  patterns: Array<string | undefined>;
  leftArms: Array<NonNullable<CharacterPayload["左臂"]>>;
  rightArms: Array<NonNullable<CharacterPayload["右臂"]>>;
};

type BranchContext = {
  slot: SlotKey;
  cn: (typeof slotCn)[SlotKey];
  item: ClothingItem;
  states: string[];
  breastSizes: number[];
  baseWorn: ClothingWorn;
};

type BranchHandler = {
  hint?: BranchHint;
  applies?: (context: BranchContext) => boolean;
  add: (sources: Source[], context: BranchContext) => void;
};

const generatedHairStyles = new Set(
  (hairData as typeof hairData).hairStyles.map((style) => style.name),
);
const generatedFringeStyles = new Set(
  (hairData as typeof hairData).fringeStyles.map((style) => style.name),
);
const generatedClothingDirs = new Set(
  Object.entries(clothesData as Record<string, ClothingItem[]>).flatMap(([slot, items]) =>
    items.map((item) => `img/clothes/${slot}/${item.name}`),
  ),
);
const generatedClothingByDir = new Map(
  Object.entries(clothesData as Record<string, ClothingItem[]>).flatMap(([slot, items]) =>
    items.map((item) => [`img/clothes/${slot}/${item.name}`, { slot, item }] as const),
  ),
);

function configuredIgnoreRules(config: ConfigIgnoreRule[]): IgnoreRule[] {
  return config.map((rule) => {
    const paths = new Set(rule.paths ?? []);
    const prefixes = rule.prefixes ?? [];
    const regexes = (rule.regexes ?? []).map((pattern) => new RegExp(pattern));
    return {
      name: rule.name,
      test: (path) =>
        paths.has(path) ||
        prefixes.some((prefix) => path.startsWith(prefix)) ||
        regexes.some((regex) => regex.test(path)),
    };
  });
}

function unusedHairAssetOutsideGeneratedOptions(path: string): boolean {
  const parts = path.split("/");
  if (parts[0] !== "img" || parts[1] !== "hair") return false;
  const section = parts[2];
  const style = parts[3];
  if (!section || !style) return false;
  if (section === "hair" || section === "phair") return true;
  if (section === "back" || section === "sides") return !generatedHairStyles.has(style);
  if (section === "fringe") return !generatedFringeStyles.has(style);
  return false;
}

function unusedClothingAssetOutsideGeneratedOptions(path: string): boolean {
  const parts = path.split("/");
  if (parts[0] !== "img" || parts[1] !== "clothes") return false;
  const slot = parts[2];
  const item = parts[3];
  if (!slot || !item) return false;
  return !generatedClothingDirs.has(`img/clothes/${slot}/${item}`);
}

function clothingEntryForPath(
  path: string,
): { slot: string; item: ClothingItem; stem: string } | undefined {
  const parts = path.split("/");
  if (parts[0] !== "img" || parts[1] !== "clothes") return undefined;
  const slot = parts[2];
  const itemName = parts[3];
  const file = parts[4];
  if (!slot || !itemName || !file?.endsWith(".png")) return undefined;
  const entry = generatedClothingByDir.get(`img/clothes/${slot}/${itemName}`);
  return entry ? { ...entry, stem: file.slice(0, -4) } : undefined;
}

function mappedBreastNumbers(setting: ClothingItem["breastImg"]): Set<string> {
  if (!setting) return new Set();
  if (typeof setting === "number")
    return setting === 1 ? new Set(["0", "1", "2", "3", "4", "5", "6"]) : new Set();
  return new Set(
    Object.values(setting)
      .filter((value): value is number => value !== null && value !== undefined)
      .map(String),
  );
}

function unusedClothingAssetDisabledByOriginalSetup(path: string): boolean {
  const entry = clothingEntryForPath(path);
  if (!entry) return false;
  const { slot, item, stem } = entry;

  if (["full", "frayed", "tattered", "torn"].includes(stem) && item.mainImage === 0) return true;
  if (stem === "acc" && (item.accessory !== 1 || item.accImage === 0 || item.accessoryIntegrityImg))
    return true;

  if (/^(left|right)-(idle|cover|hold)(?:-.+)?-acc$/.test(stem)) {
    if (slot === "handheld") {
      if (item.accessory !== 1 || item.accImage === 0) return true;
      const armAccPattern = /^(left|right)-(idle|cover|hold)-(.+)-acc$/.exec(stem);
      if (armAccPattern) {
        const pattern = armAccPattern[3]!.replace(/-/g, " ");
        return !(item.patternOptions ?? []).includes(pattern);
      }
      return false;
    }
    return !item.sleeveImg || !item.sleeveAccImg;
  }
  if (/^(left|right)-(idle|cover|hold)$/.test(stem) && (slot === "upper" || slot === "under-upper"))
    return !item.sleeveImg;
  if (/^(left|right)-(idle|cover|hold)-.+$/.test(stem) && !stem.endsWith("-acc")) {
    if (slot === "upper" || slot === "under-upper") return item.sleeveColour !== "pattern";
    if (slot === "handheld") return true;
  }
  if (/^(left|right)-.+$/.test(stem)) return true;
  if (/^mask(?:-.+)?$/.test(stem) && item.maskImg !== 1) return true;
  if (/^back(?:-.+)?(?:-acc)?$/.test(stem)) {
    if (stem.endsWith("-acc")) return item.backImgAcc !== 1;
    if (stem === "back" && item.backIntegrityImg) return true;
    return item.backImg !== 1;
  }
  if (/^(?:acc-)?penis$/.test(stem)) {
    return stem.startsWith("acc-") ? item.penisAccImg !== 1 : item.penisImg !== 1;
  }
  if (/(?:^|-)alt$/.test(stem) && !item.branchHints?.替代) return true;
  if (/^acc-.+/.test(stem) && !/^acc-(full|frayed|tattered|torn)/.test(stem)) {
    const pattern = stem.slice("acc-".length).replace(/-/g, " ");
    return !(item.patternOptions ?? []).includes(pattern);
  }

  const numeric = /^(\d+)(?:-alt)?(?:-acc)?$/.exec(stem);
  if (numeric) {
    const mapped = stem.endsWith("-acc")
      ? mappedBreastNumbers(item.breastAccImg)
      : mappedBreastNumbers(item.breastImg);
    return !mapped.has(numeric[1]!);
  }

  return false;
}

const dynamicIgnoredUnusedRules: IgnoreRule[] = [
  {
    name: "hair: image directories not registered as selectable original hair options",
    test: unusedHairAssetOutsideGeneratedOptions,
  },
  {
    name: "clothes: image directories not registered as selectable original clothing options",
    test: unusedClothingAssetOutsideGeneratedOptions,
  },
  {
    name: "clothes: files present but disabled or unmapped by original clothing setup",
    test: unusedClothingAssetDisabledByOriginalSetup,
  },
];

const ignoredUnusedRules: IgnoreRule[] = [
  ...configuredIgnoreRules(ignoreRuleConfig as ConfigIgnoreRule[]),
  ...dynamicIgnoredUnusedRules,
];

function listPngs(dir: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = `${dir}/${entry}`;
    if (statSync(full).isDirectory()) {
      result.push(...listPngs(full));
    } else if (entry.endsWith(".png")) {
      result.push(relative(ROOT, full).replace(/\\/g, "/"));
    }
  }
  return result;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function optionFor(key: string, payload: CharacterPayload = {}): ResolvedPayloadOption | undefined {
  return resolvePayloadOptions(payload).find((option) => option.key === key);
}

function listOptions(key: string, payload: CharacterPayload = {}): PayloadListItem[] {
  const option = optionFor(key, payload);
  return option?.type === "list" ? option.options : [];
}

function listValues(key: string, payload: CharacterPayload = {}): string[] {
  return listOptions(key, payload).map((option) => option.value);
}

function numberValues(key: string, payload: CharacterPayload = {}): number[] {
  const option = optionFor(key, payload);
  if (option?.type !== "number") return [];
  const result: number[] = [];
  for (let value = option.min; value <= option.max; value += option.step ?? 1) {
    result.push(value);
  }
  return result;
}

function clothingPayload(
  slotCnName: (typeof slotCn)[SlotKey],
  item: ClothingItem,
): CharacterPayload {
  return {
    衣物: {
      [slotCnName]: { 名称: item.cnName },
    },
  } as CharacterPayload;
}

function optionMetaKey(option: PayloadListItem): string | undefined {
  const key = option.meta?.key;
  return typeof key === "string" ? key : undefined;
}

function optionMetaEn(option: PayloadListItem): string | undefined {
  const en = option.meta?.en;
  return typeof en === "string" ? en : undefined;
}

function addCase(sources: Source[], caseName: string, payload: CharacterPayload): Source[] {
  const added: Source[] = [];
  for (const layer of buildLayers(payload, BASE_URL)) {
    for (const src of [layer.src, ...(layer.maskSrcs ?? [])]) {
      const source = {
        src: src.replace(/^\.\//, ""),
        caseName,
        layerId: layer.id,
      };
      sources.push(source);
      added.push(source);
    }
  }
  return added;
}

function colorPayload(
  slotCnName: (typeof slotCn)[SlotKey],
  item: ClothingItem,
): Pick<ClothingWorn, "主色调" | "第二色调"> {
  const payload = clothingPayload(slotCnName, item);
  const primary = listValues(`衣物.${slotCnName}.主色调`, payload);
  const secondary = listValues(`衣物.${slotCnName}.第二色调`, payload);
  return {
    ...(primary.length
      ? { 主色调: primary.find((value) => value === "白色" || value === "white") ?? primary[0] }
      : {}),
    ...(secondary.length
      ? {
          第二色调:
            secondary.find((value) => value === "黑色" || value === "black") ?? secondary[0],
        }
      : {}),
  };
}

function clothingCapabilities(
  cn: (typeof slotCn)[SlotKey],
  item: ClothingItem,
): ClothingCapabilities {
  const payload = clothingPayload(cn, item);
  const states = listValues(`衣物.${cn}.状态`, payload);
  const breastSizes = numberValues(`衣物.${cn}.胸部层级`, payload);
  const patterns = listValues(`衣物.${cn}.图案`, payload);
  return {
    states: states.length ? states : ["full"],
    breastSizes: breastSizes.length ? breastSizes : [3],
    patterns: unique([undefined, ...patterns]),
    leftArms: listValues("左臂") as Array<NonNullable<CharacterPayload["左臂"]>>,
    rightArms: listValues("右臂") as Array<NonNullable<CharacterPayload["右臂"]>>,
  };
}

function clothingWorn(
  cn: (typeof slotCn)[SlotKey],
  item: ClothingItem,
  state: string,
  pattern?: string,
): ClothingWorn & Record<string, string | undefined> {
  const worn: ClothingWorn & Record<string, string | undefined> = {
    名称: item.cnName,
    状态: state as ClothingWorn["状态"],
    ...colorPayload(cn, item),
  };
  if (pattern) {
    worn.图案 = pattern;
    worn.花纹 = pattern;
  }
  return worn;
}

function baseClothingWorn(
  cn: (typeof slotCn)[SlotKey],
  item: ClothingItem,
  states: string[],
): ClothingWorn {
  const payload = clothingPayload(cn, item);
  return clothingWorn(cn, item, states[0] ?? "full", listValues(`衣物.${cn}.图案`, payload)[0]);
}

function addStandardClothingCases(
  sources: Source[],
  slot: SlotKey,
  cn: (typeof slotCn)[SlotKey],
  item: ClothingItem,
  capabilities: ClothingCapabilities,
): void {
  const baseState = capabilities.states[0] ?? "full";
  const baseBreast = capabilities.breastSizes.includes(3) ? 3 : (capabilities.breastSizes[0] ?? 3);
  const baseLeft = capabilities.leftArms[0] ?? "idle";
  const baseRight = capabilities.rightArms[0] ?? "idle";
  const addClothingCase = (
    suffix: string,
    state = baseState,
    胸部 = baseBreast,
    pattern: string | undefined = undefined,
    左臂 = baseLeft,
    右臂 = baseRight,
    patch: Partial<ClothingWorn> = {},
  ) => {
    const worn = { ...clothingWorn(cn, item, state, pattern), ...patch };
    addCase(sources, `clothes/${slot}/${item.name}/${suffix}`, {
      胸部,
      左臂,
      右臂,
      衣物: { [cn]: worn },
    } as CharacterPayload);
  };

  addClothingCase(`base/${baseState}/b${baseBreast}/${baseLeft}/${baseRight}`);
  for (const state of capabilities.states) {
    addClothingCase(`state/${state}`, state);
  }
  for (const 胸部 of capabilities.breastSizes) {
    addClothingCase(`breast/${胸部}`, baseState, 胸部);
  }
  for (const pattern of capabilities.patterns.filter((value): value is string => !!value)) {
    addClothingCase(`pattern/${pattern}`, baseState, baseBreast, pattern);
    for (const 胸部 of capabilities.breastSizes) {
      addClothingCase(`pattern-breast/${pattern}/b${胸部}`, baseState, 胸部, pattern);
    }
    for (const 左臂 of capabilities.leftArms) {
      addClothingCase(`pattern-left-arm/${pattern}/${左臂}`, baseState, baseBreast, pattern, 左臂);
    }
    for (const 右臂 of capabilities.rightArms) {
      addClothingCase(
        `pattern-right-arm/${pattern}/${右臂}`,
        baseState,
        baseBreast,
        pattern,
        baseLeft,
        右臂,
      );
    }
  }
  for (const 左臂 of capabilities.leftArms) {
    addClothingCase(`left-arm/${左臂}`, baseState, baseBreast, undefined, 左臂);
  }
  for (const 右臂 of capabilities.rightArms) {
    addClothingCase(`right-arm/${右臂}`, baseState, baseBreast, undefined, baseLeft, 右臂);
  }
  for (const 主色调 of listValues(`衣物.${cn}.主色调`, clothingPayload(cn, item))) {
    addClothingCase(
      `primary-color/${主色调}`,
      baseState,
      baseBreast,
      undefined,
      baseLeft,
      baseRight,
      {
        主色调,
      },
    );
  }
  for (const 第二色调 of listValues(`衣物.${cn}.第二色调`, clothingPayload(cn, item))) {
    addClothingCase(
      `secondary-color/${第二色调}`,
      baseState,
      baseBreast,
      undefined,
      baseLeft,
      baseRight,
      { 第二色调 },
    );
  }

  for (const state of capabilities.states) {
    const worn = clothingWorn(cn, item, state);
    if (slot === "lower" && (item.name.includes("pinafore") || item.cnName.includes("连衣裙"))) {
      addCase(sources, `clothes/${slot}/${item.name}/schoolblouse/${state}`, {
        胸部: baseBreast,
        左臂: baseLeft,
        右臂: baseRight,
        衣物: { 上装: { 名称: "学校衬衫" }, [cn]: worn },
      } as CharacterPayload);
    }
  }
}

const branchHandlers: BranchHandler[] = [
  {
    hint: "替代",
    add: (sources, { slot, cn, item, states, breastSizes, baseWorn }) => {
      const baseBreast = breastSizes.includes(3) ? 3 : breastSizes[0];
      for (const state of states) {
        addCase(sources, `clothes/${slot}/${item.name}/branch/alt/state/${state}`, {
          胸部: baseBreast,
          左臂: "idle",
          右臂: "hold",
          衣物: { [cn]: { ...baseWorn, 状态: state as ClothingWorn["状态"], 替代: true } },
        } as CharacterPayload);
      }
      for (const 胸部 of breastSizes) {
        addCase(sources, `clothes/${slot}/${item.name}/branch/alt/breast/${胸部}`, {
          胸部,
          左臂: "idle",
          右臂: "hold",
          衣物: { [cn]: { ...baseWorn, 状态: states[0] as ClothingWorn["状态"], 替代: true } },
        } as CharacterPayload);
      }
    },
  },
  {
    hint: "兜帽",
    add: (sources, { slot, cn, item, states, baseWorn }) => {
      for (const state of states) {
        addCase(sources, `clothes/${slot}/${item.name}/branch/hood-down/${state}`, {
          胸部: 4,
          衣物: { [cn]: { ...baseWorn, 状态: state as ClothingWorn["状态"], 兜帽: "放下" } },
        } as CharacterPayload);
      }
    },
  },
  {
    hint: "卷袖",
    add: (sources, { slot, cn, item, baseWorn }) => {
      addCase(sources, `clothes/${slot}/${item.name}/branch/rolled`, {
        胸部: 4,
        左臂: "cover",
        右臂: "hold",
        衣物: { [cn]: { ...baseWorn, 卷袖: true } },
      } as CharacterPayload);
    },
  },
  {
    hint: "阴茎凸起自动",
    add: (sources, { slot, cn, item, baseWorn }) => {
      addCase(sources, `clothes/${slot}/${item.name}/branch/penis`, {
        阴茎: true,
        阴茎大小: 6,
        衣物: { [cn]: baseWorn },
      } as CharacterPayload);
    },
  },
  {
    hint: "领口变体自动",
    applies: ({ slot }) => slot === "neck",
    add: (sources, { slot, cn, item, baseWorn }) => {
      addCase(sources, `clothes/${slot}/${item.name}/branch/collar`, {
        衣物: { 上装: { 名称: "领扣衬衫" }, [cn]: baseWorn },
      } as CharacterPayload);
      addCase(sources, `clothes/${slot}/${item.name}/branch/collar-alt`, {
        衣物: { 上装: { 名称: "领扣衬衫" }, [cn]: { ...baseWorn, 替代: true } },
      } as CharacterPayload);
      addCase(sources, `clothes/${slot}/${item.name}/branch/serafuku`, {
        衣物: { 上装: { 名称: "经典水手服" }, [cn]: baseWorn },
      } as CharacterPayload);
    },
  },
  {
    hint: "遮罩",
    applies: ({ slot }) => slot === "head",
    add: (sources, { slot, cn, item, baseWorn }) => {
      addCase(sources, `clothes/${slot}/${item.name}/branch/head-mask-ponytail`, {
        发型: { 发型: "thick ponytail" },
        衣物: { [cn]: baseWorn },
      } as CharacterPayload);
    },
  },
  {
    hint: "遮罩",
    applies: ({ slot }) => slot === "handheld",
    add: (sources, { slot, cn, item, baseWorn }) => {
      addCase(sources, `clothes/${slot}/${item.name}/branch/handheld-mask`, {
        发型: { 发型: "default" },
        衣物: { [cn]: baseWorn },
      } as CharacterPayload);
    },
  },
  {
    hint: "遮罩",
    applies: ({ slot }) => slot === "feet",
    add: (sources, { slot, cn, item, baseWorn }) => {
      addCase(sources, `clothes/${slot}/${item.name}/branch/feet-mask-lower`, {
        衣物: {
          下装: { 名称: "牛仔短裤" },
          腿饰: { 名称: "裸" },
          [cn]: baseWorn,
        },
      } as CharacterPayload);
    },
  },
  {
    applies: ({ item }) => Boolean(item.branchHints?.孕肚适配 || item.branchHints?.遮罩),
    add: (sources, { slot, cn, item, baseWorn }) => {
      for (const 孕肚 of [8, 15, 19, 22, 24]) {
        addCase(sources, `clothes/${slot}/${item.name}/branch/belly/${孕肚}`, {
          孕肚,
          胸部: 4,
          衣物: { [cn]: baseWorn },
        } as CharacterPayload);
      }
    },
  },
];

function handleBranchHints(sources: Source[], context: BranchContext): void {
  for (const handler of branchHandlers) {
    if (handler.hint) {
      const payload = clothingPayload(context.cn, context.item);
      const publicBranchOption =
        handler.hint === "替代" || handler.hint === "兜帽" || handler.hint === "卷袖"
          ? optionFor(`衣物.${context.cn}.${handler.hint}`, payload)
          : undefined;
      if (handler.hint === "替代" || handler.hint === "兜帽" || handler.hint === "卷袖") {
        if (!publicBranchOption) continue;
      } else if (!context.item.branchHints?.[handler.hint]) {
        continue;
      }
    }
    if (handler.applies && !handler.applies(context)) continue;
    handler.add(sources, context);
  }
}

function addBodyCases(sources: Source[]): void {
  const shapes = listValues("身形") as Array<NonNullable<CharacterPayload["身形"]>>;
  const leftArms = listValues("左臂") as Array<NonNullable<CharacterPayload["左臂"]>>;
  const rightArms = listValues("右臂") as Array<NonNullable<CharacterPayload["右臂"]>>;
  const breastSizes = numberValues("胸部");
  const bellySizes = numberValues("孕肚").filter((value) => value > 0);
  const penisPayload: CharacterPayload = { 阴茎: true };
  const penisStates = listValues("阴茎状态", penisPayload) as Array<
    NonNullable<CharacterPayload["阴茎状态"]>
  >;
  const penisSizes = numberValues("阴茎大小", penisPayload);
  const condomColor = listValues("避孕套.颜色", penisPayload).find((value) => value === "红色");
  const baseShape = shapes[0];

  for (const 身形 of shapes) {
    for (const 左臂 of leftArms) {
      for (const 右臂 of rightArms) {
        addCase(sources, `body/${身形}/${左臂}/${右臂}`, { 身形, 左臂, 右臂, 胸部: 3 });
      }
    }
  }
  for (const 胸部 of breastSizes) {
    addCase(sources, `body/breasts/${胸部}`, { 身形: baseShape, 胸部 });
  }
  for (const 孕肚 of bellySizes) {
    addCase(sources, `body/pregnant-belly/${孕肚}`, { 孕肚 });
  }
  for (const 阴茎状态 of penisStates) {
    for (const 阴茎大小 of penisSizes) {
      addCase(sources, `body/penis/${阴茎状态}/${阴茎大小}/balls`, {
        阴茎: true,
        阴茎状态,
        阴茎大小,
        睾丸: true,
      });
      addCase(sources, `body/penis/${阴茎状态}/${阴茎大小}/no-balls`, {
        阴茎: true,
        阴茎状态,
        阴茎大小,
        睾丸: false,
      });
      addCase(sources, `body/condom/${阴茎状态}/${阴茎大小}`, {
        阴茎: true,
        阴茎状态,
        阴茎大小,
        避孕套: { 类型: "plain", 颜色: condomColor },
      });
    }
  }
  for (const i of numberValues("精液.胸部")) {
    addCase(sources, `body/cum/${i}`, {
      精液: {
        胸部: i,
        脸: i,
        脚: i,
        左臂: i,
        右臂: i,
        颈部: i,
        大腿: i,
        腹部: i,
        阴道滴落: i,
        肛门滴落: i,
        口部滴落: i,
      },
    });
  }
}

function addFaceCases(sources: Source[]): void {
  const demeanors = listValues("仪态");
  const brows = listValues("眉毛") as Array<NonNullable<CharacterPayload["眉毛"]>>;
  for (const 仪态 of demeanors) {
    addCase(sources, `face/demeanor/${仪态}`, { 仪态 });
    for (const 眉毛 of brows) {
      addCase(sources, `face/${仪态}/brow/${眉毛}`, { 仪态, 眉毛 });
    }
    addCase(sources, `face/${仪态}/eyes/empty`, { 仪态, 眼睛: { 无神: true } });
    addCase(sources, `face/${仪态}/eyes/empty-half-closed`, {
      仪态,
      眼睛: { 无神: true, 半睁眼: true },
    });
    addCase(sources, `face/${仪态}/eyes/half-closed`, { 仪态, 眼睛: { 半睁眼: true } });
    addCase(sources, `face/${仪态}/eyes/bloodshot`, { 仪态, 眼睛: { 血丝眼: true } });
  }
  for (const 嘴部 of listValues("嘴部") as Array<NonNullable<CharacterPayload["嘴部"]>>) {
    addCase(sources, `face/mouth/${嘴部}`, { 嘴部 });
  }
  for (const 脸红 of numberValues("脸红").filter((value) => value > 0)) {
    addCase(sources, `face/blush/${脸红}`, { 脸红 });
  }
  for (const 泪水 of numberValues("泪水").filter((value) => value > 0)) {
    addCase(sources, `face/tears/${泪水}`, { 泪水 });
  }
}

function addHairCases(sources: Source[], logicIssues: LogicIssue[]): void {
  const lengths = listOptions("发型.长度");

  for (const style of listOptions("发型.发型")) {
    for (const length of lengths) {
      const len = optionMetaEn(length) ?? length.value;
      const caseName = `hair/style/${optionMetaKey(style) ?? style.value}/${len}`;
      const added = addCase(sources, caseName, {
        发型: { 发型: style.value, 长度: length.value as NonNullable<CharacterPayload["发长"]> },
      });
      if (
        !added.some((source) => source.layerId === "hair-back" || source.layerId === "hair-sides")
      ) {
        logicIssues.push({
          caseName,
          issue: "hair style payload produced no hair back/sides layer",
        });
      }
    }
  }
  for (const fringe of listOptions("发型.刘海")) {
    for (const length of lengths) {
      const len = optionMetaEn(length) ?? length.value;
      const caseName = `hair/fringe/${optionMetaKey(fringe) ?? fringe.value}/${len}`;
      const added = addCase(sources, caseName, {
        发型: { 刘海: fringe.value, 长度: length.value as NonNullable<CharacterPayload["发长"]> },
        刘海: fringe.value,
      });
      if (!added.some((source) => source.layerId === "hair-fringe")) {
        logicIssues.push({ caseName, issue: "fringe payload produced no hair-fringe layer" });
      }
    }
  }

  const styles = listValues("发色详情.头发.分色模式") as HairColorStyle[];
  const hairColors = listValues("发色");
  const primary = hairColors.find((value) => value === "棕色") ?? hairColors[0];
  const red = hairColors.find((value) => value === "红色") ?? hairColors[0];
  const black = hairColors.find((value) => value === "黑色") ?? hairColors[0];
  const blond = hairColors.find((value) => value === "浅金色") ?? hairColors[0];
  const blue = hairColors.find((value) => value === "蓝色") ?? hairColors[0];
  for (const 分色模式 of styles) {
    addCase(sources, `hair/color/overall/${分色模式}`, {
      发色: primary,
      发色模式: "整体",
      发色详情: {
        头发: { 分色模式, 发色: red, 第二发色: black },
      },
      发型: { 发型: "自然状态", 刘海: "自然状态", 长度: "到胸" },
    });
  }
  for (const [index, 分色模式] of styles.entries()) {
    const 刘海分色模式 = styles[(index + 1) % styles.length] ?? 分色模式;
    addCase(sources, `hair/color/split/${分色模式}/${刘海分色模式}`, {
      发色: primary,
      发色模式: "拆分",
      发色详情: {
        头发: { 分色模式, 发色: red, 第二发色: black },
        刘海: { 分色模式: 刘海分色模式, 发色: blond, 第二发色: blue },
      },
      发型: { 发型: "自然状态", 刘海: "自然状态", 长度: "到胸" },
    });
  }
}

function addClothingCases(sources: Source[]): void {
  const clothingBySlot = clothesData as Record<SlotKey, ClothingItem[]>;
  for (const slot of Object.keys(slotCn) as SlotKey[]) {
    const cn = slotCn[slot];
    for (const option of listOptions(`衣物.${cn}.名称`)) {
      const item = clothingBySlot[slot].find(
        (candidate) => candidate.name === optionMetaKey(option),
      );
      if (!item) continue;
      const capabilities = clothingCapabilities(cn, item);
      addStandardClothingCases(sources, slot, cn, item, capabilities);
      handleBranchHints(sources, {
        slot,
        cn,
        item,
        states: capabilities.states,
        breastSizes: capabilities.breastSizes,
        baseWorn: baseClothingWorn(cn, item, capabilities.states),
      });
    }
  }
}

function addTransformationCases(sources: Source[]): void {
  const hairColor = listValues("发色").find((value) => value === "棕色");
  for (const transform of listOptions("转化")) {
    const transformKey = optionMetaKey(transform) ?? transform.value;
    addCase(sources, `transform/${transformKey}/default`, {
      转化: transform.value,
      发色: hairColor,
    });

    const transformPayload: CharacterPayload = { 转化: transform.value };
    const detailOptions = resolvePayloadOptions(transformPayload).filter(
      (option) =>
        option.category === "transformation" && option.type === "list" && option.key !== "转化",
    );
    for (const option of detailOptions) {
      if (option.type !== "list") continue;
      const field = option.key.replace("转化.细节.", "");
      for (const value of option.options.map((item) => item.value)) {
        addCase(sources, `transform/${transformKey}/${field}/${value}`, {
          发色: hairColor,
          转化: { 类型: transform.value, 细节: { [field]: value } },
        } as CharacterPayload);
      }
    }
  }
}

function addMaskHelperCases(sources: Source[]): void {
  addCase(sources, "helpers/formfitting/curvy-upper", {
    身形: "曲线",
    衣物: { 上装: { 名称: "女式衬衫" } },
  });
  addCase(sources, "helpers/formfitting/slender-upper", {
    身形: "瘦长",
    衣物: { 上装: { 名称: "女式衬衫" } },
  });
  addCase(sources, "helpers/formfitting/curvy-under-upper", {
    身形: "曲线",
    衣物: { 内衣上装: { 名称: "运动内衣" } },
  });
  addCase(sources, "helpers/soft/uncovered", {
    身形: "柔软",
    衣物: {
      上装: { 名称: "女式衬衫" },
      下装: { 名称: "牛仔短裤" },
      内衣上装: { 名称: "运动内衣" },
      内衣下装: { 名称: "普通内裤" },
      腿饰: { 名称: "长筒袜" },
    },
  } as CharacterPayload);
  addCase(sources, "helpers/soft/covered-belly", {
    身形: "柔软",
    覆盖孕肚: true,
    衣物: {
      上装: { 名称: "女式衬衫" },
      下装: { 名称: "牛仔短裤" },
      内衣下装: { 名称: "普通内裤" },
    },
  } as CharacterPayload);
  for (const 孕肚 of numberValues("孕肚").filter((value) => value >= 8)) {
    addCase(sources, `helpers/belly/split/${孕肚}`, {
      孕肚,
      胸部: 4,
      衣物: {
        上装: { 名称: "校服衬衫" },
        下装: { 名称: "牛仔短裤" },
        内衣上装: { 名称: "运动内衣" },
        内衣下装: { 名称: "普通内裤" },
        腿饰: { 名称: "长筒袜" },
      },
    } as CharacterPayload);
    addCase(sources, `helpers/belly/min/${孕肚}`, {
      孕肚,
      胸部: 4,
      衣物: {
        上装: { 名称: "毛衣" },
        下装: { 名称: "牛仔短裤" },
        内衣下装: { 名称: "普通内裤" },
      },
    } as CharacterPayload);
    addCase(sources, `helpers/belly/cover-lower/${孕肚}`, {
      孕肚,
      胸部: 4,
      衣物: {
        上装: { 名称: "校服衬衫" },
        下装: { 名称: "校服连衣裙" },
      },
    } as CharacterPayload);
  }
}

function ignoredReason(path: string): string | undefined {
  return ignoredUnusedRules.find((rule) => rule.test(path))?.name;
}

const sources: Source[] = [];
const logicIssues: LogicIssue[] = [];
addBodyCases(sources);
addFaceCases(sources);
addHairCases(sources, logicIssues);
addClothingCases(sources);
addTransformationCases(sources);
addMaskHelperCases(sources);

const referenced = new Map<string, Source[]>();
for (const source of sources) {
  const bucket = referenced.get(source.src) ?? [];
  bucket.push(source);
  referenced.set(source.src, bucket);
}

const allImages = listPngs(`${ROOT}/${IMG_ROOT}`);
const missing = [...referenced.entries()]
  .filter(([src]) => !existsSync(`${ROOT}/${src}`))
  .map(([src, refs]) => ({ src, examples: refs.slice(0, 5) }));

const unused = allImages
  .filter((src) => !referenced.has(src))
  .map((src) => ({ src, ignoredReason: ignoredReason(src) }));
const actionableUnused = unused.filter((entry) => !entry.ignoredReason);
const ignoredUnused = unused.filter((entry) => entry.ignoredReason);

if (JSON_OUTPUT) {
  console.log(
    JSON.stringify(
      {
        cases: sources.length,
        referencedImages: referenced.size,
        allImages: allImages.length,
        missing,
        logicIssues,
        actionableUnused,
        ignoredUnused,
      },
      null,
      2,
    ),
  );
} else {
  console.log(`render coverage cases: ${sources.length}`);
  console.log(`referenced images: ${referenced.size}`);
  console.log(`all images: ${allImages.length}`);
  console.log(`logic issues: ${logicIssues.length}`);
  console.log(`missing images: ${missing.length}`);
  console.log(`unused actionable images: ${actionableUnused.length}`);
  console.log(`unused ignored images: ${ignoredUnused.length}`);

  if (logicIssues.length) {
    console.log("\nLogic issues:");
    console.table(logicIssues.slice(0, MAX_TABLE_ROWS));
  }

  if (missing.length) {
    console.log("\nMissing images:");
    console.table(
      missing.slice(0, MAX_TABLE_ROWS).map(({ src, examples }) => ({
        src,
        layer: examples[0]?.layerId,
        case: examples[0]?.caseName,
      })),
    );
  }

  if (actionableUnused.length) {
    console.log("\nUnused actionable images:");
    console.table(actionableUnused.slice(0, MAX_TABLE_ROWS).map(({ src }) => ({ src })));
  }

  if (ignoredUnused.length) {
    console.log("\nUnused ignored images by reason:");
    console.table(
      Object.entries(
        ignoredUnused.reduce<Record<string, number>>((acc, entry) => {
          acc[entry.ignoredReason!] = (acc[entry.ignoredReason!] ?? 0) + 1;
          return acc;
        }, {}),
      ).map(([reason, count]) => ({ reason, count })),
    );
  }
}

if (
  logicIssues.length ||
  missing.length ||
  actionableUnused.length ||
  (STRICT_IGNORED && ignoredUnused.length)
) {
  process.exit(1);
}
