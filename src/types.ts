// ── Color filter ────────────────────────────────────────────────────────────

export interface ColorFilter {
  desaturate?: boolean;
  blend?: string; // hex color, e.g. "#f53d43"
  blendMode?: string; // canvas composite op, default "hard-light"
  brightness?: number; // -1..1  (negative = darker, positive = lighter)
}

// ── Layer spec ───────────────────────────────────────────────────────────────

export interface LayerSpec {
  id: string;
  src: string;
  z: number;
  filter?: ColorFilter;
  alpha?: number; // 0..1, default 1
  show?: boolean; // if false, skip; default true
  animation?: "blink" | "playerBreath" | string;
  frame?: number; // current horizontal sprite-sheet frame, default 0
  frameCount?: number; // optional override; otherwise inferred from image width/height
  sourceClip?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// ── Character payload (Chinese API) ─────────────────────────────────────────

// CN names from i18n.json bodyShapes
export type BodyShape = "经典" | "瘦长" | "曲线" | "柔软";
export type ArmState = "idle" | "cover";
export type RightArmState = "idle" | "cover" | "hold";
// CN names from i18n.json hairLengths
export type HairLength = "短" | "及肩" | "到胸" | "到腹" | "到腰" | "到大腿" | "到脚";
export type ClothingState = "full" | "torn" | "tattered" | "frayed";
export type ClothingDurability = ClothingState | "完整" | "撕裂" | "破旧" | "磨损";

export interface HairPayload {
  发型?: string;
  刘海?: string;
  长度?: HairLength;
  刘海长度?: HairLength;
}

export interface EyePayload {
  瞳色?: string;
  左眼瞳色?: string;
  右眼瞳色?: string;
  无神?: boolean;
  半睁眼?: boolean;
  血丝眼?: boolean;
  流泪程度?: number;
}

export interface ClothingWorn {
  名称: string;
  颜色?: string; // CN color name from colors.json clothes section
  第二颜色?: string;
  主色调?: string;
  第二色调?: string;
  状态?: ClothingState; // default "full"
  耐久度?: ClothingDurability;
  胸部层级?: number; // breast_img numeric layer (0-6), for upper slots
}

export type ClothingSlotPayload = ClothingWorn | null | undefined;

export interface TransformDetail {
  翅膀?: string; // wing variant, e.g. "default" | "classic" | "cherub"
  光环?: string; // halo variant, e.g. "default" | "celestial" | "traditional"
  耳朵?: string; // ear variant (for cat/wolf/fox/cow)
  尾巴?: string; // tail variant (for cat/wolf/fox/cow)
  角?: string; // horn variant (for demon/cow)
  羽毛?: string;
  眼睛?: string;
  脸颊?: string;
}

export interface CharacterPayload {
  // ── 身体 ──────────────────────────────────────────────────────────────────
  身形?: BodyShape; // 经典/瘦长/曲线/柔软 (classic/slender/curvy/soft), default "经典"
  胸部?: number; // breast size 0-6, default 3
  阴茎?: boolean; // has penis
  阴茎状态?: "soft" | "hard"; // default "soft"
  阴茎大小?: number; // 0-6, default 2
  睾丸?: boolean; // has balls (default true if 阴茎)
  孕肚?: number; // belly level 0-24 (0 = none)
  左臂?: ArmState; // default "idle"
  右臂?: RightArmState; // default "idle"

  // ── 发型 ──────────────────────────────────────────────────────────────────
  发型?: string | HairPayload; // CN name or grouped hair payload
  发色?: string; // CN name from colors.json hair
  发长?: HairLength; // default "肩"
  刘海?: string; // CN name from hair.json fringeStyles
  刘海长度?: HairLength; // default same as 发长

  // ── 面容 ──────────────────────────────────────────────────────────────────
  仪态?: string; // CN name: 温柔/高冷/妩媚/甜美/勾人/忧郁
  瞳色?: string; // CN eye color
  眼睛?: EyePayload;
  眉毛?: "低" | "中" | "高" | "高潮"; // brow position, default "中"
  嘴部?: "平静" | "微笑" | "皱眉" | "哭泣" | "咀嚼"; // mouth variant
  脸红?: number; // 0=none, 1-5
  脸红程度?: number;
  泪水?: number; // 0=none, 1-4

  // ── 衣物 ──────────────────────────────────────────────────────────────────
  衣物?: {
    上装?: ClothingSlotPayload;
    下装?: ClothingSlotPayload;
    内衣上装?: ClothingSlotPayload;
    内衣下装?: ClothingSlotPayload;
    头饰?: ClothingSlotPayload;
    面饰?: ClothingSlotPayload;
    颈部?: ClothingSlotPayload;
    手饰?: ClothingSlotPayload;
    手持物品?: ClothingSlotPayload;
    鞋子?: ClothingSlotPayload;
    腿饰?: ClothingSlotPayload;
    私部装备?: ClothingSlotPayload;
  };

  // ── 转化 ──────────────────────────────────────────────────────────────────
  转化?:
    | string
    | {
        类型?: string;
        细节?: TransformDetail;
      }; // CN name or grouped transform payload
  转化细节?: TransformDetail;
}

// ── Build context (internal) ─────────────────────────────────────────────────

export interface BuildContext {
  payload: CharacterPayload;
  baseUrl: string;
  bodyShape: string; // English: classic/slender/curvy/soft
  breastSize: number;
}
