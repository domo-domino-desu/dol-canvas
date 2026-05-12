import type { LayerSpec, BuildContext } from "@/types";
import { Z } from "@/data/zindex";
import i18nData from "@/data/generated/i18n.json";

type I18nEntry = { en: string };
const bodyShapes = (i18nData as typeof i18nData).bodyShapes as Record<string, I18nEntry>;
const BREATH = "playerBreath";

export function resolveBodyShape(cn?: string): string {
  return bodyShapes[cn ?? "经典"]?.en ?? "classic";
}

export function buildBodyLayers(ctx: BuildContext): LayerSpec[] {
  const { payload, baseUrl, bodyShape, breastSize } = ctx;
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
  const leftArm = p.左臂 ?? "idle";
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
  const rightArm = p.右臂 ?? "idle";
  layers.push({
    id: "right-arm",
    src:
      rightArm === "cover"
        ? `${b}body/right-arm-cover.png`
        : rightArm === "hold"
          ? `${b}body/right-arm-hold.png`
          : `${b}body/right-arm-idle-${bodyShape}.png`,
    z: rightArm === "idle" ? Z.ARMS_IDLE : Z.ARMS_COVER + 1,
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
  const belly = p.孕肚 ?? 0;
  if (belly >= 1 && belly <= 24) {
    layers.push({
      id: "pregnant-belly",
      src: `${b}body/pregnant-belly/${belly}.png`,
      z: 33,
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
  }

  return layers;
}
