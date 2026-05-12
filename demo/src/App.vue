<template>
  <main class="shell">
    <section class="stage">
      <DolCanvas
        class="portrait"
        :payload="payload"
        :size="256"
        :base-url="imgBase"
        :animate="animate"
        :on-error="handleRenderError"
      />
    </section>

    <aside class="panel">
      <div class="toolbar">
        <label class="toggle">
          <input v-model="animate" type="checkbox" />
          <span>动画</span>
        </label>

        <a
          class="icon-button"
          href="https://github.com/domo-domino-desu/dol-canvas"
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub"
          title="GitHub"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M12 2C6.48 2 2 6.58 2 12.26c0 4.52 2.87 8.36 6.84 9.72.5.1.68-.22.68-.5v-1.9c-2.78.62-3.37-1.22-3.37-1.22-.45-1.2-1.11-1.52-1.11-1.52-.91-.64.07-.63.07-.63 1 .08 1.53 1.06 1.53 1.06.9 1.57 2.36 1.12 2.94.86.09-.67.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.29 9.29 0 0 1 12 6.93c.85 0 1.7.12 2.5.34 1.9-1.33 2.74-1.05 2.74-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.95.68 1.92v2.84c0 .28.18.6.69.5A10.13 10.13 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z"
            />
          </svg>
        </a>
      </div>

      <div class="actions">
        <button type="button" @click="copyPayloadToClipboard">复制到剪贴板</button>
        <button type="button" @click="importPayloadFromClipboard">从剪贴板导入</button>
      </div>

      <details open>
        <summary>资源</summary>
        <div class="section">
          <div class="field">
            <label for="import-source">导入</label>
            <input id="import-source" :value="importSourceLabel" readonly />
          </div>

          <p v-if="clipboardStatus" class="status">{{ clipboardStatus }}</p>

          <div class="field">
            <label for="image-source">图片</label>
            <select id="image-source" v-model="imageSource">
              <option value="local">本地</option>
              <option value="cdn">testingcf.jsdelivr</option>
            </select>
          </div>
        </div>
      </details>

      <details open>
        <summary>身体</summary>
        <div class="section">
          <div class="field">
            <label for="body-shape">身形</label>
            <select id="body-shape" v-model="bodyShape">
              <option v-for="shape in bodyShapes" :key="shape" :value="shape">{{ shape }}</option>
            </select>
          </div>

          <div class="field">
            <label for="breasts">胸部 {{ breasts }}</label>
            <input id="breasts" v-model.number="breasts" type="range" min="0" max="6" />
          </div>

          <div class="field">
            <label for="belly">孕肚 {{ belly }}</label>
            <input id="belly" v-model.number="belly" type="range" min="0" max="24" />
          </div>

          <div class="grid-2">
            <div class="field">
              <label for="left-arm">左臂</label>
              <select id="left-arm" v-model="leftArm">
                <option value="idle">idle</option>
                <option value="cover">cover</option>
              </select>
            </div>

            <div class="field">
              <label for="right-arm">右臂</label>
              <select id="right-arm" v-model="rightArm">
                <option value="idle">idle</option>
                <option value="cover">cover</option>
                <option value="hold">hold</option>
              </select>
            </div>
          </div>

          <label class="toggle">
            <input v-model="hasPenis" type="checkbox" />
            <span>阴茎</span>
          </label>

          <div v-if="hasPenis" class="grid-2">
            <div class="field">
              <label for="penis-state">状态</label>
              <select id="penis-state" v-model="penisState">
                <option value="soft">soft</option>
                <option value="hard">hard</option>
              </select>
            </div>

            <div class="field">
              <label for="penis-size">大小 {{ penisSize }}</label>
              <input id="penis-size" v-model.number="penisSize" type="range" min="0" max="6" />
            </div>

            <label class="toggle">
              <input v-model="hasBalls" type="checkbox" />
              <span>睾丸</span>
            </label>
          </div>
        </div>
      </details>

      <details open>
        <summary>头发</summary>
        <div class="section">
          <div class="field">
            <label for="hair">发型</label>
            <select id="hair" v-model="hairStyle">
              <option v-for="style in hairStyles" :key="style.name" :value="style.cnName">
                {{ style.cnName }}
              </option>
            </select>
          </div>

          <div class="grid-2">
            <div class="field">
              <label for="hair-length">发长</label>
              <select id="hair-length" v-model="hairLength">
                <option v-for="length in hairLengths" :key="length" :value="length">
                  {{ length }}
                </option>
              </select>
            </div>

            <div class="field">
              <label for="hair-color">发色</label>
              <select id="hair-color" v-model="hairColor">
                <option v-for="color in hairColors" :key="color.variable" :value="color.cnName">
                  {{ color.cnName }}
                </option>
              </select>
            </div>
          </div>

          <div class="field">
            <label for="fringe">刘海</label>
            <select id="fringe" v-model="fringeStyle">
              <option value="">无</option>
              <option v-for="style in fringeStyles" :key="style.name" :value="style.cnName">
                {{ style.cnName }}
              </option>
            </select>
          </div>
        </div>
      </details>

      <details open>
        <summary>面容</summary>
        <div class="section">
          <div class="grid-2">
            <div class="field">
              <label for="demeanor">仪态</label>
              <select id="demeanor" v-model="demeanor">
                <option v-for="item in demeanorOptions" :key="item" :value="item">
                  {{ item }}
                </option>
              </select>
            </div>

            <div class="field">
              <label for="left-eye-color">左眼瞳色</label>
              <select id="left-eye-color" v-model="leftEyeColor">
                <option v-for="color in eyeColors" :key="color.variable" :value="color.cnName">
                  {{ color.cnName }}
                </option>
              </select>
            </div>

            <div class="field">
              <label for="right-eye-color">右眼瞳色</label>
              <select id="right-eye-color" v-model="rightEyeColor">
                <option v-for="color in eyeColors" :key="color.variable" :value="color.cnName">
                  {{ color.cnName }}
                </option>
              </select>
            </div>
          </div>

          <div class="grid-2">
            <div class="field">
              <label for="brow">眉毛</label>
              <select id="brow" v-model="brow">
                <option v-for="item in browOptions" :key="item" :value="item">{{ item }}</option>
              </select>
            </div>

            <div class="field">
              <label for="mouth">嘴部</label>
              <select id="mouth" v-model="mouth">
                <option v-for="item in mouthOptions" :key="item" :value="item">{{ item }}</option>
              </select>
            </div>
          </div>

          <div class="grid-2">
            <div class="field">
              <label for="blush">脸红 {{ blush }}</label>
              <input id="blush" v-model.number="blush" type="range" min="0" max="5" />
            </div>

            <div class="field">
              <label for="tears">泪水 {{ tears }}</label>
              <input id="tears" v-model.number="tears" type="range" min="0" max="4" />
            </div>
          </div>

          <div class="grid-3">
            <label class="toggle">
              <input v-model="emptyEyes" type="checkbox" />
              <span>无神</span>
            </label>

            <label class="toggle">
              <input v-model="halfClosedEyes" type="checkbox" />
              <span>半睁眼</span>
            </label>

            <label class="toggle">
              <input v-model="bloodshotEyes" type="checkbox" />
              <span>血丝眼</span>
            </label>
          </div>
        </div>
      </details>

      <details>
        <summary>衣物</summary>
        <div class="section clothes">
          <div v-for="slot in clothingSlots" :key="slot.key" class="slot">
            <div class="field">
              <label :for="`${slot.key}-item`">{{ slot.label }}</label>
              <select :id="`${slot.key}-item`" v-model="clothing[slot.key].name">
                <option value="">无</option>
                <option v-for="item in slot.items" :key="item.name" :value="item.cnName">
                  {{ item.cnName }}
                </option>
              </select>
            </div>

            <template v-if="selectedClothing(slot.key)">
              <div class="grid-2">
                <div class="field">
                  <label :for="`${slot.key}-state`">状态</label>
                  <select :id="`${slot.key}-state`" v-model="clothing[slot.key].state">
                    <option v-for="state in clothingStates(slot.key)" :key="state" :value="state">
                      {{ state }}
                    </option>
                  </select>
                </div>

                <div class="field">
                  <label :for="`${slot.key}-color`">主色调</label>
                  <select :id="`${slot.key}-color`" v-model="clothing[slot.key].color">
                    <option value="">默认</option>
                    <option
                      v-for="color in clothingColorOptions(slot.key)"
                      :key="color.value"
                      :value="color.value"
                    >
                      {{ color.label }}
                    </option>
                  </select>
                </div>
              </div>

              <div v-if="selectedClothing(slot.key)?.hasAcc" class="field">
                <label :for="`${slot.key}-acc-color`">第二色调</label>
                <select :id="`${slot.key}-acc-color`" v-model="clothing[slot.key].secondColor">
                  <option value="">默认</option>
                  <option
                    v-for="color in accessoryColorOptions(slot.key)"
                    :key="color.value"
                    :value="color.value"
                  >
                    {{ color.label }}
                  </option>
                </select>
              </div>
            </template>
          </div>
        </div>
      </details>

      <details>
        <summary>转化</summary>
        <div class="section">
          <div class="field">
            <label for="transform">类型</label>
            <select id="transform" v-model="transformType">
              <option value="">无</option>
              <option v-for="item in transformOptions" :key="item.key" :value="item.cnName">
                {{ item.label }}
              </option>
            </select>
          </div>

          <template v-if="currentTransform">
            <div v-for="part in transformPartControls" :key="part.key" class="field">
              <label :for="`transform-${part.key}`">{{ part.label }}</label>
              <select :id="`transform-${part.key}`" v-model="transformDetails[part.field]">
                <option value="">默认</option>
                <option
                  v-for="variant in part.variants"
                  :key="variant.value"
                  :value="variant.value"
                >
                  {{ variant.label }}
                </option>
              </select>
            </div>
          </template>
        </div>
      </details>

      <p v-if="lastError" class="error">{{ lastError }}</p>
    </aside>
  </main>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import DolCanvas from "./DolCanvasDemo.vue";
