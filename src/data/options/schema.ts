import type { CharacterPayload, ClothingWorn } from "@/types";
import { colorsData, faceData, hairData, i18nData, transformationsData } from "@/data/generated";
import { SLOTS, type BreastMap, type ClothingItem, type SlotCn } from "@/character/render-catalog";
import type {
  ColorEntry,
  PayloadListItem,
  PayloadOption,
  PayloadOptionContext,
  TransformEntry,
} from "@/data/options/types";
import {
  booleanOption,
  byPinyin,
  colorsToOptions,
  entriesToOptions,
  listOption,
  numberOption,
  rawValuesToOptions,
  sortedByPinyin,
} from "@/data/options/utils";

const BODY_SHAPES = i18nData.bodyShapes as Record<string, { en: string }>;
const HAIR_LENGTHS = i18nData.hairLengths as Record<string, { en: string }>;
const HAIR_COLOR_STYLES = i18nData.hairColorStyles as Record<string, { en: string }>;
const TRANSFORMS = transformationsData as Record<string, TransformEntry>;

const CLOTHING_STATE_LABELS: Record<string, string> = {
  full: "完整",
  torn: "撕裂",
  tattered: "破旧",
  frayed: "磨损",
};

const TRANSFORM_ORDER = ["天使", "堕天使", "恶魔"];

const TRANSFORM_PART_FIELD: Record<string, string | undefined> = {
  "wings-idle": "翅膀",
  "wings-cover": "翅膀",
  "wings-flaunt": "翅膀",
  halo: "光环",
  ears: "耳朵",
  "tail-idle": "尾巴",
  "tail-cover": "尾巴",
  "tail-flaunt": "尾巴",
  horns: "角",
  eyes: "眼睛",
  cheeks: "脸颊",
};
const TRANSFORM_STATES = ["idle", "cover", "flaunt"] as const;
const TRANSFORM_SIDE_STATES = ["idle", "cover"] as const;
const TRANSFORM_PART_STATES = ["default", "hidden", "disabled"] as const;
const TRANSFORM_PART_STATE_LABELS: Record<string, string> = {
  default: "默认",
  hidden: "隐藏",
  disabled: "关闭",
};

function valuesToOptions(
  values: readonly string[],
  labels?: Record<string, string>,
): PayloadListItem[] {
  return [...new Set(values)].map((value) => ({
    value,
    label: labels?.[value] ?? value,
  }));
}

function defaultFirst(options: PayloadListItem[]): PayloadListItem[] {
  return [...options].sort((a, b) => {
    if (a.value === "default") return -1;
    if (b.value === "default") return 1;
    return byPinyin(a, b);
  });
}

function hasPenis(ctx: PayloadOptionContext): boolean {
  return ctx.payload.阴茎 === true;
}

function selectedTransformName(payload: CharacterPayload): string | undefined {
  return typeof payload.转化 === "object" ? payload.转化.类型 : payload.转化;
}

function selectedTransform(ctx: PayloadOptionContext): [string, TransformEntry] | undefined {
  const name = selectedTransformName(ctx.payload);
  if (!name) return undefined;
  const normalizedName = name.endsWith("化") ? name.slice(0, -1) : name;
  return Object.entries(TRANSFORMS).find(
    ([key, transform]) =>
      key === name || transform.cnName === name || transform.cnName === normalizedName,
  );
}

function transformTypeOptions(): PayloadListItem[] {
  const options = Object.entries(TRANSFORMS).map(([key, transform]) => ({
    value: transform.cnName,
    label: transform.cnName,
    meta: {
      key,
      label: transform.label,
    },
  }));
  return options.sort((a, b) => {
    const aOrder = TRANSFORM_ORDER.indexOf(a.value);
    const bOrder = TRANSFORM_ORDER.indexOf(b.value);
    if (aOrder !== -1 || bOrder !== -1) {
      return (
        (aOrder === -1 ? Number.MAX_SAFE_INTEGER : aOrder) -
        (bOrder === -1 ? Number.MAX_SAFE_INTEGER : bOrder)
      );
    }
    return byPinyin(a, b);
  });
}

function variantBase(variant: string): string {
  return variant.replace(/-(back|front)$/, "").replace(/-(left|right)(?=-|$)/, "");
}

