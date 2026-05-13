import { existsSync, readdirSync, statSync } from "node:fs";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";
import { buildLayers } from "@/character/builder";
import ignoreRuleConfig from "./render-coverage-ignore-rules.json";
import type {
  CharacterPayload,
  ClothingWorn,
  HairColorStyle,
  HairLength,
  TransformDetail,
} from "@/types";
import { clothesData, faceData, hairData, i18nData, transformationsData } from "@/data/generated";

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

type Product<T extends readonly (readonly unknown[])[]> = {
  [K in keyof T]: T[K] extends readonly (infer U)[] ? U : never;
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

function cartesian<const T extends readonly (readonly unknown[])[]>(...arrays: T): Product<T>[] {
  return arrays.reduce<unknown[][]>(
    (acc, array) => acc.flatMap((combo) => array.map((value) => [...combo, value])),
    [[]],
  ) as Product<T>[];
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

function colorPayload(item: ClothingItem): Pick<ClothingWorn, "主色调" | "第二色调"> {
  return {
    ...(item.colorOptions?.length
      ? { 主色调: item.colorOptions.includes("white") ? "white" : item.colorOptions[0] }
      : {}),
    ...(item.accColorOptions?.length
      ? { 第二色调: item.accColorOptions.includes("black") ? "black" : item.accColorOptions[0] }
      : {}),
  };
}

function hasBreastImage(item: ClothingItem): boolean {
  if (!item.breastImg) return false;
  if (typeof item.breastImg === "number") return item.breastImg !== 0;
  return Object.values(item.breastImg).some((value) => value !== null && value !== undefined);
}

function clothingCapabilities(slot: SlotKey, item: ClothingItem): ClothingCapabilities {
  return {
    states: item.states.length ? item.states : ["full"],
    breastSizes:
      slot === "upper" || slot === "under-upper" || (slot === "lower" && hasBreastImage(item))
        ? [0, 1, 2, 3, 4, 5, 6]
        : [3],
    patterns: unique([undefined, ...(item.patternOptions ?? [])]),
    leftArms: ["idle", "cover"],
    rightArms: ["idle", "cover", "hold"],
  };
}

function clothingWorn(
  item: ClothingItem,
  state: string,
  pattern?: string,
): ClothingWorn & Record<string, string | undefined> {
  const worn: ClothingWorn & Record<string, string | undefined> = {
    名称: item.cnName,
    状态: state as ClothingWorn["状态"],
    ...colorPayload(item),
  };
  if (pattern) {
    worn.图案 = pattern;
    worn.花纹 = pattern;
  }
  return worn;
}

function baseClothingWorn(item: ClothingItem, states: string[]): ClothingWorn {
  return clothingWorn(item, states[0] ?? "full", item.patternOptions?.[0]);
}

function addStandardClothingCases(
  sources: Source[],
  slot: SlotKey,
  cn: (typeof slotCn)[SlotKey],
  item: ClothingItem,
  capabilities: ClothingCapabilities,
): void {
  for (const [state, 胸部, pattern, 左臂, 右臂] of cartesian(
    capabilities.states,
    capabilities.breastSizes,
    capabilities.patterns,
    capabilities.leftArms,
    capabilities.rightArms,
  )) {
    const worn = clothingWorn(item, state, pattern);
    addCase(sources, `clothes/${slot}/${item.name}/${state}/b${胸部}/${左臂}/${右臂}`, {
      胸部,
      左臂,
      右臂,
      衣物: { [cn]: worn },
    } as CharacterPayload);
    if (slot === "lower" && (item.name.includes("pinafore") || item.cnName.includes("连衣裙"))) {
      addCase(
        sources,
        `clothes/${slot}/${item.name}/schoolblouse/${state}/b${胸部}/${左臂}/${右臂}`,
        {
          胸部,
          左臂,
          右臂,
          衣物: { 上装: { 名称: "学校衬衫" }, [cn]: worn },
        } as CharacterPayload,
      );
    }
  }
}

const branchHandlers: BranchHandler[] = [
  {
    hint: "替代",
    add: (sources, { slot, cn, item, states, breastSizes, baseWorn }) => {
      for (const [state, 胸部] of cartesian(states, breastSizes)) {
        addCase(sources, `clothes/${slot}/${item.name}/branch/alt/${state}/b${胸部}`, {
          胸部,
          左臂: "idle",
          右臂: "hold",
          衣物: { [cn]: { ...baseWorn, 状态: state as ClothingWorn["状态"], 替代: true } },
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
    if (handler.hint && !context.item.branchHints?.[handler.hint]) continue;
    if (handler.applies && !handler.applies(context)) continue;
    handler.add(sources, context);
  }
}

function addBodyCases(sources: Source[]): void {
  const shapes = Object.keys((i18nData as typeof i18nData).bodyShapes) as Array<
    NonNullable<CharacterPayload["身形"]>
  >;
  for (const 身形 of shapes) {
    for (const 左臂 of ["idle", "cover"] as const) {
      for (const 右臂 of ["idle", "cover", "hold"] as const) {
        addCase(sources, `body/${身形}/${左臂}/${右臂}`, { 身形, 左臂, 右臂, 胸部: 3 });
      }
    }
    for (let 胸部 = 0; 胸部 <= 6; 胸部++)
      addCase(sources, `body/breasts/${身形}/${胸部}`, { 身形, 胸部 });
  }
  for (let 孕肚 = 1; 孕肚 <= 24; 孕肚++) addCase(sources, `body/pregnant-belly/${孕肚}`, { 孕肚 });
  for (const 阴茎状态 of ["soft", "hard"] as const) {
    for (let 阴茎大小 = 0; 阴茎大小 <= 6; 阴茎大小++) {
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
        避孕套: { 类型: "plain", 颜色: "red" },
      });
    }
  }
  for (let i = 0; i <= 5; i++) {
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
  const demeanors = Object.keys((faceData as typeof faceData).demeanorEn);
  const brows = Object.keys((faceData as typeof faceData).browsMap) as Array<
    NonNullable<CharacterPayload["眉毛"]>
  >;
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
  for (const 嘴部 of Object.keys((faceData as typeof faceData).mouthMap) as Array<
    NonNullable<CharacterPayload["嘴部"]>
  >) {
    addCase(sources, `face/mouth/${嘴部}`, { 嘴部 });
  }
  for (let 脸红 = 1; 脸红 <= 5; 脸红++) addCase(sources, `face/blush/${脸红}`, { 脸红 });
  for (let 泪水 = 1; 泪水 <= 4; 泪水++) addCase(sources, `face/tears/${泪水}`, { 泪水 });
}

function addHairCases(sources: Source[], logicIssues: LogicIssue[]): void {
  const publicLengths = Object.entries(
    (i18nData as typeof i18nData).hairLengths as Record<string, { en: string }>,
  ) as Array<[HairLength, { en: string }]>;

  for (const style of (hairData as typeof hairData).hairStyles) {
    for (const [长度, { en: len }] of publicLengths) {
      const caseName = `hair/style/${style.name}/${len}`;
      const added = addCase(sources, caseName, { 发型: { 发型: style.cnName, 长度 } });
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
  for (const fringe of (hairData as typeof hairData).fringeStyles) {
    for (const [长度, { en: len }] of publicLengths) {
      const caseName = `hair/fringe/${fringe.name}/${len}`;
      const added = addCase(sources, caseName, {
        发型: { 刘海: fringe.cnName, 长度 },
        刘海: fringe.cnName,
      });
      if (!added.some((source) => source.layerId === "hair-fringe")) {
        logicIssues.push({ caseName, issue: "fringe payload produced no hair-fringe layer" });
      }
    }
  }

  const styles = Object.keys(
    (i18nData as typeof i18nData).hairColorStyles ?? {},
  ) as HairColorStyle[];
  for (const 分色模式 of styles) {
    addCase(sources, `hair/color/overall/${分色模式}`, {
      发色: "棕色",
      发色模式: "整体",
      发色详情: {
        头发: { 分色模式, 发色: "red", 第二发色: "black" },
      },
      发型: { 发型: "自然状态", 刘海: "自然状态", 长度: "到胸" },
    });
  }
  for (const [index, 分色模式] of styles.entries()) {
    const 刘海分色模式 = styles[(index + 1) % styles.length] ?? 分色模式;
    addCase(sources, `hair/color/split/${分色模式}/${刘海分色模式}`, {
      发色: "棕色",
      发色模式: "拆分",
      发色详情: {
        头发: { 分色模式, 发色: "red", 第二发色: "black" },
        刘海: { 分色模式: 刘海分色模式, 发色: "blonde", 第二发色: "blue" },
      },
      发型: { 发型: "自然状态", 刘海: "自然状态", 长度: "到胸" },
    });
  }
}

function addClothingCases(sources: Source[]): void {
  for (const [slot, items] of Object.entries(clothesData as Record<SlotKey, ClothingItem[]>)) {
    const cn = slotCn[slot as SlotKey];
    for (const item of items) {
      const capabilities = clothingCapabilities(slot as SlotKey, item);
      addStandardClothingCases(sources, slot as SlotKey, cn, item, capabilities);
      handleBranchHints(sources, {
        slot: slot as SlotKey,
        cn,
        item,
        states: capabilities.states,
        breastSizes: capabilities.breastSizes,
        baseWorn: baseClothingWorn(item, capabilities.states),
      });
    }
  }
}

function transformField(part: string): keyof TransformDetail | undefined {
  return {
    "wings-idle": "翅膀",
    halo: "光环",
    ears: "耳朵",
    "tail-idle": "尾巴",
    horns: "角",
    feathers: "羽毛",
    eyes: "眼睛",
    cheeks: "脸颊",
  }[part] as keyof TransformDetail | undefined;
}

function addTransformationCases(sources: Source[]): void {
  for (const [key, transform] of Object.entries(
    transformationsData as typeof transformationsData,
  )) {
    addCase(sources, `transform/${key}/default`, { 转化: transform.cnName, 发色: "棕色" });
    for (const [part, variants] of Object.entries(transform.parts)) {
      const field = transformField(part);
      if (!field) continue;
      for (const rawVariant of variants as string[]) {
        const variant = rawVariant.replace(/-(back|front|left|right)$/, "");
        addCase(sources, `transform/${key}/${part}/${variant}`, {
          发色: "棕色",
          转化: { 类型: transform.cnName, 细节: { [field]: variant } },
        } as CharacterPayload);
      }
    }
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
