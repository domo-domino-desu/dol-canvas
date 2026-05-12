import type { LayerSpec, BuildContext, ClothingWorn, ColorFilter } from "@/types";
import { Z } from "@/data/zindex";
import { clothesData, colorsData } from "@/data/generated";

type ClothingItem = {
  name: string;
  cnName: string;
  colorOptions: string[];
  accColorOptions: string[];
  patternOptions?: string[];
  patternLayer?: string;
  states: string[];
  numeric: string[];
  armVariants: string[];
  hasAcc: boolean;
  accessoryIntegrityImg?: boolean;
  mainImage?: number;
  accImage?: number;
  sleeveImg?: boolean;
  sleeveAccImg?: boolean;
};
type ClothesJson = typeof clothesData;
type ColorEntry = { variable: string; name: string; cnName: string; filter: ColorFilter };

const clothColors: ColorEntry[] = (colorsData as typeof colorsData).clothes as ColorEntry[];
const BREATH = "playerBreath";

// Slot CN name → { zIndex, imgDir, data[] }
const SLOTS: Array<{ cn: string; z: number; dir: string; data: ClothingItem[] }> = [
  { cn: "上装", z: Z.UPPER, dir: "upper", data: (clothesData as ClothesJson).upper },
  { cn: "下装", z: Z.LOWER, dir: "lower", data: (clothesData as ClothesJson).lower },
  {
    cn: "内衣上装",
    z: Z.UNDER_UPPER,
    dir: "under-upper",
    data: (clothesData as ClothesJson)["under-upper"],
  },
  {
    cn: "内衣下装",
    z: Z.UNDER_LOWER,
    dir: "under-lower",
    data: (clothesData as ClothesJson)["under-lower"],
  },
  { cn: "头饰", z: Z.HEAD, dir: "head", data: (clothesData as ClothesJson).head },
  { cn: "面饰", z: Z.FACE_WEAR, dir: "face", data: (clothesData as ClothesJson).face },
  { cn: "颈部", z: Z.NECK, dir: "neck", data: (clothesData as ClothesJson).neck },
  { cn: "手饰", z: Z.HANDS, dir: "hands", data: (clothesData as ClothesJson).hands },
  { cn: "手持物品", z: Z.HANDHELD, dir: "handheld", data: (clothesData as ClothesJson).handheld },
  { cn: "鞋子", z: Z.FEET, dir: "feet", data: (clothesData as ClothesJson).feet },
  { cn: "腿饰", z: Z.LEGS, dir: "legs", data: (clothesData as ClothesJson).legs },
  { cn: "私部装备", z: Z.GENITALS, dir: "genitals", data: (clothesData as ClothesJson).genitals },
];

function clothFilter(cnColorName?: string): ColorFilter | undefined {
  if (!cnColorName) return undefined;
  const entry =
    clothColors.find((e) => e.cnName === cnColorName) ??
    clothColors.find((e) => e.variable === cnColorName) ??
    clothColors.find((e) => e.name === cnColorName);
  if (!entry) return undefined;
  return { ...entry.filter, blendMode: "hard-light" };
}

function findItem(data: ClothingItem[], cnName: string): ClothingItem | undefined {
  return data.find((item) => item.cnName === cnName);
}

function durabilityState(worn: ClothingWorn): string {
  const durability = worn.耐久度;
  if (durability === "完整") return "full";
  if (durability === "撕裂") return "torn";
  if (durability === "破旧") return "tattered";
  if (durability === "磨损") return "frayed";
  return worn.状态 ?? durability ?? "full";
}

function integrityFile(worn: ClothingWorn, item: ClothingItem): string {
  const state = durabilityState(worn);
  if (item.states.includes(state)) return state;
  return item.states[0] ?? "full";
}