function transformVariantOptions(transform: TransformEntry, partKeys: string[]): PayloadListItem[] {
  const labels: Record<string, string> = {};
  const bases: string[] = [];
  for (const partKey of partKeys) {
    for (const variant of transform.parts[partKey] ?? []) {
      const base = variantBase(variant);
      bases.push(base);
      const label =
        transform.variantLabels?.[partKey]?.[variant] ?? transform.variantLabels?.[partKey]?.[base];
      if (label) labels[base] ??= label;
    }
  }
  return defaultFirst(
    [...new Set(bases)].map((value) => ({
      value,
      label: labels[value] ?? value,
    })),
  );
}

function transformPartOptions(field: string): (ctx: PayloadOptionContext) => PayloadListItem[] {
  return (ctx) => {
    const found = selectedTransform(ctx);
    if (!found) return [];
    const [, transform] = found;
    const partKeys = Object.keys(transform.parts).filter(
      (partKey) => TRANSFORM_PART_FIELD[partKey] === field,
    );
    return transformVariantOptions(transform, partKeys);
  };
}

function hasMultipleTransformPartOptions(field: string): (ctx: PayloadOptionContext) => boolean {
  return (ctx) => transformPartOptions(field)(ctx).length > 1;
}

function hasTransformPart(field: string): (ctx: PayloadOptionContext) => boolean {
  return (ctx) => {
    const found = selectedTransform(ctx);
    if (!found) return false;
    const [, transform] = found;
    return Object.keys(transform.parts).some((partKey) => TRANSFORM_PART_FIELD[partKey] === field);
  };
}

function transformStateOptions(
  prefix: "wings" | "tail",
): (ctx: PayloadOptionContext) => PayloadListItem[] {
  return (ctx) => {
    const found = selectedTransform(ctx);
    if (!found) return [];
    const [, transform] = found;
    return valuesToOptions(
      TRANSFORM_STATES.filter((state) => transform.parts[`${prefix}-${state}`]?.length),
    );
  };
}

function hasDirectionalWingState(ctx: PayloadOptionContext): boolean {
  const found = selectedTransform(ctx);
  if (!found) return false;
  const [, transform] = found;
  return (transform.parts["wings-cover"] ?? []).some((variant) =>
    /-(left|right)(?:-|$)/.test(variant),
  );
}

function hasGlobalWingState(ctx: PayloadOptionContext): boolean {
  if (hasDirectionalWingState(ctx)) return false;
  return transformStateOptions("wings")(ctx).length > 1;
}

function hasSideWingState(ctx: PayloadOptionContext): boolean {
  return hasDirectionalWingState(ctx);
}

function hasTailState(ctx: PayloadOptionContext): boolean {
  const found = selectedTransform(ctx);
  if (!found || found[0] === "fox") return false;
  return transformStateOptions("tail")(ctx).length > 1;
}

function hasBirdFeathers(ctx: PayloadOptionContext): boolean {
  const found = selectedTransform(ctx);
  if (!found) return false;
  const [key, transform] = found;
  return key === "bird" && (transform.parts.feathers ?? []).length > 0;
}

function selectedClothing(payload: CharacterPayload, slot: SlotCn): ClothingWorn | undefined {
  return payload.衣物?.[slot as keyof NonNullable<CharacterPayload["衣物"]>] ?? undefined;
}

function selectedClothingItem(ctx: PayloadOptionContext, slot: SlotCn): ClothingItem | undefined {
  const worn = selectedClothing(ctx.payload, slot);
  if (!worn) return undefined;
  const slotDef = SLOTS.find((candidate) => candidate.cn === slot);
  return slotDef?.data.find((item) => item.cnName === worn.名称 || item.name === worn.名称);
}

function clothingNameOptions(slot: SlotCn): PayloadListItem[] {
  const slotDef = SLOTS.find((candidate) => candidate.cn === slot);
  return sortedByPinyin(
    (slotDef?.data ?? []).map((item) => ({
      value: item.cnName,
      label: item.cnName,
      meta: {
        key: item.name,
        slot: slotDef?.dir,
      },
    })),
  );
}

