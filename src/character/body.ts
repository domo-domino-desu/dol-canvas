import type { LayerSpec } from "@/types";
import type { ResolvedState } from "@/character/state";
import { Z } from "@/data/zindex";
import { i18nData } from "@/data/generated";
import { materialFilter } from "@/character/material";

type I18nEntry = { en: string };
const bodyShapes = (i18nData as typeof i18nData).bodyShapes as Record<string, I18nEntry>;
const BREATH = "playerBreath";

const cumSprites = {
  胸部: ["", "1", "2", "3", "4", "4"],
  脸: ["", "1", "1", "2", "2", "3"],
  脚: ["", "", "1", "1", "2", "2"],
  左臂: ["", "1", "1", "1", "2", "2"],
  右臂: ["", "1", "1", "1", "2", "2"],
  颈部: ["", "1", "1", "2", "2", "3"],
  大腿: ["", "1", "2", "3", "4", "5"],
  腹部: ["", "1", "2", "3", "4", "5"],
} as const;

const dripSprites = ["", "start", "very-slow", "slow", "fast", "very-fast"] as const;

export function resolveBodyShape(cn?: string): string {
  return bodyShapes[cn ?? "经典"]?.en ?? "classic";
}

function clampInt(value: number | undefined, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(value ?? 0)));
}

function addCumLayers(layers: LayerSpec[], state: ResolvedState): void {
  const { payload, baseUrl } = state;
  const cum = payload.精液;
  if (!cum) return;

  const simple = [
    ["胸部", "chest", Z.TEARS],
    ["脸", "face", Z.TEARS],
    ["脚", "feet", Z.TEARS],
    ["颈部", "neck", Z.TEARS],
    ["大腿", "thighs", Z.TEARS],
    ["腹部", "tummy", Z.TEARS],
  ] as const;

  for (const [cn, file, z] of simple) {
    const sprite = cumSprites[cn][clampInt(cum[cn], 0, 5)];
    if (sprite)
      layers.push({
        id: `cum-${file}`,
        src: `${baseUrl}body/cum/${file}-${sprite}.png`,
        z,
        animation: BREATH,
      });
  }

  const left = cumSprites.左臂[clampInt(cum.左臂, 0, 5)];
  if (left && state.leftArm !== "cover") {
    layers.push({
      id: "cum-left-arm",
      src: `${baseUrl}body/cum/left-arm-${left}.png`,
      z: Z.ARMS_IDLE_CUM,
      animation: BREATH,
    });
  }
  const right = cumSprites.右臂[clampInt(cum.右臂, 0, 5)];
  if (right && state.rightArm !== "cover" && state.rightArm !== "hold") {
    layers.push({
      id: "cum-right-arm",
      src: `${baseUrl}body/cum/right-arm-${right}.png`,
      z: Z.ARMS_IDLE_CUM,
      animation: BREATH,
    });
  }

  const drips = [
    ["阴道滴落", "vaginal", Z.TEARS],
    ["肛门滴落", "anal", Z.TEARS],
    ["口部滴落", "mouth", Z.TEARS],
  ] as const;
  for (const [cn, file, z] of drips) {
    const sprite = dripSprites[clampInt(cum[cn], 0, 5)];
    if (sprite)
      layers.push({
        id: `drip-${file}`,
        src: `${baseUrl}body/cum/${file}-${sprite}.png`,
        z,
        animation: BREATH,
      });
  }
}

export function buildBodyLayers(state: ResolvedState): LayerSpec[] {
  const { payload, baseUrl, bodyShape, breastSize } = state;
  const p = payload;
  const layers: LayerSpec[] = [];
  const b = baseUrl;

  // ── Base body ──────────────────────────────────────────────────────────────
  layers.push({ id: "base", src: `${b}body/base-${bodyShape}.png`, z: Z.BASE, animation: BREATH });
  layers.push({
    id: "base-head",
    src: `${b}body/base-head.png`,
    z: Z.BASE_HEAD,
    animation: BREATH,
  });

  // ── Left arm ──────────────────────────────────────────────────────────────
  const leftArm = state.leftArm;
  layers.push({
    id: "left-arm",
    src:
      leftArm === "cover"
        ? `${b}body/left-arm-cover.png`
        : `${b}body/left-arm-idle-${bodyShape}.png`,
    z: leftArm === "cover" ? Z.ARMS_COVER : Z.ARMS_IDLE,
    animation: BREATH,
  });

  // ── Right arm ─────────────────────────────────────────────────────────────
  const rightArm = state.rightArm;
  layers.push({
    id: "right-arm",
    src:
      rightArm === "cover"
        ? `${b}body/right-arm-cover.png`
        : rightArm === "hold"
          ? `${b}body/right-arm-hold.png`
          : `${b}body/right-arm-idle-${bodyShape}.png`,
    z: rightArm === "idle" ? Z.ARMS_IDLE : Z.RIGHT_COVER_ARM,
    animation: BREATH,
  });

  // ── Breasts ────────────────────────────────────────────────────────────────
  if (breastSize > 0) {
    layers.push({
      id: "breasts",
      src: `${b}body/breasts/breasts-${breastSize}.png`,
      z: Z.BREASTS,
      animation: BREATH,
    });
  }

  // ── Pregnant belly ────────────────────────────────────────────────────────
  const belly = state.belly;
  if (belly >= 1 && belly <= 24) {
    layers.push({
      id: "pregnant-belly",
      src: `${b}body/pregnant-belly/${belly}.png`,
      z: Z.BELLY_BASE,
      animation: BREATH,
    });
  }

  // ── Penis ─────────────────────────────────────────────────────────────────
  if (p.阴茎) {
    const pState = p.阴茎状态 ?? "soft";
    const pSize = p.阴茎大小 ?? 2;
    const hasBalls = p.睾丸 !== false;
    layers.push({
      id: "penis",
      src: hasBalls
        ? `${b}body/penis/${pState}-${pSize}.png`
        : `${b}body/penis-no-balls/${pState}-${pSize}.png`,
      z: Z.GENITALS,
      animation: BREATH,
    });
    if (p.避孕套?.类型 === "plain") {
      layers.push({
        id: "penis-condom",
        src: `${b}body/penis/condom-${pState}-${pSize}.png`,
        z: Z.UNDER_PARASITE,
        alpha: 0.4,
        filter: materialFilter("cloth", p.避孕套.颜色),
        animation: BREATH,
      });
    }
  }

  addCumLayers(layers, state);

  return layers;
}
