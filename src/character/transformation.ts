import type { LayerSpec, ColorFilter } from "@/types";
import type { ResolvedState } from "@/character/state";
import { Z } from "@/data/zindex";
import { transformationsData } from "@/data/generated";
import { transformationFilterRules } from "@/character/render-catalog";
import { materialFilter } from "@/character/material";

type TransformEntry = {
  cnName: string;
  parts: Record<string, string[]>;
  variantLabels?: Record<string, Record<string, string>>;
};

const transforms = transformationsData as Record<string, TransformEntry>;
const BREATH = "playerBreath";

// Which parts to show in idle/display state, and their z-indices
// Only render the parts relevant for a non-combat, idle pose
const IDLE_PARTS: Record<string, { z: number }> = {
  "wings-idle": { z: Z.BACK_HAIR },
  halo: { z: Z.OVER_HEAD_BACK },
  ears: { z: Z.BASE_HEAD },
  "tail-idle": { z: Z.BACK_LOWER },
  horns: { z: Z.HORNS },
  feathers: { z: Z.BACK_HAIR },
  eyes: { z: Z.IRIS_ACC },
  cheeks: { z: Z.LOWER },
};

function stripDirectionalSuffix(variant: string): string {
  return variant.replace(/-(back|front|left|right)$/, "");
}

function primaryHairColor(payload: ResolvedState["payload"]): string | undefined {
  return payload.发色详情?.头发?.发色 ?? payload.发色;
}

function filterForPart(
  transformType: string,
  partKey: string,
  payload: ResolvedState["payload"],
): ColorFilter | undefined {
  const rule = transformationFilterRules[transformType];
  if (rule?.fixed?.parts.includes(partKey)) return rule.fixed.filter;
  if (rule?.inheritHair?.includes(partKey)) {
    return materialFilter("hair", primaryHairColor(payload));
  }

  return undefined;
}

// Resolve which variant to use for a part given user detail preferences
function resolveVariant(
  dirKey: string,
  available: string[],
  detail: Record<string, string | undefined>,
  labels: Record<string, string> | undefined,
): string {
  if (!available.length) return "default";

  const normalized = available.map((variant) => ({
    variant,
    base: stripDirectionalSuffix(variant),
    label: labels?.[variant] ?? labels?.[stripDirectionalSuffix(variant)],
  }));

  // Check if user specified a variant for this part type
  const partHint: Record<string, string | undefined> = {
    "wings-idle": detail.翅膀,
    halo: detail.光环,
    ears: detail.耳朵,
    "tail-idle": detail.尾巴,
    horns: detail.角,
    feathers: detail.羽毛,
    eyes: detail.眼睛,
    cheeks: detail.脸颊,
  };
  const hint = partHint[dirKey];

  if (hint) {
    const match =
      normalized.find(
        ({ variant, base, label }) => variant === hint || base === hint || label === hint,
      ) ?? normalized.find(({ variant }) => variant.startsWith(hint));
    if (match) return match.base;
  }

  // Prefer 'default' variant if available
  const def = normalized.find(({ base }) => base === "default");
  return def?.base ?? normalized[0]!.base;
}

// Find a transform entry by CN name
function findTransform(name?: string): [string, TransformEntry] | undefined {
  if (!name) return undefined;
  const entry = Object.entries(transforms).find(([key, v]) => v.cnName === name || key === name);
  return entry;
}

export function buildTransformLayers(state: ResolvedState): LayerSpec[] {
  const { payload, baseUrl } = state;
  if (!payload.转化) return [];

  const transformType = typeof payload.转化 === "object" ? payload.转化.类型 : payload.转化;
  const found = findTransform(transformType);
  if (!found) return [];

  const [dirName, transform] = found;
  const detail =
    typeof payload.转化 === "object"
      ? (payload.转化.细节 ?? payload.转化细节 ?? {})
      : (payload.转化细节 ?? {});
  const layers: LayerSpec[] = [];
  const b = baseUrl;

  for (const [partKey, variants] of Object.entries(transform.parts)) {
    const zDef = IDLE_PARTS[partKey];
    if (!zDef) continue; // skip non-idle parts (cover, flaunt, etc.)

    const variant = resolveVariant(
      partKey,
      variants,
      {
        翅膀: detail.翅膀,
        光环: detail.光环,
        耳朵: detail.耳朵,
        尾巴: detail.尾巴,
        角: detail.角,
        羽毛: detail.羽毛,
        眼睛: detail.眼睛,
        脸颊: detail.脸颊,
      },
      transform.variantLabels?.[partKey],
    );
    const filter = filterForPart(dirName, partKey, payload);

    // Halo has back/front variants — add both
    if (partKey === "halo") {
      const back =
        variants.find((v) => v === `${variant}-back`) ?? variants.find((v) => v.endsWith("-back"));
      const front =
        variants.find((v) => v === `${variant}-front`) ??
        variants.find((v) => v.endsWith("-front"));
      if (back) {
        layers.push({
          id: `transform-halo-back`,
          src: `${b}transformations/${dirName}/${partKey}/${back}.png`,
          z: Z.OVER_HEAD_BACK,
          animation: BREATH,
        });
      }
      if (front) {
        layers.push({
          id: `transform-halo-front`,
          src: `${b}transformations/${dirName}/${partKey}/${front}.png`,
          z: Z.OLD_OVER_UPPER,
          animation: BREATH,
        });
      }
      continue;
    }

    layers.push({
      id: `transform-${partKey}`,
      src: `${b}transformations/${dirName}/${partKey}/${variant}.png`,
      z: zDef.z,
      filter,
      animation: BREATH,
    });
  }

  return layers;
}
