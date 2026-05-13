import type { ColorFilter, LayerSpec } from "@/types";
import { Z } from "@/data/zindex";
import { BREATH, type ClothingItem, type SlotCn } from "@/character/render-catalog";
import type { ResolvedState } from "@/character/state";

export function pushLayer(
  layers: LayerSpec[],
  id: string,
  imgBase: string,
  stem: string | undefined,
  z: number,
  filter?: ColorFilter,
  extra?: Pick<LayerSpec, "maskSrcs" | "dx" | "dy" | "alpha">,
): void {
  if (!stem) return;
  layers.push({ id, src: `${imgBase}${stem}.png`, z, filter, animation: BREATH, ...extra });
}

export function zFor(item: ClothingItem, fallback: number): number {
  if (item.zIndex === "over_head") return Z.OVER_HEAD;
  if (item.zIndex === "head") return Z.HEAD;
  if (item.zIndex === "head_back") return Z.HEAD_BACK;
  if (item.zIndex === "over_head_back") return Z.OVER_HEAD_BACK;
  return fallback;
}

export function sleeveZ(slotCn: SlotCn, side: "left" | "right", state: ResolvedState): number {
  const rightCovering = state.rightArm === "cover" || state.rightArm === "hold";

  if (slotCn === "内衣上装") {
    if (side === "left") return state.leftArm === "cover" ? Z.LEFT_COVER_ARM : Z.UNDER_UPPER_ARMS;
    return rightCovering ? Z.RIGHT_COVER_ARM : Z.UNDER_UPPER_ARMS;
  }
  if (side === "left")
    return state.leftArm === "cover" ? Z.LEFT_COVER_ARM_OVER_UPPER : Z.UPPER_ARMS;
  return rightCovering ? Z.RIGHT_COVER_ARM_OVER_UPPER : Z.UPPER_ARMS;
}
