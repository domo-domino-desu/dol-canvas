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

const SIMPLE_PARTS: Record<string, { z: number }> = {
  halo: { z: Z.OVER_HEAD_BACK },
  ears: { z: Z.BASE_HEAD },
  horns: { z: Z.HORNS },
  eyes: { z: Z.IRIS_ACC },
  cheeks: { z: Z.LOWER },
};

type TransformDetailHints = {
  翅膀?: string;
  光环?: string;
  耳朵?: string;
  尾巴?: string;
  角?: string;
  眼睛?: string;
  脸颊?: string;
  颊羽?: string;
  覆羽?: string;
  阴毛?: string;
};

function variantBase(variant: string): string {
  return variant.replace(/-(back|front)$/, "").replace(/-(left|right)(?=-|$)/, "");
}

function hasDirectionalVariants(variants: string[]): boolean {
  return variants.some((variant) => /-(left|right)(?:-|$)/.test(variant));
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
  const canonicalPart = partKey.startsWith("wings-")
    ? "wings-idle"
    : partKey.startsWith("tail-")
      ? "tail-idle"
      : partKey;
  if (rule?.fixed?.parts.includes(canonicalPart)) return rule.fixed.filter;
  if (rule?.inheritHair?.includes(canonicalPart)) {
    return materialFilter("hair", primaryHairColor(payload));
  }

  return undefined;
}