import type {
  ArmState,
  BodyShape,
  CharacterPayload,
  ClothingState,
  HairLength,
  RenderError,
  RightArmState,
} from "dol-canvas";
import hairData from "@/data/generated/hair.json";
import colorsData from "@/data/generated/colors.json";
import faceData from "@/data/generated/face.json";
import clothesData from "@/data/generated/clothes.json";
import transformsData from "@/data/generated/transformations.json";
import i18nData from "@/data/generated/i18n.json";

const imgBases = {
  local: __DOL_CANVAS_LOCAL_IMG_BASE__,
  cdn: __DOL_CANVAS_CDN_IMG_BASE__,
} as const;
type ResourceSource = keyof typeof imgBases;

const importSource = __DOL_CANVAS_IMPORT_SOURCE__ as ResourceSource;
const imageSource = ref<ResourceSource>(importSource);
const imgBase = computed(() => imgBases[imageSource.value]);
const importSourceLabel = computed(() => (importSource === "cdn" ? "testingcf.jsdelivr" : "本地"));

type ColorEntry = { variable: string; name: string; cnName: string };
type ClothingItem = {
  name: string;
  cnName: string;
  colorOptions: string[];
  accColorOptions: string[];
  states: ClothingState[];
  hasAcc: boolean;
};
type ClothingSlotKey = keyof typeof clothesData;
type ClothingSelection = {
  name: string;
  color: string;
  secondColor: string;
  state: ClothingState;
};
type TransformDetailField = keyof NonNullable<CharacterPayload["转化细节"]>;

