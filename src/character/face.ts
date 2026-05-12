import type { LayerSpec, BuildContext, ColorFilter } from "@/types";
import { Z } from "@/data/zindex";
import { faceData, colorsData } from "@/data/generated";

type ColorEntry = { variable: string; name: string; cnName: string; filter: ColorFilter };

const eyeColors: ColorEntry[] = (colorsData as typeof colorsData).eyes as ColorEntry[];
const hairColors: ColorEntry[] = (colorsData as typeof colorsData).hair as ColorEntry[];
const demeanorEn: Record<string, string> = (faceData as typeof faceData).demeanorEn;
const browsMap: Record<string, string> = (faceData as typeof faceData).browsMap;
const mouthMap: Record<string, string> = (faceData as typeof faceData).mouthMap;

function eyeFilter(cnName?: string): ColorFilter | undefined {
  if (!cnName) return undefined;
  const entry =
    eyeColors.find((e) => e.cnName === cnName) ??
    eyeColors.find((e) => e.variable === cnName) ??
    eyeColors.find((e) => e.name === cnName);
  if (!entry) return undefined;
  return { desaturate: true, ...entry.filter, blendMode: entry.filter.blendMode ?? "hard-light" };
}

function hairFilter(cnName?: string): ColorFilter | undefined {
  if (!cnName) return undefined;
  const entry =
    hairColors.find((e) => e.cnName === cnName) ??
    hairColors.find((e) => e.variable === cnName) ??
    hairColors.find((e) => e.name === cnName);
  if (!entry) return undefined;
  return { desaturate: true, ...entry.filter, blendMode: entry.filter.blendMode ?? "hard-light" };
}

export function buildFaceLayers(ctx: BuildContext): LayerSpec[] {
  const { payload, baseUrl } = ctx;
  const p = payload;
  const layers: LayerSpec[] = [];
  const b = baseUrl;
  const faceDir = `${b}face/default/`;

  const demeanor = demeanorEn[p.仪态 ?? "温柔"] ?? "default";
  const demDir = `${faceDir}${demeanor}/`;

  const eyes = p.眼睛 ?? {};
  const leftEyeColor = eyes.左眼瞳色;
  const rightEyeColor = eyes.右眼瞳色 ?? leftEyeColor;
  const emptyEyes = eyes.无神 ?? false;
  const halfClosed = eyes.半睁眼 ?? false;
  const bloodshot = eyes.血丝眼 ?? false;
  const tears = eyes.流泪程度 ?? p.泪水 ?? 0;
  const irisFilterLeft = emptyEyes ? undefined : eyeFilter(leftEyeColor);
  const irisFilterRight = emptyEyes ? undefined : eyeFilter(rightEyeColor);
  const eyeSuffix = halfClosed ? "-half-closed" : "";
  const irisBase = emptyEyes ? "iris-empty" : "iris";
  const blinkAnimation = halfClosed ? undefined : "blink";

  // ── Eye state (frame 0=open, frame 1=closed/half-closed) ──────────────────
  layers.push({
    id: "eye-sclera",
    src: `${demDir}${bloodshot ? "sclera-bloodshot" : "sclera"}.png`,
    z: Z.SCLERA,
    show: true,
  });
  layers.push({
    id: "eye-iris-left",
    src: `${demDir}${irisBase}${eyeSuffix}.png`,
    z: Z.IRIS,
    show: true,
    filter: irisFilterLeft,
    animation: blinkAnimation,
    sourceClip: { x: 0, y: 0, width: 64, height: 128 },
  });
  layers.push({
    id: "eye-iris-right",
    src: `${demDir}${irisBase}${eyeSuffix}.png`,
    z: Z.IRIS,
    show: true,
    filter: irisFilterRight,
    animation: blinkAnimation,
    sourceClip: { x: 64, y: 0, width: 64, height: 128 },
  });
  layers.push({ id: "eye-eyes", src: `${demDir}eyes.png`, z: Z.EYES, show: true });
  layers.push({
    id: "eye-lashes",
    src: `${demDir}lashes${eyeSuffix}.png`,
    z: Z.LASHES,
    show: true,
    animation: blinkAnimation,
  });
  layers.push({
    id: "eye-eyelids",
    src: `${demDir}eyelids${eyeSuffix}.png`,
    z: Z.EYELIDS,
    show: true,
    animation: blinkAnimation,
  });

  // ── Brow ──────────────────────────────────────────────────────────────────
  const browKey = browsMap[p.眉毛 ?? "中"] ?? "mid";
  layers.push({
    id: "brow",
    src: `${demDir}brow-${browKey}.png`,
    z: Z.BROW,
    filter: hairFilter(p.发色),
  });

  // ── Mouth ─────────────────────────────────────────────────────────────────
  const mouthKey = mouthMap[p.嘴部 ?? "平静"] ?? "neutral";
  layers.push({ id: "mouth", src: `${faceDir}mouth-${mouthKey}.png`, z: Z.MOUTH });

  // ── Blush ─────────────────────────────────────────────────────────────────
  const blush = p.脸红程度 ?? p.脸红 ?? 0;
  if (blush >= 1 && blush <= 5) {
    layers.push({ id: "blush", src: `${faceDir}blush-${blush}.png`, z: Z.BLUSH });
  }

  // ── Tears ─────────────────────────────────────────────────────────────────
  if (tears >= 1 && tears <= 4) {
    layers.push({ id: "tears", src: `${faceDir}tears-${tears}.png`, z: Z.TEARS });
  }

  return layers;
}