function clothingColorItems(item: ClothingItem, field: "colorOptions" | "accColorOptions") {
  const allowed = new Set(item[field] ?? []);
  const colors = colorsData.clothes as ColorEntry[];
  const matchedValues = new Set<string>();
  const matchedOptions = colors
    .filter((entry) => {
      const matched =
        allowed.has(entry.variable) || allowed.has(entry.name) || allowed.has(entry.cnName);
      if (matched) {
        matchedValues.add(entry.variable);
        matchedValues.add(entry.name);
        matchedValues.add(entry.cnName);
      }
      return matched;
    })
    .map((entry) => ({
      value: entry.cnName,
      label: entry.cnName,
      meta: {
        variable: entry.variable,
        name: entry.name,
      },
    }));
  const rawOptions = [...allowed]
    .filter((value) => !matchedValues.has(value))
    .map((value) => ({
      value,
      label: value,
    }));
  return sortedByPinyin([...matchedOptions, ...rawOptions]);
}

function clothingColorOptions(
  slot: SlotCn,
  field: "colorOptions" | "accColorOptions",
): (ctx: PayloadOptionContext) => PayloadListItem[] {
  return (ctx) => {
    const item = selectedClothingItem(ctx, slot);
    if (!item) return [];
    return clothingColorItems(item, field);
  };
}

function hasMultipleClothingColorOptions(
  slot: SlotCn,
  field: "colorOptions" | "accColorOptions",
): (ctx: PayloadOptionContext) => boolean {
  return (ctx) => {
    const item = selectedClothingItem(ctx, slot);
    return item ? clothingColorItems(item, field).length > 1 : false;
  };
}

function hasClothingOptions(
  slot: SlotCn,
  field: "colorOptions" | "accColorOptions" | "patternOptions" | "states",
): (ctx: PayloadOptionContext) => boolean {
  return (ctx) => Boolean(selectedClothingItem(ctx, slot)?.[field]?.length);
}

function clothingPatternOptions(slot: SlotCn): (ctx: PayloadOptionContext) => PayloadListItem[] {
  return (ctx) => rawValuesToOptions(selectedClothingItem(ctx, slot)?.patternOptions ?? []);
}

function clothingStateOptions(slot: SlotCn): (ctx: PayloadOptionContext) => PayloadListItem[] {
  return (ctx) =>
    rawValuesToOptions(selectedClothingItem(ctx, slot)?.states ?? ["full"], CLOTHING_STATE_LABELS);
}

function supportsBreastLayer(slot: SlotCn, item: ClothingItem): boolean {
  if (slot === "上装" || slot === "内衣上装") return true;
  const breastImg = item.breastImg;
  if (!breastImg) return false;
  if (typeof breastImg === "number") return breastImg !== 0;
  return Object.values(breastImg as BreastMap).some(
    (value) => value !== null && value !== undefined,
  );
}

function hasBreastLayer(slot: SlotCn): (ctx: PayloadOptionContext) => boolean {
  return (ctx) => {
    const item = selectedClothingItem(ctx, slot);
    return item ? supportsBreastLayer(slot, item) : false;
  };
}

function hasBranchHint(slot: SlotCn, hint: string): (ctx: PayloadOptionContext) => boolean {
  return (ctx) => selectedClothingItem(ctx, slot)?.branchHints?.[hint] === true;
}

function bodyOptions(): PayloadOption[] {
  return [
    listOption("身形", "身形", "body", entriesToOptions(BODY_SHAPES)),
    numberOption("胸部", "胸部", "body", 0, 6),
    numberOption("孕肚", "孕肚", "body", 0, 24),
    booleanOption("覆盖孕肚", "覆盖孕肚", "body"),
    listOption("左臂", "左臂", "body", rawValuesToOptions(["idle", "cover"])),
    listOption("右臂", "右臂", "body", rawValuesToOptions(["idle", "cover", "hold"])),
    booleanOption("阴茎", "阴茎", "body"),
    listOption("阴茎状态", "阴茎状态", "body", rawValuesToOptions(["soft", "hard"]), hasPenis),
    numberOption("阴茎大小", "阴茎大小", "body", 0, 6, hasPenis),
    booleanOption("包茎", "包茎", "body", hasPenis),
    booleanOption("睾丸", "睾丸", "body", hasPenis),
    listOption("避孕套.类型", "避孕套类型", "body", rawValuesToOptions(["plain"]), hasPenis),
    listOption(
      "避孕套.颜色",
      "避孕套颜色",
      "body",
      colorsToOptions(colorsData.condom as ColorEntry[]),
      hasPenis,
    ),
    ...[
      "胸部",
      "脸",
      "脚",
      "左臂",
      "右臂",
      "颈部",
      "大腿",
      "腹部",
      "阴道滴落",
      "肛门滴落",
      "口部滴落",
    ].map((key) => numberOption(`精液.${key}`, `精液${key}`, "body", 0, 5)),
  ];
}