const animate = ref(true);
const lastError = ref("");
const clipboardStatus = ref("");

const bodyShapes = Object.keys(i18nData.bodyShapes) as BodyShape[];
const hairLengths = Object.keys(i18nData.hairLengths) as HairLength[];
const hairStyles = hairData.hairStyles;
const fringeStyles = hairData.fringeStyles;
const hairColors = colorsData.hair as ColorEntry[];
const eyeColors = colorsData.eyes as ColorEntry[];
const clothColors = colorsData.clothes as ColorEntry[];

const bodyShape = ref<BodyShape>("经典");
const breasts = ref(3);
const belly = ref(0);
const leftArm = ref<ArmState>("idle");
const rightArm = ref<RightArmState>("idle");
const hasPenis = ref(false);
const penisState = ref<"soft" | "hard">("soft");
const penisSize = ref(2);
const hasBalls = ref(true);

const hairStyle = ref("自然状态");
const hairColor = ref("红色");
const hairLength = ref<HairLength>("及肩");
const fringeStyle = ref("自然状态");

const demeanorOptions = Object.keys(faceData.demeanorEn);
const browOptions = Object.keys(faceData.browsMap) as Array<NonNullable<CharacterPayload["眉毛"]>>;
const mouthOptions = Object.keys(faceData.mouthMap) as Array<NonNullable<CharacterPayload["嘴部"]>>;
const demeanor = ref("温柔");
const leftEyeColor = ref("紫色");
const rightEyeColor = ref("紫色");
const emptyEyes = ref(false);
const halfClosedEyes = ref(false);
const bloodshotEyes = ref(false);
const brow = ref<NonNullable<CharacterPayload["眉毛"]>>("中");
const mouth = ref<NonNullable<CharacterPayload["嘴部"]>>("微笑");
const blush = ref(1);
const tears = ref(0);