function armStateFile(ctx: BuildContext, item: ClothingItem): string | undefined {
  const armFiles = item.armVariants.filter((file) => !file.endsWith("-acc"));
  if (!armFiles.length) return undefined;

  const rightArm = ctx.payload.右臂 ?? "hold";
  const rightFile = rightArm === "idle" ? "right-idle" : `right-${rightArm}`;
  const leftFile = ctx.payload.左臂 === "cover" ? "left-cover" : "left-idle";

  return (
    armFiles.find((file) => file === rightFile) ??
    armFiles.find((file) => file === leftFile) ??
    armFiles[0]
  );
}

function mainClothingFile(ctx: BuildContext, worn: ClothingWorn, item: ClothingItem): string {
  const integrity = integrityFile(worn, item);
  if (item.states.includes(integrity)) return integrity;
  return armStateFile(ctx, item) ?? integrity;
}

function patternFilePart(worn: ClothingWorn, item: ClothingItem): string {
  const pattern = worn.图案 ?? worn.花纹 ?? item.patternOptions?.[0];
  return pattern ? `-${pattern.replace(/ /g, "-")}` : "";
}

function accessoryFile(ctx: BuildContext, worn: ClothingWorn, item: ClothingItem): string {
  const pattern = item.patternLayer === "secondary" ? patternFilePart(worn, item) : "";
  if (item.accessoryIntegrityImg) return `acc-${integrityFile(worn, item)}${pattern}`;

  const armFile = armStateFile(ctx, item);
  if (armFile && item.armVariants.includes(`${armFile}${pattern}-acc`)) {
    return `${armFile}${pattern}-acc`;
  }
  if (armFile && item.armVariants.includes(`${armFile}-acc`)) return `${armFile}-acc`;

  return `acc${pattern}`;
}

export function buildClothingLayers(ctx: BuildContext): LayerSpec[] {
  const { payload, baseUrl, breastSize } = ctx;
  if (!payload.衣物) return [];

  const layers: LayerSpec[] = [];
  const b = baseUrl;

  for (const slotDef of SLOTS) {
    const worn = payload.衣物[slotDef.cn as keyof typeof payload.衣物];
    if (!worn) continue;

    const item = findItem(slotDef.data, worn.名称);
    if (!item) continue;

    const integrity = integrityFile(worn, item);
    const mainFile = mainClothingFile(ctx, worn, item);
    const filter = clothFilter(worn.主色调);
    const imgBase = `${b}clothes/${slotDef.dir}/${item.name}/`;

    // Main clothing layer
    if (item.mainImage !== 0) {
      layers.push({
        id: `cloth-${slotDef.cn}`,
        src: `${imgBase}${mainFile}.png`,
        z: slotDef.z,
        filter,
        animation: BREATH,
      });
    }

    // For upper/under-upper: add breast-fitting numeric layer if available
    if ((slotDef.cn === "上装" || slotDef.cn === "内衣上装") && item.numeric.length > 0) {
      // Map breast size to nearest available numeric layer
      const targets = item.numeric
        .map(Number)
        .filter((n) => !isNaN(n))
        .sort((a, b) => a - b);
      if (targets.length > 0) {
        const clamp = Math.min(breastSize, Math.max(...targets));
        const numeric = targets.reduce((prev, cur) =>
          Math.abs(cur - clamp) < Math.abs(prev - clamp) ? cur : prev,
        );
        layers.push({
          id: `cloth-${slotDef.cn}-fit`,
          src: `${imgBase}${numeric}.png`,
          z: slotDef.z + 0.1,
          filter,
          animation: BREATH,
        });
      }
    }

    // Accessory layer
    if (item.hasAcc && item.accImage !== 0) {
      const accFilter = clothFilter(worn.第二色调);
      layers.push({
        id: `cloth-${slotDef.cn}-acc`,
        src: `${imgBase}${accessoryFile(ctx, worn, item)}.png`,
        z: slotDef.z + 0.2,
        filter: accFilter,
        animation: BREATH,
      });
    }
  }

  return layers;
}