// Resolve which variant to use for a part given user detail preferences
function resolveVariant(
  dirKey: string,
  available: string[],
  detail: TransformDetailHints,
  labels: Record<string, string> | undefined,
): string {
  if (!available.length) return "default";

  const normalized = available.map((variant) => ({
    variant,
    base: variantBase(variant),
    label: labels?.[variant] ?? labels?.[variantBase(variant)],
  }));

  // Check if user specified a variant for this part type
  const partHint: Record<string, string | undefined> = {
    "wings-idle": detail.翅膀,
    "wings-cover": detail.翅膀,
    "wings-flaunt": detail.翅膀,
    halo: detail.光环,
    ears: detail.耳朵,
    "tail-idle": detail.尾巴,
    "tail-cover": detail.尾巴,
    "tail-flaunt": detail.尾巴,
    horns: detail.角,
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

function variantForBase(available: string[], base: string): string | undefined {
  return (
    available.find((variant) => variantBase(variant) === base) ??
    available.find((variant) => variant === base) ??
    available.find((variant) => variant.startsWith(base))
  );
}

function directionalVariantForBase(
  available: string[],
  base: string,
  side: "left" | "right",
): string | undefined {
  return (
    available.find((variant) => variantBase(variant) === base && variant.includes(`-${side}`)) ??
    available.find((variant) => variant.includes(`-${side}`))
  );
}

function prefixedVariant(
  available: string[],
  prefix: "malar" | "plumage" | "pubes",
  hint: string | undefined,
): string | undefined {
  if (!hint) return undefined;
  const target = hint === "default" ? `${prefix}-default` : hint;
  return (
    available.find((variant) => variant === target) ??
    available.find((variant) => variant === `${prefix}-${target}`) ??
    available.find((variant) => variant.startsWith(`${prefix}-${hint}`))
  );
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

  const detailHints: TransformDetailHints = {
    翅膀: detail.翅膀,
    光环: detail.光环,
    耳朵: detail.耳朵,
    尾巴: detail.尾巴,
    角: detail.角,
    眼睛: detail.眼睛,
    脸颊: detail.脸颊,
    颊羽: detail.颊羽,
    覆羽: detail.覆羽,
    阴毛: detail.阴毛,
  };

  function pushTransformLayer(partKey: string, variant: string, z: number): void {
    layers.push({
      id: `transform-${partKey}-${variant}`,
      src: `${b}transformations/${dirName}/${partKey}/${variant}.png`,
      z,
      filter: filterForPart(dirName, partKey, payload),
      animation: BREATH,
    });
  }

  function pushWings(): void {
    const idleVariants = transform.parts["wings-idle"] ?? [];
    const requestedState = detail.翅膀状态 ?? "idle";
    const requestedPart = `wings-${requestedState}`;
    const statePart = transform.parts[requestedPart] ? requestedPart : "wings-idle";
    const globalState = statePart.replace("wings-", "") as "idle" | "cover" | "flaunt";
    const variants = transform.parts[statePart] ?? idleVariants;
    if (!variants.length && !idleVariants.length) return;

    const base = resolveVariant(
      idleVariants.length ? "wings-idle" : statePart,
      idleVariants.length ? idleVariants : variants,
      detailHints,
      transform.variantLabels?.[idleVariants.length ? "wings-idle" : statePart],
    );
    const layerZ =
      globalState === "cover"
        ? Z.TAIL_PENIS_COVER
        : detail.翅膀层级 === "后"
          ? Z.OVER_HEAD_BACK
          : Z.BACK_HAIR;

    if (globalState !== "idle" && variants.length && !hasDirectionalVariants(variants)) {
      const variant = variantForBase(variants, base);
      if (variant) pushTransformLayer(statePart, variant, layerZ);
      return;
    }

    const leftState = detail.左翅膀状态 ?? (globalState === "cover" ? "cover" : "idle");
    const rightState = detail.右翅膀状态 ?? (globalState === "cover" ? "cover" : "idle");

    if ((leftState === "idle" || rightState === "idle") && idleVariants.length) {
      const idleVariant = variantForBase(idleVariants, base);
      if (idleVariant) {
        pushTransformLayer(
          "wings-idle",
          idleVariant,
          detail.翅膀层级 === "后" ? Z.OVER_HEAD_BACK : Z.BACK_HAIR,
        );
      }
    }

    const coverVariants = transform.parts["wings-cover"] ?? [];
    if (!coverVariants.length) return;
    const coverBase = resolveVariant(
      "wings-cover",
      coverVariants,
      detailHints,
      transform.variantLabels?.["wings-cover"],
    );
    if (leftState === "cover") {
      const variant = directionalVariantForBase(coverVariants, coverBase, "left");
      if (variant) pushTransformLayer("wings-cover", variant, Z.TAIL_PENIS_COVER);
    }
    if (rightState === "cover") {
      const variant = directionalVariantForBase(coverVariants, coverBase, "right");
      if (variant) pushTransformLayer("wings-cover", variant, Z.TAIL_PENIS_COVER);
    }
  }

  function pushTail(): void {
    const tailState = detail.尾巴状态 ?? "idle";
    const partKey = transform.parts[`tail-${tailState}`] ? `tail-${tailState}` : "tail-idle";
    const variants = transform.parts[partKey] ?? [];
    if (!variants.length) return;
    const base = resolveVariant(partKey, variants, detailHints, transform.variantLabels?.[partKey]);
    const variant = variantForBase(variants, base);
    if (!variant) return;
    const z =
      tailState === "cover" || tailState === "flaunt"
        ? Z.TAIL_PENIS_COVER
        : detail.尾巴层级 === "后"
          ? Z.TAIL
          : Z.BACK_LOWER;
    pushTransformLayer(partKey, variant, z);
  }

  pushWings();
  pushTail();

  for (const [partKey, zDef] of Object.entries(SIMPLE_PARTS)) {
    const variants = transform.parts[partKey];
    if (!variants?.length) continue;

    const variant = resolveVariant(
      partKey,
      variants,
      detailHints,
      transform.variantLabels?.[partKey],
    );

    if (partKey === "halo") {
      const back =
        variants.find((v) => v === `${variant}-back`) ?? variants.find((v) => v.endsWith("-back"));
      const front =
        variants.find((v) => v === `${variant}-front`) ??
        variants.find((v) => v.endsWith("-front"));
      if (back) pushTransformLayer("halo", back, Z.OVER_HEAD_BACK);
      if (front) pushTransformLayer("halo", front, Z.OLD_OVER_UPPER);
      continue;
    }

    pushTransformLayer(partKey, variant, zDef.z);
  }

  if (dirName === "bird") {
    const featherVariants = transform.parts.feathers ?? [];
    const featherLayers = [
      ["malar", detail.颊羽, Z.BACK_HAIR],
      ["plumage", detail.覆羽, Z.BLUSH],
      ["pubes", detail.阴毛, Z.HIRSUTE],
    ] as const;
    for (const [prefix, hint, z] of featherLayers) {
      const variant = prefixedVariant(featherVariants, prefix, hint);
      if (variant) pushTransformLayer("feathers", variant, z);
    }
  }

  return layers;
}