const slotLabels: Record<ClothingSlotKey, keyof NonNullable<CharacterPayload["衣物"]>> = {
  upper: "上装",
  lower: "下装",
  "under-upper": "内衣上装",
  "under-lower": "内衣下装",
  head: "头饰",
  face: "面饰",
  neck: "颈部",
  hands: "手饰",
  handheld: "手持物品",
  feet: "鞋子",
  legs: "腿饰",
  genitals: "私部装备",
};

const clothingSlots = (Object.keys(clothesData) as ClothingSlotKey[]).map((key) => ({
  key,
  label: slotLabels[key],
  items: clothesData[key] as ClothingItem[],
}));

const clothing = reactive(
  Object.fromEntries(
    clothingSlots.map((slot) => [
      slot.key,
      {
        name: "",
        color: "",
        secondColor: "",
        state: "full",
      } satisfies ClothingSelection,
    ]),
  ) as Record<ClothingSlotKey, ClothingSelection>,
);

clothing.upper.name = "连衣太阳裙";
clothing.upper.color = "white";
clothing.lower.name = "连衣太阳裙";
clothing.lower.color = "white";
clothing["under-lower"].name = "普通内裤";
clothing["under-lower"].color = "pale white";
clothing.head.name = "发卡";
clothing.head.color = "white";
clothing.feet.name = "校服鞋";
clothing.legs.name = "女式运动袜";

const transformType = ref("");
const transformDetails = reactive<Record<TransformDetailField, string>>({
  翅膀: "",
  光环: "",
  耳朵: "",
  尾巴: "",
  角: "",
  羽毛: "",
  眼睛: "",
  脸颊: "",
});

const transformOptions = computed(() =>
  Object.entries(transformsData).map(([key, value]) => ({
    key,
    cnName: value.cnName,
    label: value.label ?? value.cnName,
    parts: value.parts,
    partLabels: value.partLabels ?? {},
    variantLabels: value.variantLabels ?? {},
  })),
);

const currentTransform = computed(() =>
  transformOptions.value.find((item) => item.cnName === transformType.value),
);

const partFieldMap: Record<string, { field: TransformDetailField; label: string }> = {
  "wings-idle": { field: "翅膀", label: "翅膀" },
  halo: { field: "光环", label: "光环" },
  ears: { field: "耳朵", label: "耳朵" },
  "tail-idle": { field: "尾巴", label: "尾巴" },
  horns: { field: "角", label: "角" },
  feathers: { field: "羽毛", label: "羽毛" },
  eyes: { field: "眼睛", label: "眼睛" },
  cheeks: { field: "脸颊", label: "脸颊" },
};

const transformPartControls = computed(() => {
  const transform = currentTransform.value;
  if (!transform) return [];

  return Object.entries(transform.parts)
    .filter(([key]) => partFieldMap[key])
    .map(([key, variants]) => {
      const meta = partFieldMap[key]!;
      return {
        key,
        field: meta.field,
        label: transform.partLabels[key] ?? meta.label,
        variants: normalizeTransformVariants(key, variants).map((variant) => ({
          value: variant,
          label: transformVariantLabel(transform.variantLabels[key], variant),
        })),
      };
    });
});

