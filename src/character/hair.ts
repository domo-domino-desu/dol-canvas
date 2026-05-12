import type { LayerSpec, BuildContext, ColorFilter } from "@/types";
import { Z } from "@/data/zindex";
import hairData from "@/data/generated/hair.json";
import colorsData from "@/data/generated/colors.json";
import i18nData from "@/data/generated/i18n.json";

type HairStyle = { name: string; cnName: string; backLengths: string[]; sideFiles: string[] };
type FringeStyle = { name: string; cnName: string; files: string[] };
type ColorEntry = { variable: string; name: string; cnName: string; filter: ColorFilter };
type I18nEntry = { en: string };

const hairStyles: HairStyle[] = (hairData as typeof hairData).hairStyles;
const fringeStyles: FringeStyle[] = (hairData as typeof hairData).fringeStyles;
const hairColors: ColorEntry[] = (colorsData as typeof colorsData).hair as ColorEntry[];
const hairLengths = (i18nData as typeof i18nData).hairLengths as Record<string, I18nEntry>;
const BREATH = "playerBreath";

function lengthEn(cn?: string): string {
  return hairLengths[cn ?? "及肩"]?.en ?? "shoulder";
}

function hairFilter(cnName?: string): ColorFilter | undefined {
  if (!cnName) return undefined;
  const entry = hairColors.find((e) => e.cnName === cnName);
  if (!entry) return undefined;
  return { desaturate: true, ...entry.filter, blendMode: entry.filter.blendMode ?? "hard-light" };
}

function findStyle(cnName?: string): HairStyle | undefined {
  if (!cnName) return hairStyles.find((s) => s.name === "default");
  return (
    hairStyles.find((s) => s.cnName === cnName) ?? hairStyles.find((s) => s.name === "default")
  );
}

function findFringe(cnName?: string): FringeStyle | undefined {
  if (!cnName) return undefined;
  return fringeStyles.find((s) => s.cnName === cnName);
}

export function buildHairLayers(ctx: BuildContext): LayerSpec[] {
  const { payload, baseUrl } = ctx;
  const p = payload;
  const layers: LayerSpec[] = [];
  const b = baseUrl;

  const hairPayload = typeof p.发型 === "object" ? p.发型 : undefined;
  const styleName = hairPayload?.发型 ?? (typeof p.发型 === "string" ? p.发型 : undefined);
  const style = findStyle(styleName);
  if (!style) return layers;

  const len = lengthEn(hairPayload?.长度 ?? p.发长);
  const filter = hairFilter(p.发色);

  // ── Back hair ──────────────────────────────────────────────────────────────
  if (style.backLengths.includes(len)) {
    layers.push({
      id: "hair-back",
      src: `${b}hair/back/${style.name}/${len}.png`,
      z: Z.BACK_HAIR,
      filter,
      animation: BREATH,
    });
  }

  // ── Side hair ─────────────────────────────────────────────────────────────
  if (style.sideFiles.includes(len)) {
    layers.push({
      id: "hair-sides",
      src: `${b}hair/sides/${style.name}/${len}.png`,
      z: Z.HAIR,
      filter,
      animation: BREATH,
    });
  }

  // ── Fringe ────────────────────────────────────────────────────────────────
  const fringe = findFringe(hairPayload?.刘海 ?? p.刘海);
  if (fringe) {
    const fringeLen = len;
    if (fringe.files.includes(fringeLen)) {
      layers.push({
        id: "hair-fringe",
        src: `${b}hair/fringe/${fringe.name}/${fringeLen}.png`,
        z: Z.FRONT_HAIR,
        filter,
        animation: BREATH,
      });
    }
  }

  return layers;
}