function hairOptions(): PayloadOption[] {
  const hairColors = colorsToOptions(colorsData.hair as ColorEntry[]);
  return [
    listOption(
      "发型.发型",
      "发型",
      "hair",
      sortedByPinyin(
        hairData.hairStyles.map((style) => ({
          value: style.cnName,
          label: style.cnName,
          meta: { key: style.name },
        })),
      ),
    ),
    listOption(
      "发型.刘海",
      "刘海",
      "hair",
      sortedByPinyin(
        hairData.fringeStyles.map((style) => ({
          value: style.cnName,
          label: style.cnName,
          meta: { key: style.name },
        })),
      ),
    ),
    listOption("发型.长度", "发型长度", "hair", entriesToOptions(HAIR_LENGTHS)),
    listOption("发型.位置", "头发位置", "hair", rawValuesToOptions(["前", "后"])),
    listOption("发色", "发色", "hair", hairColors),
    listOption("发色模式", "发色模式", "hair", rawValuesToOptions(["单色", "整体", "拆分"])),
    listOption(
      "发色详情.头发.分色模式",
      "头发分色模式",
      "hair",
      entriesToOptions(HAIR_COLOR_STYLES),
    ),
    listOption("发色详情.头发.发色", "头发发色", "hair", hairColors),
    listOption("发色详情.头发.第二发色", "头发第二发色", "hair", hairColors),
    listOption(
      "发色详情.刘海.分色模式",
      "刘海分色模式",
      "hair",
      entriesToOptions(HAIR_COLOR_STYLES),
    ),
    listOption("发色详情.刘海.发色", "刘海发色", "hair", hairColors),
    listOption("发色详情.刘海.第二发色", "刘海第二发色", "hair", hairColors),
  ];
}

function faceOptions(): PayloadOption[] {
  return [
    listOption("仪态", "仪态", "face", rawValuesToOptions(Object.keys(faceData.demeanorEn))),
    listOption("眉毛", "眉毛", "face", rawValuesToOptions(Object.keys(faceData.browsMap))),
    listOption("嘴部", "嘴部", "face", rawValuesToOptions(Object.keys(faceData.mouthMap))),
    listOption(
      "眼睛.左眼瞳色",
      "左眼瞳色",
      "face",
      colorsToOptions(colorsData.eyes as ColorEntry[]),
    ),
    listOption(
      "眼睛.右眼瞳色",
      "右眼瞳色",
      "face",
      colorsToOptions(colorsData.eyes as ColorEntry[]),
    ),
    booleanOption("眼睛.无神", "无神", "face"),
    booleanOption("眼睛.半睁眼", "半睁眼", "face"),
    booleanOption("眼睛.血丝眼", "血丝眼", "face"),
    numberOption("眼睛.流泪程度", "眼睛流泪程度", "face", 0, 5),
    numberOption("脸红", "脸红", "face", 0, 5),
    numberOption("脸红程度", "脸红程度", "face", 0, 5),
    numberOption("泪水", "泪水", "face", 0, 4),
  ];
}