watch(
  transformType,
  () => {
    for (const key of Object.keys(transformDetails) as TransformDetailField[]) {
      transformDetails[key] = "";
    }
  },
  { flush: "sync" },
);

const payloadSlotByKey = Object.fromEntries(
  Object.entries(slotLabels).map(([key, label]) => [label, key]),
) as Record<keyof NonNullable<CharacterPayload["衣物"]>, ClothingSlotKey>;

function selectedClothing(slotKey: ClothingSlotKey): ClothingItem | undefined {
  const selected = clothing[slotKey].name;
  return (clothesData[slotKey] as ClothingItem[]).find((item) => item.cnName === selected);
}

function clothingStates(slotKey: ClothingSlotKey): ClothingState[] {
  return selectedClothing(slotKey)?.states.length ? selectedClothing(slotKey)!.states : ["full"];
}

function colorLabel(value: string): string {
  const found = clothColors.find(
    (color) => color.variable === value || color.name === value || color.cnName === value,
  );
  return found?.cnName ?? value;
}

function clothingColorOptions(slotKey: ClothingSlotKey) {
  return (selectedClothing(slotKey)?.colorOptions ?? []).map((value) => ({
    value,
    label: colorLabel(value),
  }));
}

function accessoryColorOptions(slotKey: ClothingSlotKey) {
  return (selectedClothing(slotKey)?.accColorOptions ?? []).map((value) => ({
    value,
    label: colorLabel(value),
  }));
}

function normalizeTransformVariants(part: string, variants: string[]): string[] {
  if (part !== "halo") return variants;
  return [...new Set(variants.map((v) => v.replace(/-(back|front)$/, "")))];
}

function transformVariantLabel(
  labels: Record<string, string> | undefined,
  variant: string,
): string {
  return (
    labels?.[variant] ?? labels?.[`${variant}-back`] ?? labels?.[`${variant}-front`] ?? variant
  );
}

function clothingPayload() {
  const result: NonNullable<CharacterPayload["衣物"]> = {};

  for (const slot of clothingSlots) {
    const item = selectedClothing(slot.key);
    if (!item) continue;

    result[slot.label] = {
      名称: item.cnName,
      耐久度: clothing[slot.key].state,
      胸部层级: breasts.value,
      ...(clothing[slot.key].color ? { 主色调: clothing[slot.key].color } : {}),
      ...(clothing[slot.key].secondColor ? { 第二色调: clothing[slot.key].secondColor } : {}),
    };
  }

  return result;
}

function clothingStateFromPayload(
  worn: NonNullable<CharacterPayload["衣物"]>[keyof NonNullable<CharacterPayload["衣物"]>],
): ClothingState {
  const durability = worn?.耐久度;
  if (durability === "完整") return "full";
  if (durability === "撕裂") return "torn";
  if (durability === "破旧") return "tattered";
  if (durability === "磨损") return "frayed";
  return worn?.状态 ?? durability ?? "full";
}

