import type { LayerSpec, ColorFilter, HairColorDetail } from "@/types";
import type { ResolvedState } from "@/character/state";
import { Z } from "@/data/zindex";
import { hairData, colorsData, i18nData } from "@/data/generated";
import { findMaterialColor, materialFilter, type MaterialColorEntry } from "@/character/material";

type HairStyle = { name: string; cnName: string; backLengths: string[]; sideFiles: string[] };
type FringeStyle = { name: string; cnName: string; files: string[] };
type I18nEntry = { en: string };
type HairGradientPrototype = {
  gradient: "linear" | "radial";
  values: number[];
  stops: [number, number];
  lengthOffset?: "minus-half";
};
type HairGradientEntry = HairGradientPrototype | Record<string, HairGradientPrototype>;

const hairStyles: HairStyle[] = (hairData as typeof hairData).hairStyles;
const fringeStyles: FringeStyle[] = (hairData as typeof hairData).fringeStyles;
const hairLengths = (i18nData as typeof i18nData).hairLengths as Record<string, I18nEntry>;
const hairColorStyles = (i18nData as typeof i18nData).hairColorStyles as Record<string, I18nEntry>;
const hairGradients = (colorsData as typeof colorsData).hairGradients as unknown as Record<
  "fringe" | "sides",
  Record<string, HairGradientEntry>
>;
const BREATH = "playerBreath";

function lengthEn(cn?: string): string {
  return hairLengths[cn ?? "及肩"]?.en ?? "shoulder";
}

function lengthNumber(en: string): number {
  return (
    {
      short: 0,
      shoulder: 200,
      chest: 400,
      navel: 600,
      thighs: 700,
      feet: 900,
    }[en] ?? 200
  );
}

const findHairColor = (name?: string) => findMaterialColor("hair", name);
const hairFilter = (colorName?: string) => materialFilter("hair", colorName);

function colorBlend(entry: MaterialColorEntry): string {
  return typeof entry.filter.blend === "string" ? entry.filter.blend : "#ffffff";
}

function colorBrightness(entry: MaterialColorEntry): number {
  return typeof entry.filter.brightness === "number" ? entry.filter.brightness : 0;
}

function gradientStops(proto: HairGradientPrototype, len: string): [number, number] {
  if (proto.lengthOffset !== "minus-half") return proto.stops;
  const offset = lengthNumber(len) / 1000 / 2;
  return [proto.stops[0] - offset, proto.stops[1] - offset];
}

function isGradientPrototype(entry: HairGradientEntry | undefined): entry is HairGradientPrototype {
  return !!entry && "gradient" in entry;
}

function selectGradientPrototype(
  part: "fringe" | "sides",
  style: string,
  hairType: string,
): HairGradientPrototype | undefined {
  const entry = hairGradients?.[part]?.[style];
  if (isGradientPrototype(entry)) return entry;
  return entry?.[hairType] ?? entry?.all;
}

function twoToneHairFilter(
  part: "fringe" | "sides",
  detail: HairColorDetail | undefined,
  len: string,
  hairType: string,
  fallbackColor?: string,
): ColorFilter | undefined {
  const style = detail?.分色模式 ? hairColorStyles[detail.分色模式]?.en : undefined;
  const primary = findHairColor(detail?.发色);
  const secondary = findHairColor(detail?.第二发色);
  const proto = style ? selectGradientPrototype(part, style, hairType) : undefined;
  if (!style || !primary || !secondary || !proto) return hairFilter(fallbackColor);

  const stops = gradientStops(proto, len);
  return {
    desaturate: true,
    blendMode: "hard-light",
    blend: {
      gradient: proto.gradient,
      values: proto.values,
      colors: [
        [stops[0], colorBlend(primary)],
        [stops[1], colorBlend(secondary)],
      ],
    },
    brightness: {
      gradient: proto.gradient,
      values: proto.values,
      adjustments: [
        [stops[0], colorBrightness(primary)],
        [stops[1], colorBrightness(secondary)],
      ],
    },
  };
}

function hairFilters(
  payload: ResolvedState["payload"],
  len: string,
  styleName: string,
  fringeName: string | undefined,
): { hair: ColorFilter | undefined; fringe: ColorFilter | undefined } {
  const mode = payload.发色模式 ?? "单色";
  if (mode === "单色") {
    const filter = hairFilter(payload.发色);
    return { hair: filter, fringe: filter };
  }

  const hairDetail = payload.发色详情?.头发;
  if (mode === "整体") {
    const filter = twoToneHairFilter("sides", hairDetail, len, styleName, payload.发色);
    return {
      hair: filter,
      fringe: twoToneHairFilter("fringe", hairDetail, len, fringeName ?? "all", payload.发色),
    };
  }

  return {
    hair: twoToneHairFilter("sides", hairDetail, len, styleName, payload.发色),
    fringe: twoToneHairFilter(
      "fringe",
      payload.发色详情?.刘海 ?? hairDetail,
      len,
      fringeName ?? "all",
      payload.发色,
    ),
  };
}

function findStyle(cnName?: string): HairStyle | undefined {
  if (!cnName) return hairStyles.find((s) => s.name === "default");
  return (
    hairStyles.find((s) => s.cnName === cnName || s.name === cnName) ??
    hairStyles.find((s) => s.name === "default")
  );
}

function findFringe(cnName?: string): FringeStyle | undefined {
  if (!cnName) return undefined;
  return fringeStyles.find((s) => s.cnName === cnName || s.name === cnName);
}

export function buildHairLayers(state: ResolvedState): LayerSpec[] {
  const { payload, baseUrl } = state;
  const p = payload;
  const layers: LayerSpec[] = [];
  const b = baseUrl;

  const hairPayload = typeof p.发型 === "object" ? p.发型 : undefined;
  const styleName = hairPayload?.发型 ?? (typeof p.发型 === "string" ? p.发型 : undefined);
  const style = findStyle(styleName);
  if (!style) return layers;

  const len = lengthEn(hairPayload?.长度 ?? p.发长);
  const fringe = findFringe(hairPayload?.刘海 ?? p.刘海);
  const filters = hairFilters(p, len, style.name, fringe?.name);
  const sidesZ = (hairPayload?.位置 ?? p.头发位置) === "前" ? Z.HAIR_FORWARD : Z.BACK_HAIR;

  // ── Back hair ──────────────────────────────────────────────────────────────
  if (style.backLengths.includes(len)) {
    layers.push({
      id: "hair-back",
      src: `${b}hair/back/${style.name}/${len}.png`,
      z: Z.BACK_HAIR,
      filter: filters.hair,
      animation: BREATH,
      maskSrcs: state.masksFor("head"),
    });
  }

  // ── Side hair ─────────────────────────────────────────────────────────────
  if (style.sideFiles.includes(len)) {
    layers.push({
      id: "hair-sides",
      src: `${b}hair/sides/${style.name}/${len}.png`,
      z: sidesZ,
      filter: filters.hair,
      animation: BREATH,
      maskSrcs: state.masksFor("head"),
    });
  }

  // ── Fringe ────────────────────────────────────────────────────────────────
  if (fringe) {
    const fringeLen = len;
    if (fringe.files.includes(fringeLen)) {
      const fringeMask =
        fringe.name === "fro" ? [`${b}hair/fringe/fro/mask.png`] : state.masksFor("head");
      layers.push({
        id: "hair-fringe",
        src: `${b}hair/fringe/${fringe.name}/${fringeLen}.png`,
        z: Z.FRONT_HAIR,
        filter: filters.fringe,
        animation: BREATH,
        maskSrcs: fringeMask,
      });
    }
  }

  return layers;
}