function clothingOptions(): PayloadOption[] {
  return SLOTS.flatMap((slot) => {
    const slotCn = slot.cn;
    const prefix = `衣物.${slotCn}`;
    return [
      listOption(`${prefix}.名称`, `${slotCn}名称`, "clothing", clothingNameOptions(slotCn)),
      listOption(
        `${prefix}.主色调`,
        `${slotCn}主色调`,
        "clothing",
        clothingColorOptions(slotCn, "colorOptions"),
        hasMultipleClothingColorOptions(slotCn, "colorOptions"),
      ),
      listOption(
        `${prefix}.第二色调`,
        `${slotCn}第二色调`,
        "clothing",
        clothingColorOptions(slotCn, "accColorOptions"),
        hasMultipleClothingColorOptions(slotCn, "accColorOptions"),
      ),
      listOption(
        `${prefix}.图案`,
        `${slotCn}图案`,
        "clothing",
        clothingPatternOptions(slotCn),
        hasClothingOptions(slotCn, "patternOptions"),
      ),
      listOption(
        `${prefix}.花纹`,
        `${slotCn}花纹`,
        "clothing",
        clothingPatternOptions(slotCn),
        hasClothingOptions(slotCn, "patternOptions"),
      ),
      listOption(
        `${prefix}.状态`,
        `${slotCn}状态`,
        "clothing",
        clothingStateOptions(slotCn),
        hasClothingOptions(slotCn, "states"),
      ),
      numberOption(
        `${prefix}.胸部层级`,
        `${slotCn}胸部层级`,
        "clothing",
        0,
        6,
        hasBreastLayer(slotCn),
      ),
      booleanOption(`${prefix}.替代`, `${slotCn}替代`, "clothing", hasBranchHint(slotCn, "替代")),
      listOption(
        `${prefix}.兜帽`,
        `${slotCn}兜帽`,
        "clothing",
        rawValuesToOptions(["戴上", "放下"]),
        hasBranchHint(slotCn, "兜帽"),
      ),
      booleanOption(`${prefix}.卷袖`, `${slotCn}卷袖`, "clothing", hasBranchHint(slotCn, "卷袖")),
    ];
  });
}

function transformationOptions(): PayloadOption[] {
  const detailOption = (field: string, label: string) =>
    listOption(
      `转化.细节.${field}`,
      `转化${label}`,
      "transformation",
      transformPartOptions(field),
      hasMultipleTransformPartOptions(field),
    );

  return [
    listOption("转化", "转化", "transformation", transformTypeOptions()),
    detailOption("翅膀", "翅膀"),
    listOption(
      "转化.细节.翅膀状态",
      "转化翅膀状态",
      "transformation",
      transformStateOptions("wings"),
      hasGlobalWingState,
    ),
    listOption(
      "转化.细节.左翅膀状态",
      "转化左翅膀状态",
      "transformation",
      valuesToOptions(TRANSFORM_SIDE_STATES),
      hasSideWingState,
    ),
    listOption(
      "转化.细节.右翅膀状态",
      "转化右翅膀状态",
      "transformation",
      valuesToOptions(TRANSFORM_SIDE_STATES),
      hasSideWingState,
    ),
    listOption(
      "转化.细节.翅膀层级",
      "转化翅膀层级",
      "transformation",
      valuesToOptions(["前", "后"]),
      hasTransformPart("翅膀"),
    ),
    detailOption("光环", "光环"),
    detailOption("耳朵", "耳朵"),
    detailOption("尾巴", "尾巴"),
    listOption(
      "转化.细节.尾巴状态",
      "转化尾巴状态",
      "transformation",
      transformStateOptions("tail"),
      hasTailState,
    ),
    listOption(
      "转化.细节.尾巴层级",
      "转化尾巴层级",
      "transformation",
      valuesToOptions(["前", "后"]),
      hasTransformPart("尾巴"),
    ),
    detailOption("角", "角"),
    listOption(
      "转化.细节.角层级",
      "转化角层级",
      "transformation",
      valuesToOptions(["后", "前"]),
      hasTransformPart("角"),
    ),
    detailOption("眼睛", "眼睛"),
    detailOption("脸颊", "脸颊"),
    listOption(
      "转化.细节.颊羽",
      "转化颊羽状态",
      "transformation",
      valuesToOptions(TRANSFORM_PART_STATES, TRANSFORM_PART_STATE_LABELS),
      hasBirdFeathers,
    ),
    listOption(
      "转化.细节.覆羽",
      "转化覆羽状态",
      "transformation",
      valuesToOptions(TRANSFORM_PART_STATES, TRANSFORM_PART_STATE_LABELS),
      hasBirdFeathers,
    ),
    listOption(
      "转化.细节.阴毛",
      "转化阴毛状态",
      "transformation",
      valuesToOptions(TRANSFORM_PART_STATES, TRANSFORM_PART_STATE_LABELS),
      hasBirdFeathers,
    ),
  ];
}

export const payloadOptionsSchema: PayloadOption[] = [
  ...bodyOptions(),
  ...hairOptions(),
  ...faceOptions(),
  ...clothingOptions(),
  ...transformationOptions(),
];