function applyPayload(next: CharacterPayload) {
  bodyShape.value = next.身形 ?? bodyShape.value;
  breasts.value = next.胸部 ?? breasts.value;
  belly.value = next.孕肚 ?? belly.value;
  leftArm.value = next.左臂 ?? leftArm.value;
  rightArm.value = next.右臂 ?? rightArm.value;
  hasPenis.value = !!next.阴茎;
  penisState.value = next.阴茎状态 ?? "soft";
  penisSize.value = next.阴茎大小 ?? 2;
  hasBalls.value = next.睾丸 ?? true;

  if (typeof next.发型 === "object") {
    hairStyle.value = next.发型.发型 ?? hairStyle.value;
    hairLength.value = next.发型.长度 ?? hairLength.value;
    fringeStyle.value = next.发型.刘海 ?? "";
  } else if (typeof next.发型 === "string") {
    hairStyle.value = next.发型;
  }
  hairColor.value = next.发色 ?? hairColor.value;
  demeanor.value = next.仪态 ?? demeanor.value;
  leftEyeColor.value = next.眼睛?.左眼瞳色 ?? leftEyeColor.value;
  rightEyeColor.value = next.眼睛?.右眼瞳色 ?? rightEyeColor.value;
  emptyEyes.value = next.眼睛?.无神 ?? false;
  halfClosedEyes.value = next.眼睛?.半睁眼 ?? false;
  bloodshotEyes.value = next.眼睛?.血丝眼 ?? false;
  tears.value = next.眼睛?.流泪程度 ?? next.泪水 ?? 0;
  brow.value = next.眉毛 ?? brow.value;
  mouth.value = next.嘴部 ?? mouth.value;
  blush.value = next.脸红程度 ?? next.脸红 ?? blush.value;

  for (const slot of clothingSlots) {
    clothing[slot.key].name = "";
    clothing[slot.key].color = "";
    clothing[slot.key].secondColor = "";
    clothing[slot.key].state = "full";
  }

  for (const [payloadSlot, worn] of Object.entries(next.衣物 ?? {}) as Array<
    [
      keyof NonNullable<CharacterPayload["衣物"]>,
      NonNullable<CharacterPayload["衣物"]>[keyof NonNullable<CharacterPayload["衣物"]>],
    ]
  >) {
    if (!worn) continue;
    const slotKey = payloadSlotByKey[payloadSlot];
    if (!slotKey) continue;
    clothing[slotKey].name = worn.名称;
    clothing[slotKey].color = worn.主色调 ?? "";
    clothing[slotKey].secondColor = worn.第二色调 ?? "";
    clothing[slotKey].state = clothingStateFromPayload(worn);
  }

  for (const key of Object.keys(transformDetails) as TransformDetailField[]) {
    transformDetails[key] = "";
  }

  if (typeof next.转化 === "object") {
    transformType.value = next.转化.类型 ?? "";
    Object.assign(transformDetails, next.转化.细节 ?? {});
  } else {
    transformType.value = next.转化 ?? "";
    Object.assign(transformDetails, next.转化细节 ?? {});
  }
}

async function copyPayloadToClipboard() {
  try {
    await navigator.clipboard.writeText(JSON.stringify(payload.value, null, 2));
    clipboardStatus.value = "已复制当前 payload";
    lastError.value = "";
  } catch (error) {
    clipboardStatus.value = "";
    lastError.value = error instanceof Error ? error.message : "无法写入剪贴板";
  }
}

async function importPayloadFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    const parsed = JSON.parse(text) as CharacterPayload | { payload?: CharacterPayload };
    const next =
      parsed && typeof parsed === "object" && "payload" in parsed && parsed.payload
        ? parsed.payload
        : (parsed as CharacterPayload);
    applyPayload(next);
    clipboardStatus.value = "已从剪贴板导入";
    lastError.value = "";
  } catch (error) {
    clipboardStatus.value = "";
    lastError.value = error instanceof Error ? error.message : "剪贴板内容不是有效 JSON";
  }
}

const payload = computed<CharacterPayload>(() => ({
  身形: bodyShape.value,
  胸部: breasts.value,
  孕肚: belly.value,
  左臂: leftArm.value,
  右臂: rightArm.value,
  ...(hasPenis.value
    ? {
        阴茎: true,
        阴茎状态: penisState.value,
        阴茎大小: penisSize.value,
        睾丸: hasBalls.value,
      }
    : {}),
  发型: {
    发型: hairStyle.value,
    长度: hairLength.value,
    ...(fringeStyle.value ? { 刘海: fringeStyle.value } : {}),
  },
  发色: hairColor.value,
  仪态: demeanor.value,
  眼睛: {
    左眼瞳色: leftEyeColor.value,
    右眼瞳色: rightEyeColor.value,
    无神: emptyEyes.value,
    半睁眼: halfClosedEyes.value,
    血丝眼: bloodshotEyes.value,
    流泪程度: tears.value,
  },
  眉毛: brow.value,
  嘴部: mouth.value,
  脸红程度: blush.value,
  衣物: clothingPayload(),
  ...(transformType.value
    ? {
        转化: {
          类型: transformType.value,
          细节: Object.fromEntries(
            Object.entries(transformDetails).filter(([, value]) => value),
          ) as CharacterPayload["转化细节"],
        },
      }
    : {}),
}));

function handleRenderError(error: RenderError) {
  lastError.value = error.src;
}
</script>
